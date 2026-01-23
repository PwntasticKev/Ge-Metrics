import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from './trpc.js'
import { TRPCError } from '@trpc/server'
import { db, userTrashVotes, itemAdminClean, users } from '../db/index.js'
import { eq, sql, and } from 'drizzle-orm'

// Log at module level to verify imports
console.log('[trash.ts] Module loading, db exists:', !!db)
console.log('[trash.ts] userTrashVotes exists:', !!userTrashVotes)
console.log('[trash.ts] itemAdminClean exists:', !!itemAdminClean)

// Connectivity tests disabled for now - focusing on actual functionality
console.log('[trash.ts] Starting trash router with tables:', {
  userTrashVotes: 'user_trash_votes',
  itemAdminClean: 'item_admin_clean'
})

export const trashRouter = router({
  // Get comprehensive trash data for all items
  getAllTrashData: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        console.log('[getAllTrashData] Fetching trash data for user:', ctx.user.id)
        
        // Get total user count
        console.log('[getAllTrashData] About to count users')
        const totalUsersResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
        console.log('[getAllTrashData] User count result:', totalUsersResult)
        
        const totalUsers = totalUsersResult[0]?.count || 0
        console.log('[getAllTrashData] Total users:', totalUsers)
        
        // Get all trash votes grouped by item
        console.log('[getAllTrashData] About to get trash votes')
        const trashVotesResult = await db
          .select({
            itemId: userTrashVotes.itemId,
            itemName: userTrashVotes.itemName,
            trashCount: sql<number>`count(*)::int`
          })
          .from(userTrashVotes)
          .groupBy(userTrashVotes.itemId, userTrashVotes.itemName)
        console.log('[getAllTrashData] Trash votes result:', trashVotesResult?.length || 0, 'items')
        
        // Get user's personal votes
        const userVotesResult = await db
          .select({
            itemId: userTrashVotes.itemId
          })
          .from(userTrashVotes)
          .where(eq(userTrashVotes.userId, ctx.user.id))
        
        // Get user's complete trash list with names
        const userTrashItemsResult = await db
          .select({
            itemId: userTrashVotes.itemId,
            itemName: userTrashVotes.itemName,
            createdAt: userTrashVotes.createdAt
          })
          .from(userTrashVotes)
          .where(eq(userTrashVotes.userId, ctx.user.id))
          .orderBy(userTrashVotes.createdAt)
        
        // Get admin cleaned items (should not show trash data)
        const adminCleanedResult = await db
          .select({
            itemId: itemAdminClean.itemId
          })
          .from(itemAdminClean)
        
        // Build response data
        const adminCleanedSet = new Set(adminCleanedResult.map(item => item.itemId))
        const userVotes = new Set(userVotesResult.map(vote => vote.itemId))
        
        // Build item stats excluding admin-cleaned items
        const itemStats: Record<number, { trashCount: number; totalUsers: number; itemName: string }> = {}
        
        trashVotesResult.forEach(item => {
          if (!adminCleanedSet.has(item.itemId)) {
            itemStats[item.itemId] = {
              trashCount: item.trashCount,
              totalUsers,
              itemName: item.itemName
            }
          }
        })
        
        console.log(`[getAllTrashData] Returning data: ${Object.keys(itemStats).length} items with votes, ${userVotes.size} user votes, ${totalUsers} total users`)
        
        return {
          itemStats,
          userVotes,
          userTrashItems: userTrashItemsResult,
          totalUsers,
          adminCleaned: adminCleanedSet
        }
      } catch (error) {
        console.error('[getAllTrashData] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch trash data',
          cause: error
        })
      }
    }),

  // Mark an item as trash
  markItem: protectedProcedure
    .input(z.object({
      itemId: z.number().positive('Item ID must be positive'),
      itemName: z.string().min(1, 'Item name is required').max(255, 'Item name too long')
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('[markItem] === START OF FUNCTION ===')
      console.log('[markItem] Input received:', JSON.stringify(input))
      console.log('[markItem] User context exists:', !!ctx.user)
      
      // TEMPORARY: Return success immediately to test if function runs
      // return { success: true, test: 'Function reached' }
      
      try {
        console.log('[markItem] Entering try block')
        console.log('[markItem] User ID:', ctx.user?.id)
        
        // Validate user context first
        if (!ctx.user || !ctx.user.id) {
          console.error('[markItem] No user in context:', { user: ctx.user })
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to mark items as trash'
          })
        }
        
        const userId = ctx.user.id
        console.log(`[markItem] Starting - User ${userId} marking item ${input.itemId} (${input.itemName}) as trash`)
        
        console.log('[markItem] About to check database imports:', {
          hasDb: !!db,
          hasUserTrashVotes: !!userTrashVotes,
          hasItemAdminClean: !!itemAdminClean
        })
        
        try {
          console.log('[markItem] Entering inner try block')
        
        // Check if admin has marked this item as clean (allow voting but track it)
        let wasAdminCleaned = false
        try {
          console.log('[markItem] About to check admin clean status')
          console.log('[markItem] DB object:', typeof db)
          console.log('[markItem] itemAdminClean table:', typeof itemAdminClean)
          
          const adminCleanResult = await db
            .select()
            .from(itemAdminClean)
            .where(eq(itemAdminClean.itemId, input.itemId))
            .limit(1)
          
          console.log('[markItem] Admin clean check completed:', adminCleanResult)
          
          if (adminCleanResult.length > 0) {
            console.log(`[markItem] Item ${input.itemId} was admin-cleaned, but allowing vote`)
            wasAdminCleaned = true
            // Don't throw error - allow the vote to proceed
          }
        } catch (adminCheckError: any) {
          console.error('[markItem] Error checking admin clean status:', {
            error: adminCheckError,
            message: adminCheckError?.message,
            code: adminCheckError?.code,
            detail: adminCheckError?.detail,
            cause: adminCheckError?.cause?.message
          })
          // Continue if admin check fails - better to allow marking than block
        }
        
        // Try to insert the vote - let the database handle duplicates
        try {
          console.log('[markItem] === DATABASE INSERT SECTION START ===')
          console.log('[markItem] About to insert vote into userTrashVotes')
          console.log('[markItem] Insert data:', { userId, itemId: input.itemId, itemName: input.itemName })
          console.log('[markItem] Database connection status:', !!db)
          console.log('[markItem] userTrashVotes table object:', typeof userTrashVotes)
          
          console.log('[markItem] Step 1: Creating insert query...')
          const insertQuery = db
            .insert(userTrashVotes)
            .values({
              userId: userId,
              itemId: input.itemId,
              itemName: input.itemName
            })
            .onConflictDoNothing()
          
          console.log('[markItem] Step 2: Query created, about to execute...')
          console.log('[markItem] Query object type:', typeof insertQuery)
          
          const startTime = Date.now()
          console.log('[markItem] Step 3: Executing insert query at', new Date().toISOString())
          
          const result = await insertQuery
          
          const endTime = Date.now()
          console.log('[markItem] Step 4: Insert query completed in', endTime - startTime, 'ms')
          console.log('[markItem] Insert result:', result)
          console.log('[markItem] Insert result type:', typeof result)
          console.log('[markItem] === DATABASE INSERT SECTION END ===')
          
          console.log(`[markItem] Successfully marked item ${input.itemId} as trash for user ${userId}`)
          return { 
            success: true,
            wasAdminCleaned,
            message: wasAdminCleaned 
              ? 'Note: This item was previously marked as clean by an admin, but your vote has been recorded.'
              : undefined
          }
          
        } catch (dbError: any) {
          console.log('[markItem] === DATABASE ERROR CAUGHT ===')
          console.error('[markItem] Database error details:', {
            errorType: dbError?.constructor?.name,
            code: dbError?.code,
            message: dbError?.message,
            detail: dbError?.detail,
            constraint: dbError?.constraint,
            table: dbError?.table,
            cause: dbError?.cause?.message,
            severity: dbError?.severity,
            routine: dbError?.routine,
            file: dbError?.file,
            line: dbError?.line,
            where: dbError?.where,
            schema: dbError?.schema,
            dataType: dbError?.dataType,
            column: dbError?.column,
            stack: dbError?.stack
          })
          
          // Log the full error object as well
          console.error('[markItem] Full database error object:', dbError)
          console.error('[markItem] Error cause object:', dbError?.cause)
          
          // PostgreSQL duplicate key error
          if (dbError?.code === '23505') {
            console.log(`[markItem] Duplicate key detected - Item ${input.itemId} already marked as trash for user ${userId}`)
            return { success: true } // Already marked, treat as success
          }
          
          // PostgreSQL foreign key error (user doesn't exist)
          if (dbError?.code === '23503') {
            console.error(`[markItem] Foreign key error - user ${userId} may not exist`)
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid user reference'
            })
          }
          
          // Log and re-throw other database errors
          console.error('[markItem] Unhandled database error - re-throwing')
          throw dbError
        }
        
      } catch (error: any) {
        console.log('[markItem] === INNER TRY-CATCH ERROR CAUGHT ===')
        // Log the full error details
        console.error('[markItem] Caught error in inner try-catch:', error)
        console.error('[markItem] Error stack:', error?.stack)
        console.error('[markItem] Error name:', error?.constructor?.name)
        console.error('[markItem] Error message:', error?.message)
        
        // If it's already a TRPC error, just re-throw
        if (error instanceof TRPCError) {
          console.log('[markItem] Re-throwing TRPC error')
          throw error
        }
        
        // Log unexpected errors with full context
        console.error('[markItem] Unexpected error in inner catch:', {
          errorType: error?.constructor?.name,
          message: error?.message,
          code: error?.code,
          userId: userId,
          itemId: input?.itemId,
          itemName: input?.itemName,
          errorString: String(error)
        })
        
        // Return generic error to client
        console.log('[markItem] Creating generic TRPC error for client')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark item as trash. Please try again.'
        })
      }
      } catch (outerError: any) {
        console.log('[markItem] === OUTER TRY-CATCH ERROR CAUGHT ===')
        // Catch ANY error at the top level
        console.error('[markItem] OUTER ERROR CAUGHT:', outerError)
        console.error('[markItem] OUTER ERROR STACK:', outerError?.stack)
        console.error('[markItem] OUTER ERROR NAME:', outerError?.constructor?.name)
        console.error('[markItem] OUTER ERROR MESSAGE:', outerError?.message)
        console.error('[markItem] OUTER ERROR CODE:', outerError?.code)
        
        // If it's already a TRPC error, re-throw it
        if (outerError instanceof TRPCError) {
          console.log('[markItem] Re-throwing TRPC error from outer catch')
          throw outerError
        }
        
        // Otherwise create a generic error
        console.log('[markItem] Creating generic error from outer catch')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unexpected error in markItem: ${outerError?.message || 'Unknown error'}`
        })
      }
    }),

  // Unmark an item as trash
  unmarkItem: protectedProcedure
    .input(z.object({
      itemId: z.number().positive('Item ID must be positive')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[unmarkItem] User ${ctx.user.id} unmarking item ${input.itemId}`)
        
        const result = await db
          .delete(userTrashVotes)
          .where(and(
            eq(userTrashVotes.userId, ctx.user.id),
            eq(userTrashVotes.itemId, input.itemId)
          ))
        
        console.log(`[unmarkItem] Successfully unmarked item ${input.itemId}`)
        
        return { success: true }
      } catch (error) {
        console.error('[unmarkItem] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unmark item as trash',
          cause: error
        })
      }
    }),

  // Get global trash statistics for admin
  getGlobalTrashStats: adminProcedure
    .query(async () => {
      try {
        console.log('[getGlobalTrashStats] Fetching global trash statistics')
        
        // Get total users
        const totalUsersResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
        
        const totalUsers = totalUsersResult[0]?.count || 0
        
        // Get all items with trash votes, ordered by percentage desc
        const trashStatsResult = await db
          .select({
            itemId: userTrashVotes.itemId,
            itemName: userTrashVotes.itemName,
            trashCount: sql<number>`count(*)::int`
          })
          .from(userTrashVotes)
          .groupBy(userTrashVotes.itemId, userTrashVotes.itemName)
          .orderBy(sql`count(*) DESC`)
        
        // Calculate percentages
        const itemsWithTrash = trashStatsResult.map(item => ({
          ...item,
          trashPercentage: totalUsers > 0 ? (item.trashCount / totalUsers) * 100 : 0
        }))
        
        console.log(`[getGlobalTrashStats] Returning ${itemsWithTrash.length} items with trash votes`)
        
        return {
          totalUsers,
          itemsWithTrash
        }
      } catch (error) {
        console.error('[getGlobalTrashStats] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch global trash statistics',
          cause: error
        })
      }
    }),

  // Admin: Clear all votes for an item but allow re-voting
  clearVotesAllowRevote: adminProcedure
    .input(z.object({
      itemId: z.number().positive('Item ID must be positive')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[clearVotesAllowRevote] Admin ${ctx.user.id} clearing votes for item ${input.itemId} (re-voting allowed)`)
        
        // Delete all votes for this item
        await db
          .delete(userTrashVotes)
          .where(eq(userTrashVotes.itemId, input.itemId))
        
        // Remove from admin clean table (allows re-voting)
        await db
          .delete(itemAdminClean)
          .where(eq(itemAdminClean.itemId, input.itemId))
        
        console.log(`[clearVotesAllowRevote] Successfully cleared votes for item ${input.itemId}, re-voting allowed`)
        return { success: true }
      } catch (error) {
        console.error('[clearVotesAllowRevote] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear votes',
          cause: error
        })
      }
    }),
  
  // Admin: Block all future votes for an item (mark as clean permanently)
  blockVoting: adminProcedure
    .input(z.object({
      itemId: z.number().positive('Item ID must be positive')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[blockVoting] Admin ${ctx.user.id} blocking all future votes for item ${input.itemId}`)
        
        // Delete all existing votes
        await db
          .delete(userTrashVotes)
          .where(eq(userTrashVotes.itemId, input.itemId))
        
        // Mark as admin cleaned (blocks future votes)
        await db
          .insert(itemAdminClean)
          .values({
            itemId: input.itemId,
            cleanedBy: ctx.user.id
          })
          .onConflictDoUpdate({
            target: itemAdminClean.itemId,
            set: {
              cleanedBy: ctx.user.id,
              cleanedAt: sql`NOW()`
            }
          })
        
        console.log(`[blockVoting] Successfully blocked all future votes for item ${input.itemId}`)
        return { success: true }
      } catch (error) {
        console.error('[blockVoting] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to block voting',
          cause: error
        })
      }
    }),

  // Admin: Clear all trash votes for an item (legacy - keep for compatibility)
  clearAllVotes: adminProcedure
    .input(z.object({
      itemId: z.number().positive('Item ID must be positive')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[clearAllVotes] Admin ${ctx.user.id} clearing all trash votes for item ${input.itemId}`)
        
        // Delete all votes for this item
        await db
          .delete(userTrashVotes)
          .where(eq(userTrashVotes.itemId, input.itemId))
        
        // Mark as admin cleaned
        await db
          .insert(itemAdminClean)
          .values({
            itemId: input.itemId,
            cleanedBy: ctx.user.id
          })
          .onConflictDoUpdate({
            target: itemAdminClean.itemId,
            set: {
              cleanedBy: ctx.user.id,
              cleanedAt: sql`NOW()`
            }
          })
        
        console.log(`[clearAllVotes] Successfully cleared all votes for item ${input.itemId}`)
        
        return { success: true }
      } catch (error) {
        console.error('[clearAllVotes] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear trash votes',
          cause: error
        })
      }
    })
})