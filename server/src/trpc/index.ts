import { router } from './trpc.js'
import { authRouter } from './auth.js'
import { adminRouter } from './admin.js'
import { itemsRouter } from './items.js'
import { favoritesRouter } from './favorites.js'

export const appRouter = router({
  auth: authRouter,
  admin: adminRouter,
  items: itemsRouter,
  favorites: favoritesRouter
})

export type AppRouter = typeof appRouter
