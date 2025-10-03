import { initTRPC, TRPCError } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { eq } from 'drizzle-orm'
import { db, userSettings } from '../db/index.js'
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

// Auth middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No authorization token provided or token is invalid'
    })
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
