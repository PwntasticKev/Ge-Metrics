import { initTRPC, TRPCError } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { eq, and, gte, sql } from 'drizzle-orm'
import { db, userSettings, userSessions, subscriptions } from '../db/index.js'
import * as AuthModule from '../utils/auth.js'

// Context creation
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  const authHeader = req.headers.authorization
  console.log('[AUTH_DEBUG] Auth header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'No header')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      // Robustly get the auth utilities instance
      const utils =
        (AuthModule as any).authUtils || // prefer the named instance
        (AuthModule as any).default || // fall back to default export
        new (AuthModule as any).AuthUtils() // last resort: instantiate the class

      console.log('[AUTH_DEBUG] About to verify token with utils:', !!utils)
      const decodedUser = utils.verifyAccessToken(token)
      console.log('[AUTH_DEBUG] Token decoded successfully:', { userId: decodedUser.userId, email: decodedUser.email })
      
      // The decoded token has a 'userId' property which is a string.
      // We parse it to an integer and create an 'id' property for consistency in the context.
      const userId = parseInt(decodedUser.userId, 10)
      
      // Get user settings from database
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
      
      const user = {
        ...decodedUser,
        id: userId,
        role: settings?.role || 'user'
      }
      console.log('[AUTH_DEBUG] User context created:', { id: user.id, email: user.email })
      return { req, res, user }
    } catch (error) {
      console.log('[AUTH_DEBUG] Token verification failed:', error.message)
      // Ignore invalid token, user will be unauthenticated..
    }
  }
  console.log('[AUTH_DEBUG] No user authenticated')
  return { req, res, user: null }
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
export const t = initTRPC.context<Context>().create()

// Base router and procedure
export const router = t.router
export const publicProcedure = t.procedure

// Auth middleware with optional session activity tracking
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No authorization token provided or token is invalid'
    })
  }

  // Update session activity to track active users
  try {
    const authHeader = ctx.req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const ipAddress = ctx.req.ip || 
                       (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                       ctx.req.connection.remoteAddress || 
                       'unknown'
      const userAgent = ctx.req.headers['user-agent'] || 'unknown'
      const token = authHeader.substring(7) // Remove 'Bearer ' prefix
      
      // Helper to parse device info
      const parseUserAgent = (ua: string) => {
        const browser = ua.includes('Chrome') ? 'Chrome' : 
                       ua.includes('Firefox') ? 'Firefox' :
                       ua.includes('Safari') ? 'Safari' :
                       ua.includes('Edge') ? 'Edge' : 'Unknown'
        const os = ua.includes('Windows') ? 'Windows' :
                  ua.includes('Macintosh') ? 'macOS' :
                  ua.includes('Linux') ? 'Linux' :
                  ua.includes('Android') ? 'Android' :
                  ua.includes('iPhone') ? 'iOS' : 'Unknown'
        const deviceType = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone') ? 'Mobile' :
                          ua.includes('Tablet') || ua.includes('iPad') ? 'Tablet' : 'Desktop'
        return { browser, os, deviceType, rawUserAgent: ua }
      }
      
      // Only update if last activity was more than 1 minute ago (reduced throttling)
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000)
      
      // Try to find existing session by token
      const existingSessions = await db
        .select({ id: userSessions.id, lastActivity: userSessions.lastActivity })
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, ctx.user.id),
          eq(userSessions.token, token),
          eq(userSessions.isActive, true)
        ))
        .limit(1)
      
      const existingSession = existingSessions[0]
      
      if (existingSession) {
        // Update existing session if it's been more than 1 minute
        if (existingSession.lastActivity < oneMinuteAgo) {
          await db
            .update(userSessions)
            .set({ 
              lastActivity: new Date(),
              ipAddress,
              userAgent,
              deviceInfo: parseUserAgent(userAgent)
            })
            .where(eq(userSessions.id, existingSession.id))
        }
      } else {
        // No session found for this token, create a new one
        // First deactivate any other active sessions for this user
        await db
          .update(userSessions)
          .set({ isActive: false })
          .where(and(
            eq(userSessions.userId, ctx.user.id),
            eq(userSessions.isActive, true)
          ))
        
        // Create new session
        await db
          .insert(userSessions)
          .values({
            userId: ctx.user.id,
            token: token,
            ipAddress,
            userAgent,
            deviceInfo: parseUserAgent(userAgent),
            isActive: true,
            lastActivity: new Date()
          })
      }
    }
  } catch (error) {
    console.error('[SESSION] Failed to track session activity:', error)
    // Don't break API requests on session errors
  }

  return next({
    ctx: {
      ...ctx,
      // Pass the user object from the context, which now has a numeric `id`
      user: ctx.user
    }
  })
})

// Protected procedure
export const protectedProcedure = t.procedure.use(isAuthed)

// Subscription middleware
const isSubscribed = isAuthed.unstable_pipe(async ({ ctx, next }) => {
  // 1. Check if user is admin or moderator (bypass subscription)
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, ctx.user.id)).limit(1)
  const role = settings?.role || 'user'
  if (role === 'admin' || role === 'moderator') {
    return next({ ctx })
  }

  // 2. Check subscription status
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, ctx.user.id)
  })

  const isActive = subscription?.status === 'active'
  // Check if trial is valid (isTrialing AND trialEnd is in the future)
  const isTrialValid = subscription?.status === 'trialing' && 
                       subscription?.isTrialing && 
                       subscription?.trialEnd && 
                       new Date(subscription.trialEnd) > new Date()

  if (isActive || isTrialValid) {
    return next({ ctx })
  }

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Active subscription or trial required.'
  })
})

export const subscribedProcedure = t.procedure.use(isSubscribed)

const isAdmin = isAuthed.unstable_pipe(async ({ ctx, next }) => {
  // Get user settings from database to check admin role
  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, ctx.user.id)).limit(1)

  if (!settings || settings.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      userSettings: settings
    }
  })
})

export const adminProcedure = t.procedure.use(isAdmin)
