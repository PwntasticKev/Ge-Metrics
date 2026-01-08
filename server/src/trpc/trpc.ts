import { initTRPC, TRPCError } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { eq, and, gte } from 'drizzle-orm'
import { db, userSettings, userSessions } from '../db/index.js'
import * as AuthModule from '../utils/auth.js'

// Context creation
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      // Robustly get the auth utilities instance
      const utils =
        (AuthModule as any).authUtils || // prefer the named instance
        (AuthModule as any).default || // fall back to default export
        new (AuthModule as any).AuthUtils() // last resort: instantiate the class

      const decodedUser = utils.verifyAccessToken(token)
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
      return { req, res, user }
    } catch (error) {
      // Ignore invalid token, user will be unauthenticated..
    }
  }
  return { req, res, user: null }
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
export const t = initTRPC.context<Context>().create()

// Base router and procedure
export const router = t.router
export const publicProcedure = t.procedure

// Auth middleware with session activity tracking
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No authorization token provided or token is invalid'
    })
  }

  // Update session activity (throttled to once per 5 minutes per user)
  try {
    const authHeader = ctx.req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract the refresh token from localStorage or request context if available
      // For now, we'll update based on user ID and IP address
      const ipAddress = ctx.req.ip || ctx.req.connection.remoteAddress || 'unknown'
      const userAgent = ctx.req.headers['user-agent'] || 'unknown'
      
      // Only update if last activity was more than 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      
      const existingSessions = await db
        .select({ id: userSessions.id, lastActivity: userSessions.lastActivity })
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, ctx.user.id),
          eq(userSessions.isActive, true)
        ))
        .limit(1)
      
      const existingSession = existingSessions[0]
      
      if (existingSession && existingSession.lastActivity < fiveMinutesAgo) {
        // Update existing session activity
        await db
          .update(userSessions)
          .set({ 
            lastActivity: new Date(),
            ipAddress,
            userAgent
          })
          .where(eq(userSessions.id, existingSession.id))
      } else if (!existingSession) {
        // Create new session if none exists (fallback)
        try {
          await db.insert(userSessions).values({
            userId: ctx.user.id,
            token: `api_session_${Date.now()}`,
            ipAddress,
            userAgent,
            deviceInfo: null,
            lastActivity: new Date(),
            isActive: true
          })
        } catch (error) {
          // Ignore session creation errors to prevent API failures
          console.warn('Failed to create session:', error)
        }
      }
    }
  } catch (error) {
    // Log session update errors but don't fail the API request
    console.warn('Failed to update session activity:', error)
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
