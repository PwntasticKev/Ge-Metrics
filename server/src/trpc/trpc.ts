import { initTRPC, TRPCError } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { type Context } from './context.js'
import { AuthUtils } from '../utils/auth.js'
import { db, users, employees } from '../db/index.js'
import { eq } from 'drizzle-orm'

// Context creation
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  return { req, res }
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
export const t = initTRPC.context<Context>().create()

// Base router and procedure
export const router = t.router
export const publicProcedure = t.procedure

// Auth middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  const authHeader = ctx.req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No authorization token provided'
    })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  try {
    console.log('Verifying token:', token)
    const user = AuthUtils.verifyAccessToken(token)
    console.log('Token decoded successfully:', user)
    const parsedUser = {
      ...user,
      userId: parseInt(user.userId, 10)
    }
    return next({
      ctx: {
        ...ctx,
        user: parsedUser
      }
    })
  } catch (error) {
    console.error('Token verification failed:', error)
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token'
    })
  }
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
