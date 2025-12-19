import { z } from 'zod'
import { eq, desc, and, gte, lte, count, like, or } from 'drizzle-orm'
import { 
  db, 
  users, 
  userSessions,
  auditLog
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'

// Helper function to parse user agent for device info
function parseUserAgent(userAgent: string) {
  if (!userAgent) return null

  const browser = userAgent.includes('Chrome') ? 'Chrome' : 
                 userAgent.includes('Firefox') ? 'Firefox' :
                 userAgent.includes('Safari') ? 'Safari' :
                 userAgent.includes('Edge') ? 'Edge' : 'Unknown'

  const os = userAgent.includes('Windows') ? 'Windows' :
            userAgent.includes('Macintosh') ? 'macOS' :
            userAgent.includes('Linux') ? 'Linux' :
            userAgent.includes('Android') ? 'Android' :
            userAgent.includes('iPhone') ? 'iOS' : 'Unknown'

  const deviceType = userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone') ? 'Mobile' :
                    userAgent.includes('Tablet') || userAgent.includes('iPad') ? 'Tablet' : 'Desktop'

  return {
    browser,
    os,
    deviceType,
    rawUserAgent: userAgent
  }
}

// Helper function to get location info from IP (simplified)
async function getLocationFromIP(ipAddress: string) {
  // In production, you'd use a service like ipapi.co, ipgeolocation.io, etc.
  // For now, return mock data based on IP patterns
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
    return {
      city: 'Local Development',
      country: 'localhost',
      timezone: 'UTC',
      isp: 'Local'
    }
  }

  // TODO: Implement actual IP geolocation
  // const response = await fetch(`https://ipapi.co/${ipAddress}/json/`)
  // const data = await response.json()
  // return {
  //   city: data.city,
  //   country: data.country_name,
  //   timezone: data.timezone,
  //   isp: data.org
  // }

  return {
    city: 'Unknown',
    country: 'Unknown', 
    timezone: 'UTC',
    isp: 'Unknown'
  }
}

