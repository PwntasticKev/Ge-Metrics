import { z } from 'zod'
import { eq, sql, and, gte, lte, desc, count, avg, sum, like, or } from 'drizzle-orm'
import {
  db,
  users,
  subscriptions,
  userSettings,
  refreshTokens,
  auditLog,
  apiUsageLogs,
  securityEvents,
  userSessions
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'
import { StripeService } from '../utils/stripe.js'

export const adminUsersRouter = router({
  // Get all users with pagination and filtering
  getAllUsers: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      search: z.string().optional(),
      role: z.string().optional(),
      subscriptionStatus: z.string().optional(),
      sortBy: z.string().default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }))
    .query(async ({ input }) => {
      const { page, limit, search, role, subscriptionStatus, sortBy, sortOrder } = input
      const offset = (page - 1) * limit

      // Build where conditions
      const conditions = []

      if (search) {
        conditions.push(
          or(
            like(users.email, `%${search}%`),
            like(users.name, `%${search}%`),
            like(users.username, `%${search}%`)
          )
        )
      }

      if (role) {
        conditions.push(eq(userSettings.role, role))
      }

      if (subscriptionStatus) {
        conditions.push(eq(subscriptions.status, subscriptionStatus))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get users with their subscription and settings
      const usersQuery = db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          name: users.name,
          avatar: users.avatar,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          // Subscription info
          subscriptionStatus: subscriptions.status,
          subscriptionPlan: subscriptions.plan,
          subscriptionCreatedAt: subscriptions.createdAt,
          subscriptionCurrentPeriodEnd: subscriptions.currentPeriodEnd,
          // User settings
          role: userSettings.role,
          emailNotifications: userSettings.emailNotifications,
          volumeAlerts: userSettings.volumeAlerts,
          otpEnabled: userSettings.otpEnabled,
          otpVerified: userSettings.otpVerified
        })
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .leftJoin(userSettings, eq(users.id, userSettings.userId))

      if (whereClause) {
        usersQuery.where(whereClause)
      }

      // Add sorting
      if (sortBy === 'createdAt') {
        usersQuery.orderBy(sortOrder === 'desc' ? desc(users.createdAt) : users.createdAt)
      } else if (sortBy === 'email') {
        usersQuery.orderBy(sortOrder === 'desc' ? desc(users.email) : users.email)
      } else if (sortBy === 'name') {
        usersQuery.orderBy(sortOrder === 'desc' ? desc(users.name) : users.name)
      }

      const usersResult = await usersQuery.limit(limit).offset(offset)

      // Get total count for pagination
      const totalQuery = db
        .select({ count: count() })
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .leftJoin(userSettings, eq(users.id, userSettings.userId))

      if (whereClause) {
        totalQuery.where(whereClause)
      }

      const [{ count: totalUsers }] = await totalQuery

      return {
        users: usersResult,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          hasNext: page < Math.ceil(totalUsers / limit),
          hasPrev: page > 1
        }
      }
    }),

  // Get user statistics
  getUserStats: adminProcedure
    .query(async () => {
      // Get user counts by role
      const roleStats = await db
        .select({
          role: userSettings.role,
          count: count()
        })
        .from(userSettings)
        .groupBy(userSettings.role)

      // Get user counts by subscription status
      const subscriptionStats = await db
        .select({
          status: subscriptions.status,
          count: count()
        })
        .from(subscriptions)
        .groupBy(subscriptions.status)

      // Get registration stats (last 30 days)
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const [recentRegistrations] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, last30Days))

      // Get email verification stats
      const [verifiedUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.emailVerified, true))

      const [totalUsers] = await db.select({ count: count() }).from(users)

      return {
        roleDistribution: roleStats,
        subscriptionDistribution: subscriptionStats,
        recentRegistrations: recentRegistrations.count,
        emailVerificationRate: Math.round((verifiedUsers.count / totalUsers.count) * 100),
        totalUsers: totalUsers.count
      }
    }),

  // Get detailed user information
  getUserDetails: adminProcedure
    .input(z.object({
      userId: z.number()
    }))
    .query(async ({ input }) => {
      const { userId } = input

      // Get user with all related data
      const [userDetails] = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          name: users.name,
          avatar: users.avatar,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          googleId: users.googleId,
          // Subscription info
          subscriptionId: subscriptions.id,
          subscriptionStatus: subscriptions.status,
          subscriptionPlan: subscriptions.plan,
          subscriptionCreatedAt: subscriptions.createdAt,
          subscriptionCurrentPeriodStart: subscriptions.currentPeriodStart,
          subscriptionCurrentPeriodEnd: subscriptions.currentPeriodEnd,
          subscriptionCancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          stripeCustomerId: subscriptions.stripeCustomerId,
          stripeSubscriptionId: subscriptions.stripeSubscriptionId,
          // Trial info
          trialStart: subscriptions.trialStart,
          trialEnd: subscriptions.trialEnd,
          trialDays: subscriptions.trialDays,
          isTrialing: subscriptions.isTrialing,
          trialExtendedBy: subscriptions.trialExtendedBy,
          // User settings
          settingsId: userSettings.id,
          role: userSettings.role,
          emailNotifications: userSettings.emailNotifications,
          volumeAlerts: userSettings.volumeAlerts,
          priceDropAlerts: userSettings.priceDropAlerts,
          cooldownPeriod: userSettings.cooldownPeriod,
          otpEnabled: userSettings.otpEnabled,
          otpVerified: userSettings.otpVerified,
          permissions: userSettings.permissions,
          settingsCreatedAt: userSettings.createdAt,
          settingsUpdatedAt: userSettings.updatedAt
        })
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .leftJoin(userSettings, eq(users.id, userSettings.userId))
        .where(eq(users.id, userId))

      if (!userDetails) {
        throw new Error('User not found')
      }

      // Get user's active sessions
      const activeSessions = await db
        .select({
          id: userSessions.id,
          ipAddress: userSessions.ipAddress,
          deviceInfo: userSessions.deviceInfo,
          lastActivity: userSessions.lastActivity,
          createdAt: userSessions.createdAt
        })
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        ))
        .orderBy(desc(userSessions.lastActivity))
        .limit(10)

      // Get recent API usage (last 30 days)
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const apiUsage = await db
        .select({
          endpoint: apiUsageLogs.endpoint,
          method: apiUsageLogs.method,
          statusCode: apiUsageLogs.statusCode,
          responseTime: apiUsageLogs.responseTime,
          createdAt: apiUsageLogs.createdAt
        })
        .from(apiUsageLogs)
        .where(and(
          eq(apiUsageLogs.userId, userId),
          gte(apiUsageLogs.createdAt, last30Days)
        ))
        .orderBy(desc(apiUsageLogs.createdAt))
        .limit(50)

      // Get API usage statistics
      const [apiStats] = await db
        .select({
          totalRequests: count(),
          avgResponseTime: avg(apiUsageLogs.responseTime)
        })
        .from(apiUsageLogs)
        .where(and(
          eq(apiUsageLogs.userId, userId),
          gte(apiUsageLogs.createdAt, last30Days)
        ))

      // Get security events
      const securityEvents_ = await db
        .select({
          id: securityEvents.id,
          eventType: securityEvents.eventType,
          severity: securityEvents.severity,
          ipAddress: securityEvents.ipAddress,
          details: securityEvents.details,
          resolved: securityEvents.resolved,
          createdAt: securityEvents.createdAt
        })
        .from(securityEvents)
        .where(and(
          eq(securityEvents.userId, userId),
          gte(securityEvents.createdAt, last30Days)
        ))
        .orderBy(desc(securityEvents.createdAt))
        .limit(20)

      return {
        ...userDetails,
        activeSessions,
        apiUsage,
        apiStats: {
          totalRequests: apiStats?.totalRequests || 0,
          avgResponseTime: Math.round(Number(apiStats?.avgResponseTime) || 0)
        },
        securityEvents: securityEvents_
      }
    }),

  // Update user role and permissions
  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(['user', 'admin', 'moderator']),
      permissions: z.record(z.array(z.string())).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId, role, permissions } = input

      // Update user settings
      const [updatedSettings] = await db
        .update(userSettings)
        .set({
          role,
          permissions: permissions || null,
          updatedAt: new Date()
        })
        .where(eq(userSettings.userId, userId))
        .returning()

      // Log the admin action in audit log
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'update_user_role',
        resource: 'user',
        resourceId: userId.toString(),
        details: {
          previousRole: 'unknown', // We could fetch this first if needed
          newRole: role,
          newPermissions: permissions
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedSettings
    }),

  // Extend user trial (legacy - kept for backward compatibility)
  extendUserTrial: adminProcedure
    .input(z.object({
      userId: z.number(),
      days: z.number().min(1).max(365)
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId, days } = input

      // Get current subscription
      const [currentSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1)

      if (!currentSubscription) {
        throw new Error('User has no subscription')
      }

      // Calculate new end date
      const currentEnd = currentSubscription.currentPeriodEnd || new Date()
      const newEndDate = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000)

      // Update subscription
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          currentPeriodEnd: newEndDate,
          trialEnd: newEndDate,
          status: 'trialing',
          isTrialing: true,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, currentSubscription.id))
        .returning()

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'extend_trial',
        resource: 'subscription',
        resourceId: currentSubscription.id,
        details: {
          userId,
          extendedDays: days,
          previousEndDate: currentEnd.toISOString(),
          newEndDate: newEndDate.toISOString()
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedSubscription
    }),

  // Reset user password (generate OTP)
  resetUserPassword: adminProcedure
    .input(z.object({
      userId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input

      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!user) {
        throw new Error('User not found')
      }

      // Generate a temporary password reset token
      const resetToken = Math.random().toString(36).slice(-8).toUpperCase()

      // Update user with reset token (you'd typically send this via email)
      await db
        .update(users)
        .set({
          passwordResetOtp: resetToken,
          passwordResetOtpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'reset_user_password',
        resource: 'user',
        resourceId: userId.toString(),
        details: {
          userEmail: user.email,
          resetToken // In production, you wouldn't log the actual token
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return {
        success: true,
        resetToken, // In production, this would be sent via email
        message: 'Password reset token generated'
      }
    }),

  // Get user activity summary
  getUserActivity: adminProcedure
    .input(z.object({
      userId: z.number(),
      days: z.number().default(30)
    }))
    .query(async ({ input }) => {
      const { userId, days } = input
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // Get recent audit log entries for this user
      const auditEntries = await db
        .select()
        .from(auditLog)
        .where(and(
          eq(auditLog.userId, userId),
          gte(auditLog.createdAt, startDate)
        ))
        .orderBy(desc(auditLog.createdAt))
        .limit(50)

      // Check if user has active refresh tokens (recent login activity)
      const activeTokens = await db
        .select()
        .from(refreshTokens)
        .where(and(
          eq(refreshTokens.userId, userId),
          gte(refreshTokens.createdAt, startDate)
        ))

      return {
        auditEntries,
        activeTokens: activeTokens.length,
        lastActivity: auditEntries[0]?.createdAt || null
      }
    }),

  // Get user statistics for dashboard
  getDashboardStats: adminProcedure
    .query(async () => {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [totalUsers] = await db.select({ count: count() }).from(users)
      const [activeUsers] = await db.select({ count: count() })
        .from(users)
        .where(eq(users.emailVerified, true))

      const [premiumUsers] = await db.select({ count: count() })
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .where(eq(subscriptions.status, 'active'))

      const [newUsersThisMonth] = await db.select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, thisMonth))

      return {
        totalUsers: totalUsers.count,
        activeUsers: activeUsers.count,
        premiumUsers: premiumUsers.count,
        newUsersThisMonth: newUsersThisMonth.count
      }
    }),

  // Update user
  updateUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().optional(),
      username: z.string().optional(),
      email: z.string().email().optional(),
      role: z.string().optional(),
      subscriptionStatus: z.string().optional(),
      trialEnd: z.string().optional() // ISO date string
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId, subscriptionStatus, trialEnd, role, ...userUpdateData } = input

      // Update user record
      const updatedUser = await db
        .update(users)
        .set({
          ...userUpdateData,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning()

      // Update role in userSettings if provided
      if (role) {
        await db
          .update(userSettings)
          .set({ role })
          .where(eq(userSettings.userId, userId))
      }

      // Update subscription if provided
      if (subscriptionStatus || trialEnd) {
        // Get current subscription
        const [currentSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1)

        if (!currentSubscription) {
          throw new Error('User has no subscription to update')
        }

        const subscriptionUpdates: any = {}
        const stripeUpdates: any = {}

        if (subscriptionStatus) {
          subscriptionUpdates.status = subscriptionStatus
        }

        if (trialEnd) {
          const trialEndDate = new Date(trialEnd)
          subscriptionUpdates.trialEnd = trialEndDate
          subscriptionUpdates.currentPeriodEnd = trialEndDate
          subscriptionUpdates.isTrialing = subscriptionStatus === 'trialing'

          // Prepare Stripe update for trial extension
          if (currentSubscription.stripeSubscriptionId) {
            stripeUpdates.trialEnd = Math.floor(trialEndDate.getTime() / 1000)
          }
        }

        // Update Stripe subscription if exists
        if (currentSubscription.stripeSubscriptionId && Object.keys(stripeUpdates).length > 0) {
          try {
            const updatedStripeSubscription = await StripeService.updateSubscription(
              currentSubscription.stripeSubscriptionId,
              stripeUpdates
            )

            // Sync Stripe data back to database
            const stripeData = StripeService.formatSubscriptionForDB(updatedStripeSubscription)
            Object.assign(subscriptionUpdates, stripeData)
          } catch (stripeError: any) {
            console.error('[ADMIN] Stripe update failed:', stripeError)
            // Log but don't fail the operation - update local DB only
            await db.insert(auditLog).values({
              userId: ctx.user.id,
              action: 'stripe_update_failed',
              resource: 'subscription',
              resourceId: currentSubscription.id,
              details: {
                error: stripeError.message,
                attemptedUpdates: stripeUpdates
              },
              ipAddress: ctx.req.ip,
              userAgent: ctx.req.headers['user-agent']
            })
          }
        }

        // Update local database
        if (Object.keys(subscriptionUpdates).length > 0) {
          await db
            .update(subscriptions)
            .set({
              ...subscriptionUpdates,
              updatedAt: new Date()
            })
            .where(eq(subscriptions.userId, userId))
        }
      }

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'update_user',
        resource: 'user',
        resourceId: userId.toString(),
        details: {
          updatedFields: Object.keys(input).filter(key => (input as any)[key] !== undefined),
          changes: input
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedUser[0]
    }),

  // Delete user
  deleteUser: adminProcedure
    .input(z.object({
      userId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input

      // Get user details before deletion for audit log
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!user) {
        throw new Error('User not found')
      }

      // Delete related records first (cascade delete)
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
      await db.delete(userSettings).where(eq(userSettings.userId, userId))
      await db.delete(subscriptions).where(eq(subscriptions.userId, userId))

      // Finally delete the user
      await db.delete(users).where(eq(users.id, userId))

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'delete_user',
        resource: 'user',
        resourceId: userId.toString(),
        details: {
          deletedUser: {
            email: user.email,
            name: user.name,
            createdAt: user.createdAt
          }
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return { success: true, message: 'User deleted successfully' }
    }),

  // Extend user trial with Stripe integration
  extendUserTrialAdvanced: adminProcedure
    .input(z.object({
      userId: z.number(),
      days: z.number().min(1).max(365)
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId, days } = input

      // Get current subscription
      const [currentSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1)

      if (!currentSubscription) {
        throw new Error('User has no subscription')
      }

      // Calculate new end date
      const currentEnd = currentSubscription.trialEnd || currentSubscription.currentPeriodEnd || new Date()
      const newEndDate = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000)

      // Update Stripe if subscription exists
      if (currentSubscription.stripeSubscriptionId) {
        try {
          await StripeService.extendTrial(currentSubscription.stripeSubscriptionId, newEndDate)
        } catch (stripeError: any) {
          console.error('[ADMIN] Stripe trial extension failed:', stripeError)
          // Log error but continue with local update
          await db.insert(auditLog).values({
            userId: ctx.user.id,
            action: 'stripe_trial_extension_failed',
            resource: 'subscription',
            resourceId: currentSubscription.id,
            details: {
              error: stripeError.message,
              attemptedExtension: days
            },
            ipAddress: ctx.req.ip,
            userAgent: ctx.req.headers['user-agent']
          })
        }
      }

      // Update local subscription
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          trialEnd: newEndDate,
          currentPeriodEnd: newEndDate,
          status: 'trialing',
          isTrialing: true,
          trialExtendedBy: (currentSubscription.trialExtendedBy || 0) + days,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, currentSubscription.id))
        .returning()

      // Log the admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'extend_trial_advanced',
        resource: 'subscription',
        resourceId: currentSubscription.id,
        details: {
          userId,
          extendedDays: days,
          previousEndDate: currentEnd.toISOString(),
          newEndDate: newEndDate.toISOString(),
          stripeUpdated: !!currentSubscription.stripeSubscriptionId
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return updatedSubscription
    }),

  // Create billing portal session for user
  createBillingPortalSession: adminProcedure
    .input(z.object({
      userId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input

      // Get user and subscription
      const [user] = await db
        .select({
          email: users.email,
          stripeCustomerId: subscriptions.stripeCustomerId
        })
        .from(users)
        .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
        .where(eq(users.id, userId))
        .limit(1)

      if (!user) {
        throw new Error('User not found')
      }

      if (!user.stripeCustomerId) {
        throw new Error('User has no Stripe customer ID')
      }

      try {
        const session = await StripeService.createBillingPortalSession(
          user.stripeCustomerId,
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
        )

        // Log the admin action
        await db.insert(auditLog).values({
          userId: ctx.user.id,
          action: 'create_billing_portal_session',
          resource: 'user',
          resourceId: userId.toString(),
          details: {
            stripeCustomerId: user.stripeCustomerId,
            sessionId: session.id
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent']
        })

        return {
          url: session.url,
          sessionId: session.id
        }
      } catch (error: any) {
        throw new Error(`Failed to create billing portal session: ${error.message}`)
      }
    }),

  // Get user's Stripe subscription details
  getUserStripeDetails: adminProcedure
    .input(z.object({
      userId: z.number()
    }))
    .query(async ({ input }) => {
      const { userId } = input

      // Get subscription with Stripe IDs
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1)

      if (!subscription || !subscription.stripeSubscriptionId) {
        return {
          hasStripeSubscription: false,
          subscription: subscription || null
        }
      }

      try {
        // Get fresh data from Stripe
        const stripeSubscription = await StripeService.getSubscription(subscription.stripeSubscriptionId)
        const stripeInvoices = subscription.stripeCustomerId
          ? await StripeService.getCustomerInvoices(subscription.stripeCustomerId, 5)
          : []

        return {
          hasStripeSubscription: true,
          subscription,
          stripeSubscription,
          recentInvoices: stripeInvoices
        }
      } catch (error: any) {
        console.error('[ADMIN] Failed to fetch Stripe details:', error)
        return {
          hasStripeSubscription: true,
          subscription,
          stripeError: error.message
        }
      }
    })
})
