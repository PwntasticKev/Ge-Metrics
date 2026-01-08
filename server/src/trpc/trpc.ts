import { initTRPC, TRPCError } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { eq, and, gte, sql } from 'drizzle-orm'
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

// Auth middleware with optional session activity tracking
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No authorization token provided or token is invalid'
    })
  }

  // Update session activity only if the table exists (graceful degradation)
  try {
    // Check if user_sessions table exists before attempting to use it
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
      ) as exists;
    `)
    
    if (tableExists && tableExists[0]?.exists) {
      const authHeader = ctx.req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const ipAddress = ctx.req.ip || ctx.req.connection.remoteAddress || 'unknown'
        const userAgent = ctx.req.headers['user-agent'] || 'unknown'
        
        // Only update if last activity was more than 5 minutes ago (throttling)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        
        try {
          // Try to find existing active session
          const existingSessions = await db
            .select({ id: userSessions.id, lastActivity: userSessions.lastActivity })
            .from(userSessions)
            .where(and(
              eq(userSessions.userId, ctx.user.id),
              eq(userSessions.isActive, true)
            ))
            .limit(1)
          
          const existingSession = existingSessions[0]
          
          if (existingSession) {
            // Update existing session if it's been more than 5 minutes
            if (existingSession.lastActivity < fiveMinutesAgo) {
              await db
                .update(userSessions)
                .set({ 
                  lastActivity: new Date(),
                  ipAddress,
                  userAgent
                })
                .where(eq(userSessions.id, existingSession.id))
            }
          } else {
            // No active session found, create a new one
            const token = authHeader.substring(7) // Remove 'Bearer ' prefix
            await db
              .insert(userSessions)
              .values({
                userId: ctx.user.id,
                token: token,
                ipAddress,
                userAgent,
                isActive: true,
                lastActivity: new Date(),
                createdAt: new Date()
              })
          }
        } catch (sessionError) {
          // Silently fail session updates - don't break API requests
          // console.warn('Session tracking failed:', sessionError.message)
        }
      }
    }
  } catch (error) {
    // Silently fail session checks - don't break API requests
    // console.warn('Session table check failed:', error.message)
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
