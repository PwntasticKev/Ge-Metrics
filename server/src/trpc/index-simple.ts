import { router } from './trpc.js'
import { authRouter } from './auth-database.js'

export const appRouter = router({
  auth: authRouter
})

export type AppRouter = typeof appRouter;
