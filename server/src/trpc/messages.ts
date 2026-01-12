import { z } from 'zod'
import { protectedProcedure, adminProcedure, router } from './trpc.js'
import { db } from '../db/index.js'
import { sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const messagesRouter = router({
  // Get user's messages/conversations
  getUserMessages: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      unreadOnly: z.boolean().default(false)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        let whereClause = `to_user_id = $1`
        const params = [userId]
        
        if (input.unreadOnly) {
          whereClause += ` AND is_read = false`
        }
        
        const query = `
          SELECT 
            m.id, m.from_user_id, m.to_user_id, m.subject, m.content, 
            m.is_read, m.created_at, m.read_at,
            fu.username as from_username,
            tu.username as to_username
          FROM user_messages m
          LEFT JOIN users fu ON m.from_user_id = fu.id
          LEFT JOIN users tu ON m.to_user_id = tu.id
          WHERE ${whereClause}
          ORDER BY m.created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `
        
        const result = await db.execute(sql`${sql.raw(query)}`)
        return result
      } catch (error) {
        console.error('[Messages] Error fetching user messages:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch messages.'
        })
      }
    }),

  // Get unread message count
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id
      
      try {
        const result = await db.execute(sql`SELECT COUNT(*) as count FROM user_messages WHERE to_user_id = ${userId} AND is_read = false`)
        return { count: parseInt((result[0] as any)?.count || '0') }
      } catch (error) {
        console.error('[Messages] Error fetching unread count:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch unread count.'
        })
      }
    }),

  // Send message
  sendMessage: protectedProcedure
    .input(z.object({
      toUserId: z.number(),
      subject: z.string().min(1).max(255).optional(),
      content: z.string().min(1).max(5000),
      parentMessageId: z.string().uuid().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const fromUserId = ctx.user.id
      
      try {
        // Verify the recipient exists
        const recipientCheck = await db.execute(sql`SELECT id FROM users WHERE id = ${input.toUserId}`)
        
        if (recipientCheck.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recipient user not found.'
          })
        }
        
        const result = await db.execute(sql`INSERT INTO user_messages (from_user_id, to_user_id, subject, content, parent_message_id) VALUES (${fromUserId}, ${input.toUserId}, ${input.subject || null}, ${input.content}, ${input.parentMessageId || null}) RETURNING id`)
        
        return { 
          success: true, 
          messageId: result[0].id,
          message: 'Message sent successfully.' 
        }
      } catch (error) {
        console.error('[Messages] Error sending message:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send message.'
        })
      }
    }),

  // Mark message as read
  markAsRead: protectedProcedure
    .input(z.object({
      messageId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        const result = await db.execute(sql`UPDATE user_messages SET is_read = true, read_at = NOW() WHERE id = ${input.messageId} AND to_user_id = ${userId} AND is_read = false RETURNING id`)
        
        if (result.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Message not found or already read.'
          })
        }
        
        return { success: true }
      } catch (error) {
        console.error('[Messages] Error marking as read:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark message as read.'
        })
      }
    }),

  // Delete message
  deleteMessage: protectedProcedure
    .input(z.object({
      messageId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        const result = await db.execute(sql`DELETE FROM user_messages WHERE id = ${input.messageId} AND to_user_id = ${userId} RETURNING id`)
        
        if (result.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Message not found.'
          })
        }
        
        return { success: true }
      } catch (error) {
        console.error('[Messages] Error deleting message:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete message.'
        })
      }
    }),

  // Get conversation thread
  getConversation: protectedProcedure
    .input(z.object({
      withUserId: z.number(),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        const query = `
          SELECT 
            m.id, m.from_user_id, m.to_user_id, m.subject, m.content, 
            m.is_read, m.created_at, m.read_at,
            fu.username as from_username,
            tu.username as to_username
          FROM user_messages m
          LEFT JOIN users fu ON m.from_user_id = fu.id
          LEFT JOIN users tu ON m.to_user_id = tu.id
          WHERE 
            (m.from_user_id = $1 AND m.to_user_id = $2) OR 
            (m.from_user_id = $2 AND m.to_user_id = $1)
          ORDER BY m.created_at DESC
          LIMIT $3
        `
        
        const result = await db.execute(sql`${sql.raw(query)}`)
        return result.reverse() // Return in chronological order
      } catch (error) {
        console.error('[Messages] Error fetching conversation:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch conversation.'
        })
      }
    }),

  // Admin: Send broadcast message
  sendBroadcast: adminProcedure
    .input(z.object({
      subject: z.string().min(1).max(255),
      content: z.string().min(1).max(5000)
    }))
    .mutation(async ({ ctx, input }) => {
      const fromUserId = ctx.user.id
      
      try {
        // Get all user IDs
        const usersResult = await db.execute(sql`SELECT id FROM users WHERE id != ${fromUserId}`)
        const userIds = usersResult.map((row: any) => row.id)
        
        let successCount = 0
        for (const userId of userIds) {
          try {
            await db.execute(sql`INSERT INTO user_messages (from_user_id, to_user_id, subject, content, is_broadcast) VALUES (${fromUserId}, ${userId}, ${input.subject}, ${input.content}, true)`)
            successCount++
          } catch (err) {
            console.error(`Failed to send broadcast to user ${userId}:`, err)
          }
        }
        
        return { 
          success: true, 
          message: `Broadcast sent to ${successCount} users.`,
          count: successCount
        }
      } catch (error) {
        console.error('[Messages] Error sending broadcast:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send broadcast message.'
        })
      }
    })
})