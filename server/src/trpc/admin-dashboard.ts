import { z } from 'zod'
import { eq, sql, and, gte, lte, desc, count, avg, sum } from 'drizzle-orm'
import { 
  db, 
  users, 
  subscriptions,
  userSettings,
  auditLog
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'

export const adminDashboardRouter = router({
  // Get comprehensive dashboard overview
  getDashboardOverview: adminProcedure
    .query(async () => {
      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get user stats
      const [totalUsers] = await db.select({ count: count() }).from(users)
      const [newUsersToday] = await db.select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, last24Hours))
      const [newUsersWeek] = await db.select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, last7Days))

      // Get subscription stats
      const [totalSubscriptions] = await db.select({ count: count() }).from(subscriptions)
      const [activeSubscriptions] = await db.select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active'))
      const [trialSubscriptions] = await db.select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'trialing'))
      const [canceledSubscriptions] = await db.select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'canceled'))

      // Get recent audit log entries
      const recentAuditLogs = await db.select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(10)

      // Mock API stats for now (we'll implement proper tracking later)
      const mockApiStats = {
        totalCalls: 1250,
        callsToday: 145,
        callsThisWeek: 892,
        avgResponseTime: 85
      }

      // Mock security stats
      const mockSecurityStats = {
        eventsToday: 2,
        criticalEventsThisWeek: 0
      }

      // Mock system health
      const mockSystemHealth = [
        { type: 'api_response_time', value: 85, unit: 'ms', trend: [80, 82, 79, 85, 83, 85] },
        { type: 'memory_usage', value: 65, unit: '%', trend: [60, 62, 63, 65, 64, 65] },
        { type: 'active_connections', value: 23, unit: 'count', trend: [20, 22, 21, 23, 24, 23] }
      ]

      return {
        users: {
          total: totalUsers.count,
          newToday: newUsersToday.count,
          newThisWeek: newUsersWeek.count
        },
        subscriptions: {
          total: totalSubscriptions.count,
          active: activeSubscriptions.count,
          trialing: trialSubscriptions.count,
          canceled: canceledSubscriptions.count
        },
        api: mockApiStats,
        security: mockSecurityStats,
        admin: {
          actionsToday: 5
        },
        recentAuditLogs,
        systemHealth: mockSystemHealth
      }
    }),

  // Get detailed user analytics
  getUserAnalytics: adminProcedure
    .input(z.object({
      days: z.number().default(30)
    }))
    .query(async ({ input }) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      // Get user registration trend
      const userRegistrations = await db.select({
        date: sql<string>`DATE(${users.createdAt})`,
        count: count()
      })
        .from(users)
        .where(gte(users.createdAt, startDate))
        .groupBy(sql`DATE(${users.createdAt})`)
        .orderBy(sql`DATE(${users.createdAt})`)

      // Get user role distribution
      const roleDistribution = await db.select({
        role: userSettings.role,
        count: count()
      })
        .from(userSettings)
        .groupBy(userSettings.role)

      return {
        registrationTrend: userRegistrations,
        roleDistribution
      }
    }),

  // Get subscription analytics
  getSubscriptionAnalytics: adminProcedure
    .input(z.object({
      days: z.number().default(30)
    }))
    .query(async ({ input }) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      // Get subscription creation trend
      const subscriptionTrend = await db.select({
        date: sql<string>`DATE(${subscriptions.createdAt})`,
        count: count()
      })
        .from(subscriptions)
        .where(gte(subscriptions.createdAt, startDate))
        .groupBy(sql`DATE(${subscriptions.createdAt})`)
        .orderBy(sql`DATE(${subscriptions.createdAt})`)

      // Get subscription status distribution
      const statusDistribution = await db.select({
        status: subscriptions.status,
        count: count()
      })
        .from(subscriptions)
        .groupBy(subscriptions.status)

      // Get plan distribution
      const planDistribution = await db.select({
        plan: subscriptions.plan,
        count: count()
      })
        .from(subscriptions)
        .groupBy(subscriptions.plan)

      return {
        subscriptionTrend,
        statusDistribution,
        planDistribution
      }
    }),

  // Get recent activities for dashboard feed
  getRecentActivities: adminProcedure
    .input(z.object({
      limit: z.number().default(20)
    }))
    .query(async ({ input }) => {
      // Get recent user registrations
      const recentUsers = await db.select({
        type: sql<string>`'user_registration'`,
        id: users.id,
        description: sql<string>`CONCAT('New user registered: ', ${users.email})`,
        createdAt: users.createdAt
      })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)

      return recentUsers
    }),

  // Get system health status (mock for now)
  getSystemHealth: adminProcedure
    .query(async () => {
      // Mock system health data
      const mockMetrics = [
        { type: 'api_response_time', value: 85, unit: 'ms', trend: [80, 82, 79, 85, 83, 85] },
        { type: 'memory_usage', value: 65, unit: '%', trend: [60, 62, 63, 65, 64, 65] },
        { type: 'active_connections', value: 23, unit: 'count', trend: [20, 22, 21, 23, 24, 23] }
      ]

      return {
        metrics: mockMetrics,
        cronJobHealth: {
          failedJobsLast12Hours: 0
        }
      }
    }),

  // Mock API analytics for now
  getApiAnalytics: adminProcedure
    .input(z.object({
      days: z.number().default(7)
    }))
    .query(async ({ input }) => {
      // Generate mock data for the last 7 days
      const mockDailyApiCalls = []
      for (let i = input.days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        mockDailyApiCalls.push({
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 200) + 50,
          avgResponseTime: Math.floor(Math.random() * 100) + 50
        })
      }

      const mockTopEndpoints = [
        { endpoint: '/trpc/auth.me', count: 450, avgResponseTime: 45 },
        { endpoint: '/trpc/items.getAllItems', count: 320, avgResponseTime: 120 },
        { endpoint: '/trpc/billing.getSubscription', count: 180, avgResponseTime: 85 },
        { endpoint: '/trpc/favorites.getUserFavorites', count: 95, avgResponseTime: 65 },
        { endpoint: '/trpc/settings.getUserSettings', count: 75, avgResponseTime: 40 }
      ]

      return {
        dailyApiCalls: mockDailyApiCalls,
        topEndpoints: mockTopEndpoints,
        statusCodes: [
          { statusCode: 200, count: 1250 },
          { statusCode: 404, count: 25 },
          { statusCode: 500, count: 8 }
        ],
        topUsers: []
      }
    })
})