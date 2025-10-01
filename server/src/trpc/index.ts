import { router } from './trpc.js'
import { authRouter } from './auth.js'
import { adminRouter } from './admin.js'
import { itemsRouter } from './items.js'
import { favoritesRouter } from './favorites.js'
import { settingsRouter } from './settings.js'
import { otpRouter } from './otp.js'

export const appRouter = router({
  auth: authRouter,
  favorites: favoritesRouter,
  admin: adminRouter,
  items: itemsRouter,
  settings: settingsRouter,
  otp: otpRouter
})

export type AppRouter = typeof appRouter
