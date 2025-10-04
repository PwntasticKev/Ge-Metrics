import { z } from 'zod'
import { eq, sql, and, gte, lte, desc, count, avg, sum, or, like } from 'drizzle-orm'
import { 
  db, 
  users, 
  auditLog,
  userSettings
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'

export const adminSecurityRouter = router({
  // Get security overview
  getSecurityOverview: adminProcedure
    .query(async () => {
      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Get audit log stats
      const [totalAuditEntries] = await db.select({ count: count() }).from(auditLog)
      const [auditEntriesToday] = await db.select({ count: count() })
        .from(auditLog)
        .where(gte(auditLog.createdAt, last24Hours))
      const [auditEntriesWeek] = await db.select({ count: count() })
        .from(auditLog)
        .where(gte(auditLog.createdAt, last7Days))

      // Get action type distribution
      const actionDistribution = await db.select({
        action: auditLog.action,
        count: count()
      })
        .from(auditLog)
        .where(gte(auditLog.createdAt, last30Days))
        .groupBy(auditLog.action)
        .orderBy(desc(count()))
        .limit(10)

      // Get recent critical events (mock for now - would be from security_events table)
      const mockSecurityEvents = [
        {
          id: '1',
          eventType: 'multiple_failed_logins',
          severity: 'high',
          description: 'Multiple failed login attempts detected',
          ipAddress: '192.168.1.100',
          count: 5,
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          resolved: false
        },
        {
          id: '2',
          eventType: 'suspicious_activity',
          severity: 'medium',
          description: 'Unusual API usage pattern detected',
          ipAddress: '10.0.0.50',
          count: 1,
          createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
          resolved: true
        }
      ]

      // Mock API usage stats
      const mockApiStats = {
        totalRequests: 15420,
        requestsToday: 1850,
        requestsThisWeek: 12450,
        averageResponseTime: 125,
        errorRate: 2.1,
        topEndpoints: [
          { endpoint: '/trpc/auth.me', requests: 3420, avgResponseTime: 45, errorRate: 0.5 },
          { endpoint: '/trpc/items.getAllItems', requests: 2890, avgResponseTime: 180, errorRate: 1.2 },
          { endpoint: '/trpc/billing.getSubscription', requests: 1650, avgResponseTime: 95, errorRate: 0.8 },
          { endpoint: '/trpc/favorites.getUserFavorites', requests: 1240, avgResponseTime: 65, errorRate: 0.3 },
          { endpoint: '/trpc/settings.getUserSettings', requests: 980, avgResponseTime: 55, errorRate: 0.2 }
        ]
      }

      return {
        auditLog: {
          total: totalAuditEntries.count,
          today: auditEntriesToday.count,
          thisWeek: auditEntriesWeek.count,
          actionDistribution
        },
        securityEvents: mockSecurityEvents,
        apiUsage: mockApiStats
      }
    }),

  // Get audit log entries with filtering and pagination
  getAuditLog: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      action: z.string().optional(),
      resource: z.string().optional(),
      userId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, action, resource, userId, startDate, endDate, search } = input
      const offset = (page - 1) * limit

      // Build where conditions
      const conditions = []
      
      if (action) {
        conditions.push(eq(auditLog.action, action))
      }
      
      if (resource) {
        conditions.push(eq(auditLog.resource, resource))
      }
      
      if (userId) {
        conditions.push(eq(auditLog.userId, userId))
      }
      
      if (startDate) {
        conditions.push(gte(auditLog.createdAt, new Date(startDate)))
      }
      
      if (endDate) {
        conditions.push(lte(auditLog.createdAt, new Date(endDate)))
      }
      
      if (search) {
        conditions.push(
          or(
            like(auditLog.action, `%${search}%`),
            like(auditLog.resource, `%${search}%`),
            sql`${auditLog.details}::text ILIKE ${`%${search}%`}`
          )
        )
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get audit entries with user data
      const auditQuery = db
        .select({
          id: auditLog.id,
          userId: auditLog.userId,
          action: auditLog.action,
          resource: auditLog.resource,
          resourceId: auditLog.resourceId,
          details: auditLog.details,
          ipAddress: auditLog.ipAddress,
          userAgent: auditLog.userAgent,
          createdAt: auditLog.createdAt,
          // User data
          userEmail: users.email,
          userName: users.name
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.userId, users.id))

      if (whereClause) {
        auditQuery.where(whereClause)
      }

      const auditEntries = await auditQuery
        .orderBy(desc(auditLog.createdAt))
        .limit(limit)
        .offset(offset)

      // Get total count
      const totalQuery = db.select({ count: count() }).from(auditLog)
      if (whereClause) {
        totalQuery.where(whereClause)
      }
      const [{ count: totalEntries }] = await totalQuery

      return {
        entries: auditEntries,
        pagination: {
          page,
          limit,
          total: totalEntries,
          totalPages: Math.ceil(totalEntries / limit)
        }
      }
    }),

  // Get API usage analytics
  getApiUsageAnalytics: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      groupBy: z.enum(['hour', 'day', 'week']).default('day')
    }))
    .query(async ({ input }) => {
      const { startDate, endDate, groupBy } = input
      
      // Mock API usage data - in production this would come from api_usage_logs table
      const mockApiUsageData = {
        requestsOverTime: [
          { date: '2024-01-01', requests: 1250, errors: 25, avgResponseTime: 120 },
          { date: '2024-01-02', requests: 1180, errors: 18, avgResponseTime: 110 },
          { date: '2024-01-03', requests: 1420, errors: 32, avgResponseTime: 135 },
          { date: '2024-01-04', requests: 1350, errors: 22, avgResponseTime: 125 },
          { date: '2024-01-05', requests: 1480, errors: 28, avgResponseTime: 140 },
          { date: '2024-01-06', requests: 1220, errors: 15, avgResponseTime: 115 },
          { date: '2024-01-07', requests: 1380, errors: 24, avgResponseTime: 130 }
        ],
        topEndpoints: [
          { 
            endpoint: '/trpc/auth.me', 
            requests: 3420, 
            avgResponseTime: 45, 
            errorRate: 0.5,
            uniqueUsers: 245
          },
          { 
            endpoint: '/trpc/items.getAllItems', 
            requests: 2890, 
            avgResponseTime: 180, 
            errorRate: 1.2,
            uniqueUsers: 198
          },
          { 
            endpoint: '/trpc/billing.getSubscription', 
            requests: 1650, 
            avgResponseTime: 95, 
            errorRate: 0.8,
            uniqueUsers: 156
          },
          { 
            endpoint: '/trpc/favorites.getUserFavorites', 
            requests: 1240, 
            avgResponseTime: 65, 
            errorRate: 0.3,
            uniqueUsers: 134
          },
          { 
            endpoint: '/trpc/settings.getUserSettings', 
            requests: 980, 
            avgResponseTime: 55, 
            errorRate: 0.2,
            uniqueUsers: 98
          }
        ],
        statusCodeDistribution: [
          { code: 200, count: 14250, percentage: 92.4 },
          { code: 404, count: 680, percentage: 4.4 },
          { code: 500, count: 320, percentage: 2.1 },
          { code: 401, count: 170, percentage: 1.1 }
        ],
        topUsers: [
          { userId: 1, email: 'user@example.com', requests: 450, avgResponseTime: 85 },
          { userId: 2, email: 'user2@example.com', requests: 380, avgResponseTime: 92 },
          { userId: 3, email: 'user3@example.com', requests: 340, avgResponseTime: 78 },
          { userId: 4, email: 'user4@example.com', requests: 295, avgResponseTime: 105 },
          { userId: 5, email: 'user5@example.com', requests: 280, avgResponseTime: 88 }
        ]
      }

      return mockApiUsageData
    }),

  // Get security events
  getSecurityEvents: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      severity: z.string().optional(),
      eventType: z.string().optional(),
      resolved: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, severity, eventType, resolved, startDate, endDate } = input
      
      // Mock security events data - in production this would come from security_events table
      const mockSecurityEvents = [
        {
          id: '1',
          eventType: 'multiple_failed_logins',
          severity: 'high',
          description: 'Multiple failed login attempts from IP 192.168.1.100',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          details: { attemptCount: 5, timeWindow: '5 minutes' },
          resolved: false,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: '2',
          eventType: 'suspicious_activity',
          severity: 'medium',
          description: 'Unusual API usage pattern detected for user ID 42',
          ipAddress: '10.0.0.50',
          userAgent: 'CustomBot/1.0',
          details: { requestRate: '500 requests/minute', threshold: '100 requests/minute' },
          resolved: true,
          resolvedBy: 1,
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
        },
        {
          id: '3',
          eventType: 'admin_action_anomaly',
          severity: 'high',
          description: 'Admin performed unusual number of user role changes',
          ipAddress: '203.0.113.45',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          details: { roleChanges: 15, timeWindow: '1 hour', adminUserId: 3 },
          resolved: false,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
        },
        {
          id: '4',
          eventType: 'rate_limit_exceeded',
          severity: 'low',
          description: 'Rate limit exceeded for API endpoint',
          ipAddress: '198.51.100.25',
          userAgent: 'PostmanRuntime/7.32.3',
          details: { endpoint: '/trpc/items.getAllItems', rate: '200 requests/minute' },
          resolved: true,
          resolvedBy: 1,
          resolvedAt: new Date(Date.now() - 15 * 60 * 1000),
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000)
        }
      ]

      // Apply filters
      let filteredEvents = mockSecurityEvents

      if (severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === severity)
      }

      if (eventType) {
        filteredEvents = filteredEvents.filter(event => event.eventType === eventType)
      }

      if (typeof resolved === 'boolean') {
        filteredEvents = filteredEvents.filter(event => event.resolved === resolved)
      }

      if (startDate) {
        const start = new Date(startDate)
        filteredEvents = filteredEvents.filter(event => event.createdAt >= start)
      }

      if (endDate) {
        const end = new Date(endDate)
        filteredEvents = filteredEvents.filter(event => event.createdAt <= end)
      }

      // Pagination
      const total = filteredEvents.length
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedEvents = filteredEvents.slice(startIndex, endIndex)

      return {
        events: paginatedEvents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    }),

  // Mark security event as resolved
  resolveSecurityEvent: adminProcedure
    .input(z.object({
      eventId: z.string(),
      resolution: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { eventId, resolution } = input

      // In production, this would update the security_events table
      // For now, we'll just log the action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'resolve_security_event',
        resource: 'security_event',
        resourceId: eventId,
        details: {
          resolution,
          resolvedAt: new Date().toISOString()
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return {
        success: true,
        message: 'Security event marked as resolved'
      }
    }),

  // Get user activity details
  getUserActivityDetails: adminProcedure
    .input(z.object({
      userId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { userId, startDate, endDate } = input
      
      // Build where conditions
      const conditions = [eq(auditLog.userId, userId)]
      
      if (startDate) {
        conditions.push(gte(auditLog.createdAt, new Date(startDate)))
      }
      
      if (endDate) {
        conditions.push(lte(auditLog.createdAt, new Date(endDate)))
      }

      // Get user's audit log entries
      const userActivity = await db
        .select()
        .from(auditLog)
        .where(and(...conditions))
        .orderBy(desc(auditLog.createdAt))
        .limit(100)

      // Get activity summary
      const activitySummary = await db
        .select({
          action: auditLog.action,
          count: count()
        })
        .from(auditLog)
        .where(and(...conditions))
        .groupBy(auditLog.action)
        .orderBy(desc(count()))

      return {
        activities: userActivity,
        summary: activitySummary
      }
    })
})