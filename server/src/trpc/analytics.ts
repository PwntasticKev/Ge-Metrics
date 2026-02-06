import { z } from 'zod'
import { t, adminProcedure, protectedProcedure, publicProcedure } from './trpc.js'
import { websocketService } from '../services/websocketService.js'
import type { AnalyticsEvent } from '../services/websocketService.js'
import { db } from '../db/index.js'
import { sql } from 'drizzle-orm'

// Analytics event schemas
const AnalyticsEventSchema = z.object({
  type: z.enum(['user_activity', 'price_update', 'method_update', 'system_metric']),
  data: z.any(),
  userId: z.number().optional(),
})

const SubscriptionSchema = z.object({
  channel: z.string(),
  filters: z.record(z.any()).optional(),
})

const MetricsRequestSchema = z.object({
  type: z.enum(['user_activity', 'price_updates', 'system_performance', 'recent']),
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  limit: z.number().min(1).max(1000).optional().default(100),
})

export const analyticsRouter = t.router({
  /**
   * Get WebSocket connection statistics (admin only)
   */
  getConnectionStats: adminProcedure.query(() => {
    return websocketService.getStats()
  }),

  /**
   * Broadcast event to WebSocket clients (admin only)
   */
  broadcastEvent: adminProcedure
    .input(AnalyticsEventSchema)
    .mutation(({ input, ctx }) => {
      const event: AnalyticsEvent = {
        type: input.type,
        data: input.data,
        timestamp: new Date(),
        userId: input.userId || ctx.user.id,
      }

      websocketService.broadcastEvent(event)

      return {
        success: true,
        event,
        timestamp: new Date(),
      }
    }),

  /**
   * Get real-time user activity metrics
   */
  getUserActivityMetrics: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['1h', '6h', '24h', '7d']).default('24h'),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      const { timeframe, limit } = input
      
      // Calculate time range
      const now = new Date()
      const timeMap: Record<string, number> = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      }
      
      const startTime = new Date(now.getTime() - timeMap[timeframe])

      try {
        // Query user sessions and activity
        const userActivity = await db.execute(sql`
          SELECT 
            DATE_TRUNC('hour', created_at) as hour,
            COUNT(DISTINCT user_id) as active_users,
            COUNT(*) as total_sessions
          FROM user_sessions 
          WHERE created_at >= ${startTime}
          AND created_at <= ${now}
          GROUP BY DATE_TRUNC('hour', created_at)
          ORDER BY hour DESC
          LIMIT ${limit}
        `)

        return {
          timeframe,
          data: userActivity,
          timestamp: new Date(),
        }
      } catch (error) {
        console.error('Error fetching user activity metrics:', error)
        throw new Error('Failed to fetch user activity metrics')
      }
    }),

  /**
   * Get real-time price update metrics
   */
  getPriceMetrics: publicProcedure
    .input(z.object({
      timeframe: z.enum(['1h', '6h', '24h']).default('1h'),
      itemIds: z.array(z.number()).optional(),
    }))
    .query(async ({ input }) => {
      const { timeframe, itemIds } = input
      
      try {
        let query = sql`
          SELECT 
            item_id,
            AVG(buying_price) as avg_buy_price,
            AVG(selling_price) as avg_sell_price,
            COUNT(*) as update_count,
            MAX(created_at) as last_updated
          FROM item_volumes 
          WHERE created_at >= NOW() - INTERVAL '${sql.raw(timeframe)}'
        `

        if (itemIds && itemIds.length > 0) {
          query = sql`${query} AND item_id = ANY(${itemIds})`
        }

        query = sql`${query} 
          GROUP BY item_id 
          ORDER BY last_updated DESC
        `

        const priceMetrics = await db.execute(query)

        return {
          timeframe,
          itemIds: itemIds || [],
          data: priceMetrics,
          timestamp: new Date(),
        }
      } catch (error) {
        console.error('Error fetching price metrics:', error)
        throw new Error('Failed to fetch price metrics')
      }
    }),

  /**
   * Get system performance metrics (admin only)
   */
  getSystemMetrics: adminProcedure
    .input(z.object({
      timeframe: z.enum(['1h', '6h', '24h']).default('1h'),
    }))
    .query(async ({ input }) => {
      const { timeframe } = input

      try {
        // Get database metrics
        const dbStats = await db.execute(sql`
          SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_rows,
            n_dead_tup as dead_rows
          FROM pg_stat_user_tables
          WHERE schemaname = 'public'
          ORDER BY n_live_tup DESC
        `)

        // Get connection metrics from WebSocket service
        const wsStats = websocketService.getStats()

        // Calculate memory usage (simplified)
        const memoryUsage = process.memoryUsage()

        return {
          timeframe,
          database: {
            tables: dbStats,
            connectionCount: (await db.execute(sql`SELECT count(*) as count FROM pg_stat_activity`))[0]?.count || 0,
          },
          websocket: wsStats,
          memory: {
            rss: memoryUsage.rss,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
          },
          process: {
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage(),
          },
          timestamp: new Date(),
        }
      } catch (error) {
        console.error('Error fetching system metrics:', error)
        throw new Error('Failed to fetch system metrics')
      }
    }),

  /**
   * Get money-making method analytics
   */
  getMethodAnalytics: protectedProcedure
    .input(z.object({
      timeframe: z.enum(['24h', '7d', '30d']).default('7d'),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const { timeframe, limit } = input

      try {
        // Get method creation and approval metrics
        const methodStats = await db.execute(sql`
          SELECT 
            category,
            difficulty,
            status,
            COUNT(*) as method_count,
            AVG(profit_per_hour) as avg_profit,
            DATE_TRUNC('day', created_at) as date
          FROM money_making_methods 
          WHERE created_at >= NOW() - INTERVAL '${sql.raw(timeframe)}'
          GROUP BY category, difficulty, status, DATE_TRUNC('day', created_at)
          ORDER BY date DESC, method_count DESC
          LIMIT ${limit}
        `)

        // Get top performers
        const topMethods = await db.execute(sql`
          SELECT 
            method_name,
            category,
            difficulty,
            profit_per_hour,
            username,
            created_at
          FROM money_making_methods 
          WHERE status = 'approved'
          AND created_at >= NOW() - INTERVAL '${sql.raw(timeframe)}'
          ORDER BY profit_per_hour DESC
          LIMIT 10
        `)

        return {
          timeframe,
          stats: methodStats,
          topMethods: topMethods,
          timestamp: new Date(),
        }
      } catch (error) {
        console.error('Error fetching method analytics:', error)
        throw new Error('Failed to fetch method analytics')
      }
    }),

  /**
   * Record user activity event
   */
  recordActivity: protectedProcedure
    .input(z.object({
      action: z.string(),
      page: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(({ input, ctx }) => {
      const event = {
        type: 'user_activity' as const,
        data: {
          action: input.action,
          page: input.page,
          metadata: input.metadata,
          userId: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date(),
        userId: ctx.user.id,
      }

      // Broadcast to WebSocket clients
      websocketService.broadcastEvent(event)

      return {
        success: true,
        recorded: true,
        timestamp: new Date(),
      }
    }),

  /**
   * Get polling fallback data for clients without WebSocket support
   */
  getPollingData: protectedProcedure
    .input(z.object({
      channels: z.array(z.string()),
      lastUpdate: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { channels, lastUpdate } = input
      const since = lastUpdate || new Date(Date.now() - 30000) // Last 30 seconds

      try {
        const events: any[] = []

        // Check permissions for admin channels
        const canAccessAdmin = ctx.user.role === 'admin'
        const allowedChannels = channels.filter(channel => 
          !channel.startsWith('admin_') || canAccessAdmin
        )

        // Simulate recent events for polling clients
        if (allowedChannels.includes('user_activity')) {
          // Get recent user activity (simplified)
          const recentActivity = await db.execute(sql`
            SELECT 
              COUNT(*) as count,
              MAX(created_at) as last_activity
            FROM user_sessions 
            WHERE created_at >= ${since}
          `)

          if ((recentActivity[0] as any)?.count > 0) {
            events.push({
              type: 'user_activity',
              data: recentActivity[0],
              timestamp: new Date(),
            })
          }
        }

        if (allowedChannels.includes('method_updates')) {
          // Get recent method updates
          const recentMethods = await db.execute(sql`
            SELECT 
              id,
              method_name,
              status,
              created_at
            FROM money_making_methods 
            WHERE created_at >= ${since}
            ORDER BY created_at DESC
            LIMIT 5
          `)

          if (recentMethods.length > 0) {
            events.push({
              type: 'method_update',
              data: recentMethods,
              timestamp: new Date(),
            })
          }
        }

        return {
          events,
          timestamp: new Date(),
          pollingInterval: 30000, // Recommend 30-second polling
        }
      } catch (error) {
        console.error('Error fetching polling data:', error)
        throw new Error('Failed to fetch polling data')
      }
    }),
})
