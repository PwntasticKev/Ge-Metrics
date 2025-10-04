import { router } from './trpc.js'
import { authRouter } from './auth.js'
import { adminRouter } from './admin.js'
import { adminDashboardRouter } from './admin-dashboard.js'
import { adminUsersRouter } from './admin-users.js'
import { adminBillingRouter } from './admin-billing.js'
import { adminSecurityRouter } from './admin-security.js'
import { adminCronJobsRouter } from './admin-cronjobs.js'
import { adminInvitationsRouter } from './admin-invitations.js'
import { adminSessionsRouter } from './admin-sessions.js'
import { itemsRouter } from './items.js'
import { favoritesRouter } from './favorites.js'
import { settingsRouter } from './settings.js'
import { otpRouter } from './otp.js'
import billingRouter from './billing'

export const appRouter = router({
  auth: authRouter,
  favorites: favoritesRouter,
  admin: adminRouter,
  adminDashboard: adminDashboardRouter,
  adminUsers: adminUsersRouter,
  adminBilling: adminBillingRouter,
  adminSecurity: adminSecurityRouter,
  adminCronJobs: adminCronJobsRouter,
  adminInvitations: adminInvitationsRouter,
  adminSessions: adminSessionsRouter,
  items: itemsRouter,
  settings: settingsRouter,
  otp: otpRouter,
  billing: billingRouter
})

export type AppRouter = typeof appRouter
