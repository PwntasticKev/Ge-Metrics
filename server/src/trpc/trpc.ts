import { initTRPC, TRPCError } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { eq } from 'drizzle-orm'
import { db, employees } from '../db/index.js'
import { authUtils } from '../utils/auth.js'

// Context creation
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const decodedUser = authUtils.verifyAccessToken(token)
      const user = {
        ...decodedUser,
        userId: parseInt(decodedUser.userId, 10)
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
      user: ctx.user
    }
  })
})

// Protected procedure
export const protectedProcedure = t.procedure.use(isAuthed)

const isAdmin = isAuthed.unstable_pipe(async ({ ctx, next }) => {
  const [employee] = await db.select().from(employees).where(eq(employees.userId, ctx.user.userId)).limit(1)

  if (!employee || employee.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      employee
    }
  })
})

export const adminProcedure = t.procedure.use(isAdmin)
