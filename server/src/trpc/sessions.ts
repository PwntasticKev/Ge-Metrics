import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from './trpc.js'
import { db, userSessions, loginHistory } from '../db/index.js'
import { eq, desc, and, gte, ne, countDistinct } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const sessionsRouter = router({
  // Get count of active users (public endpoint for footer)
  getActiveUsersCount: publicProcedure.query(async () => {
    // Get users active in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    
    const result = await db
      .select({
        count: countDistinct(userSessions.userId)
      })
      .from(userSessions)
      .where(and(
        eq(userSessions.isActive, true),
        gte(userSessions.lastActivity, fifteenMinutesAgo)
      ))
    
    return {
      activeUsers: result[0]?.count || 0,
      lastUpdated: new Date().toISOString()
    }
  }),

  // Get active sessions for current user
  getActiveSessions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id
    
    const sessions = await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.isActive, true)
      ))
      .orderBy(desc(userSessions.lastActivity))
    
    return sessions
  }),

  // Revoke a specific session
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { sessionId } = input
      
      // Verify session belongs to user
      const sessions = await db.select().from(userSessions).where(and(
        eq(userSessions.id, sessionId),
        eq(userSessions.userId, userId)
      )).limit(1)
      const session = sessions[0]
      
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found'
        })
      }
      
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.id, sessionId))
      
      return { success: true, message: 'Session revoked successfully' }
    }),

  // Revoke all other sessions (keep current one)
  revokeAllOtherSessions: protectedProcedure
    .input(z.object({ currentToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { currentToken } = input
      
      // Revoke all active sessions except the current one
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true),
          ne(userSessions.token, currentToken)
        ))
      
      return { success: true, message: 'All other sessions revoked successfully' }
    }),

  // Get login history for current user
  getLoginHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { limit } = input
      
      // Get last 30 days of login history
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const history = await db
        .select()
        .from(loginHistory)
        .where(and(
          eq(loginHistory.userId, userId),
          gte(loginHistory.createdAt, thirtyDaysAgo)
        ))
        .orderBy(desc(loginHistory.createdAt))
        .limit(limit)
      
      return history
    })
})

