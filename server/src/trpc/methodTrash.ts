import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from './trpc.js'
import { TRPCError } from '@trpc/server'
import { db, methodTrashVotes, methodAdminClean, users, moneyMakingMethods } from '../db/index.js'
import { eq, sql, and } from 'drizzle-orm'

export const methodTrashRouter = router({
  // Get comprehensive method trash data for all methods
  getAllMethodTrashData: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        console.log('[getAllMethodTrashData] Fetching method trash data for user:', ctx.user.id)
        
        // Get total user count
        const totalUsersResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
        
        const totalUsers = totalUsersResult[0]?.count || 0
        console.log('[getAllMethodTrashData] Total users:', totalUsers)
        
        // Get all method trash votes grouped by method
        const trashVotesResult = await db
          .select({
            methodId: methodTrashVotes.methodId,
            methodName: methodTrashVotes.methodName,
            trashCount: sql<number>`count(*)::int`
          })
          .from(methodTrashVotes)
          .groupBy(methodTrashVotes.methodId, methodTrashVotes.methodName)
        
        // Get user's personal votes
        const userVotesResult = await db
          .select({
            methodId: methodTrashVotes.methodId
          })
          .from(methodTrashVotes)
          .where(eq(methodTrashVotes.userId, ctx.user.id))
        
        // Get user's complete trash list with names
        const userTrashMethodsResult = await db
          .select({
            methodId: methodTrashVotes.methodId,
            methodName: methodTrashVotes.methodName,
            createdAt: methodTrashVotes.createdAt
          })
          .from(methodTrashVotes)
          .where(eq(methodTrashVotes.userId, ctx.user.id))
          .orderBy(methodTrashVotes.createdAt)
        
        // Get admin cleaned methods
        const adminCleanedResult = await db
          .select({
            methodId: methodAdminClean.methodId
          })
          .from(methodAdminClean)
        
        // Build response data
        const adminCleanedSet = new Set(adminCleanedResult.map(method => method.methodId))
        const userVotes = new Set(userVotesResult.map(vote => vote.methodId))
        
        // Build method stats excluding admin-cleaned methods
        const methodStats: Record<string, { trashCount: number; totalUsers: number; methodName: string }> = {}
        
        trashVotesResult.forEach(method => {
          if (!adminCleanedSet.has(method.methodId)) {
            methodStats[method.methodId] = {
              trashCount: method.trashCount,
              totalUsers,
              methodName: method.methodName
            }
          }
        })
        
        console.log(`[getAllMethodTrashData] Returning data: ${Object.keys(methodStats).length} methods with votes, ${userVotes.size} user votes, ${totalUsers} total users`)
        
        return {
          methodStats,
          userVotes,
          userTrashMethods: userTrashMethodsResult,
          totalUsers,
          adminCleaned: adminCleanedSet
        }
      } catch (error) {
        console.error('[getAllMethodTrashData] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch method trash data',
          cause: error
        })
      }
    }),

  // Mark a method as trash
  markMethod: protectedProcedure
    .input(z.object({
      methodId: z.string().uuid('Method ID must be a valid UUID'),
      methodName: z.string().min(1, 'Method name is required').max(255, 'Method name too long')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[markMethod] User ${ctx.user.id} marking method ${input.methodId} (${input.methodName}) as trash`)
        
        // Check if admin has marked this method as clean
        let wasAdminCleaned = false
        const adminCleanResult = await db
          .select()
          .from(methodAdminClean)
          .where(eq(methodAdminClean.methodId, input.methodId))
          .limit(1)
        
        if (adminCleanResult.length > 0) {
          console.log(`[markMethod] Method ${input.methodId} was admin-cleaned, but allowing vote`)
          wasAdminCleaned = true
        }
        
        // Insert the vote - let the database handle duplicates
        await db
          .insert(methodTrashVotes)
          .values({
            userId: ctx.user.id,
            methodId: input.methodId,
            methodName: input.methodName
          })
          .onConflictDoNothing()
        
        console.log(`[markMethod] Successfully marked method ${input.methodId} as trash for user ${ctx.user.id}`)
        
        return { 
          success: true,
          wasAdminCleaned,
          message: wasAdminCleaned 
            ? 'Note: This method was previously marked as clean by an admin, but your vote has been recorded.'
            : undefined
        }
      } catch (error: any) {
        console.error('[markMethod] Error:', error)
        
        // PostgreSQL duplicate key error
        if (error?.code === '23505') {
          console.log(`[markMethod] Duplicate key detected - Method ${input.methodId} already marked as trash for user ${ctx.user.id}`)
          return { success: true }
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark method as trash',
          cause: error
        })
      }
    }),

  // Unmark a method as trash
  unmarkMethod: protectedProcedure
    .input(z.object({
      methodId: z.string().uuid('Method ID must be a valid UUID')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[unmarkMethod] User ${ctx.user.id} unmarking method ${input.methodId}`)
        
        await db
          .delete(methodTrashVotes)
          .where(and(
            eq(methodTrashVotes.userId, ctx.user.id),
            eq(methodTrashVotes.methodId, input.methodId)
          ))
        
        console.log(`[unmarkMethod] Successfully unmarked method ${input.methodId}`)
        
        return { success: true }
      } catch (error) {
        console.error('[unmarkMethod] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unmark method as trash',
          cause: error
        })
      }
    }),

  // Admin: Clear all votes for a method
  clearMethodVotes: adminProcedure
    .input(z.object({
      methodId: z.string().uuid('Method ID must be a valid UUID')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[clearMethodVotes] Admin ${ctx.user.id} clearing votes for method ${input.methodId}`)
        
        // Delete all votes for this method
        await db
          .delete(methodTrashVotes)
          .where(eq(methodTrashVotes.methodId, input.methodId))
        
        // Mark as admin cleaned
        await db
          .insert(methodAdminClean)
          .values({
            methodId: input.methodId,
            cleanedBy: ctx.user.id
          })
          .onConflictDoUpdate({
            target: [methodAdminClean.methodId],
            set: {
              cleanedBy: ctx.user.id,
              cleanedAt: sql`NOW()`
            }
          })
        
        console.log(`[clearMethodVotes] Successfully cleared votes for method ${input.methodId}`)
        
        return { success: true }
      } catch (error) {
        console.error('[clearMethodVotes] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear method votes',
          cause: error
        })
      }
    })
})