import { z } from 'zod'
import { protectedProcedure, adminProcedure, router } from './trpc.js'
import { db } from '../db/index.js'
import { sql, eq, desc, and, count } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

// Since we don't have the schema defined in Drizzle, we'll use raw SQL queries
export const notificationsRouter = router({
  // Get user's notifications with pagination and filtering
  getUserNotifications: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      unreadOnly: z.boolean().default(false)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        let whereClause = `user_id = $1`
        const params = [userId]
        
        if (input.unreadOnly) {
          whereClause += ` AND is_read = false`
        }
        
        const query = `
          SELECT id, type, title, message, is_read, action_url, created_at, read_at
          FROM notifications 
          WHERE ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `
        
        const result = await db.execute(sql`${sql.raw(query)}`)
        return result
      } catch (error) {
        console.error('[Notifications] Error fetching user notifications:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notifications.'
        })
      }
    }),

  // Get unread count for badge
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id
      
      try {
        const result = await db.execute(sql`SELECT COUNT(*) as count FROM notifications WHERE user_id = ${userId} AND is_read = false`)
        return { count: parseInt((result[0] as any)?.count || '0') }
      } catch (error) {
        console.error('[Notifications] Error fetching unread count:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch unread count.'
        })
      }
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        const result = await db.execute(sql`UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = ${input.notificationId} AND user_id = ${userId} AND is_read = false RETURNING id`)
        
        if (result.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Notification not found or already read.'
          })
        }
        
        return { success: true }
      } catch (error) {
        console.error('[Notifications] Error marking as read:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark notification as read.'
        })
      }
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id
      
      try {
        const result = await db.execute(sql`UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = ${userId} AND is_read = false RETURNING id`)
        
        return { count: result.length, success: true }
      } catch (error) {
        console.error('[Notifications] Error marking all as read:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark all notifications as read.'
        })
      }
    }),

  // Delete notification
  deleteNotification: protectedProcedure
    .input(z.object({
      notificationId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        const result = await db.execute(sql`DELETE FROM notifications WHERE id = ${input.notificationId} AND user_id = ${userId} RETURNING id`)
        
        if (result.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Notification not found.'
          })
        }
        
        return { success: true }
      } catch (error) {
        console.error('[Notifications] Error deleting notification:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete notification.'
        })
      }
    }),

  // Create notification (admin only, for system announcements)
  createNotification: adminProcedure
    .input(z.object({
      userId: z.number().optional(), // If not provided, broadcast to all users
      type: z.enum(['info', 'success', 'warning', 'error', 'system']),
      title: z.string().min(1).max(255),
      message: z.string().min(1).max(1000),
      actionUrl: z.string().url().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        if (input.userId) {
          // Send to specific user
          await db.execute(sql`INSERT INTO notifications (user_id, type, title, message, action_url) VALUES (${input.userId}, ${input.type}, ${input.title}, ${input.message}, ${input.actionUrl || null})`)
          return { success: true, message: 'Notification sent to user.' }
        } else {
          // Broadcast to all users (get all user IDs first)
          const usersResult = await db.execute(sql`SELECT id FROM users`)
          const userIds = usersResult.map((row: any) => row.id)
          
          for (const userId of userIds) {
            await db.execute(sql`INSERT INTO notifications (user_id, type, title, message, action_url) VALUES (${userId}, ${input.type}, ${input.title}, ${input.message}, ${input.actionUrl || null})`)
          }
          
          return { success: true, message: `Broadcast sent to ${userIds.length} users.` }
        }
      } catch (error) {
        console.error('[Notifications] Error creating notification:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create notification.'
        })
      }
    })
})