export const adminSessionsRouter = router({
  // Get all user sessions with filtering
  getAllSessions: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      userId: z.number().optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, userId, isActive, search, dateFrom, dateTo } = input
      const offset = (page - 1) * limit

      const conditions = []

      if (userId) {
        conditions.push(eq(userSessions.userId, userId))
      }

      if (isActive !== undefined) {
        conditions.push(eq(userSessions.isActive, isActive))
      }

      if (search) {
        conditions.push(
          or(
            like(users.email, `%${search}%`),
            like(users.name, `%${search}%`),
            like(userSessions.ipAddress, `%${search}%`)
          )
        )
      }

      if (dateFrom) {
        conditions.push(gte(userSessions.createdAt, new Date(dateFrom)))
      }

      if (dateTo) {
        conditions.push(lte(userSessions.createdAt, new Date(dateTo)))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const sessions = await db
        .select({
          id: userSessions.id,
          userId: userSessions.userId,
          userEmail: users.email,
          userName: users.name,
          token: userSessions.token,
          ipAddress: userSessions.ipAddress,
          userAgent: userSessions.userAgent,
          deviceInfo: userSessions.deviceInfo,
          isActive: userSessions.isActive,
          lastActivity: userSessions.lastActivity,
          createdAt: userSessions.createdAt
        })
        .from(userSessions)
        .leftJoin(users, eq(userSessions.userId, users.id))
        .where(whereClause)
        .orderBy(desc(userSessions.lastActivity))
        .limit(limit)
        .offset(offset)

      // Get total count
      const totalQuery = db
        .select({ count: count() })
        .from(userSessions)
        .leftJoin(users, eq(userSessions.userId, users.id))

      if (whereClause) {
        totalQuery.where(whereClause)
      }

      const [{ count: total }] = await totalQuery

      return {
        sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    }),

  // Get session statistics
  getSessionStats: adminProcedure
    .query(async () => {
      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Active sessions
      const [activeSessions] = await db
        .select({ count: count() })
        .from(userSessions)
        .where(and(
          eq(userSessions.isActive, true)
        ))

      // Sessions in last 24 hours
      const [recentSessions] = await db
        .select({ count: count() })
        .from(userSessions)
        .where(gte(userSessions.createdAt, last24Hours))

      // Sessions in last 7 days
      const [weekSessions] = await db
        .select({ count: count() })
        .from(userSessions)
        .where(gte(userSessions.createdAt, last7Days))

      // Device type breakdown
      const deviceBreakdown = await db
        .select({
          deviceType: userSessions.deviceInfo,
          count: count()
        })
        .from(userSessions)
        .where(gte(userSessions.createdAt, last7Days))
        .groupBy(userSessions.deviceInfo)

      // Top countries (derived from IP - placeholder for now)
      const countryBreakdown: Array<{ location: string; count: number }> = []

      return {
        activeSessions: activeSessions.count,
        last24Hours: recentSessions.count,
        last7Days: weekSessions.count,
        deviceBreakdown,
        countryBreakdown
      }
    }),

  // Get user's session history
  getUserSessions: adminProcedure
    .input(z.object({
      userId: z.number(),
      limit: z.number().default(20)
    }))
    .query(async ({ input }) => {
      const { userId, limit } = input

      const sessions = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .orderBy(desc(userSessions.lastActivity))
        .limit(limit)

      return sessions
    }),

  // Create a new session (called during login)
  createSession: adminProcedure
    .input(z.object({
      userId: z.number(),
      token: z.string(),
      ipAddress: z.string(),
      userAgent: z.string()
    }))
    .mutation(async ({ input }) => {
      const { userId, token, ipAddress, userAgent } = input

      // Parse device info
      const deviceInfo = parseUserAgent(userAgent)

      // Create session
      const [session] = await db
        .insert(userSessions)
        .values({
          userId,
          token,
          ipAddress,
          userAgent,
          deviceInfo,
          isActive: true
        })
        .returning()

      return session
    }),

  // Update session activity
  updateSessionActivity: adminProcedure
    .input(z.object({
      token: z.string()
    }))
    .mutation(async ({ input }) => {
      const { token } = input

      await db
        .update(userSessions)
        .set({
          lastActivity: new Date()
        })
        .where(eq(userSessions.token, token))

      return { success: true }
    }),

  // Terminate session
  terminateSession: adminProcedure
    .input(z.object({
      sessionId: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      const { sessionId } = input

      // Get session info for audit log
      const [session] = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.id, sessionId))
        .limit(1)

      if (!session) {
        throw new Error('Session not found')
      }

      // Deactivate session
      await db
        .update(userSessions)
        .set({
          isActive: false
        })
        .where(eq(userSessions.id, sessionId))

      // Log admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'terminate_user_session',
        resource: 'session',
        resourceId: sessionId,
        details: {
          terminatedUserId: session.userId,
          token: session.token.substring(0, 8) + '...',
          ipAddress: session.ipAddress
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return { success: true, message: 'Session terminated successfully' }
    }),

  // Terminate all user sessions
  terminateAllUserSessions: adminProcedure
    .input(z.object({
      userId: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input

      // Get count of active sessions
      const [activeCount] = await db
        .select({ count: count() })
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        ))

      // Deactivate all sessions for user
      await db
        .update(userSessions)
        .set({
          isActive: false
        })
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        ))

      // Log admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'terminate_all_user_sessions',
        resource: 'user_sessions',
        resourceId: userId.toString(),
        details: {
          terminatedUserId: userId,
          sessionsTerminated: activeCount.count
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return { 
        success: true, 
        sessionsTerminated: activeCount.count,
        message: `${activeCount.count} sessions terminated successfully` 
      }
    }),

  // Clean up expired sessions (sessions inactive for 30+ days)
  cleanupExpiredSessions: adminProcedure
    .mutation(async ({ ctx }) => {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Count inactive sessions (last activity > 30 days ago)
      const [expiredCount] = await db
        .select({ count: count() })
        .from(userSessions)
        .where(and(
          eq(userSessions.isActive, true),
          lte(userSessions.lastActivity, thirtyDaysAgo)
        ))

      // Deactivate inactive sessions
      await db
        .update(userSessions)
        .set({
          isActive: false
        })
        .where(and(
          eq(userSessions.isActive, true),
          lte(userSessions.lastActivity, thirtyDaysAgo)
        ))

      // Log admin action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'cleanup_expired_sessions',
        resource: 'sessions',
        resourceId: 'system',
        details: {
          expiredSessionsCleaned: expiredCount.count
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return {
        success: true,
        expiredSessionsCleaned: expiredCount.count,
        message: `${expiredCount.count} expired sessions cleaned up`
      }
    })
})