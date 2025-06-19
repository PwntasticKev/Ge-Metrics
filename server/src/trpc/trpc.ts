import { initTRPC, TRPCError } from '@trpc/server'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { AuthUtils } from '../utils/auth.js'

// Context creation
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  return { req, res }
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create()

// Base router and procedure
export const router = t.router
export const publicProcedure = t.procedure

// Auth middleware
const isAuthenticated = t.middleware(({ ctx, next }) => {
  const authHeader = ctx.req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No authorization token provided'
    })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix

  try {
    const user = AuthUtils.verifyAccessToken(token)
    return next({
      ctx: {
        ...ctx,
        user
      }
    })
  } catch (error) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token'
    })
  }
})

// Protected procedure
export const protectedProcedure = t.procedure.use(isAuthenticated)
