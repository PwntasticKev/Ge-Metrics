import { z } from 'zod'
import { protectedProcedure, adminProcedure, router, publicProcedure, subscribedProcedure } from './trpc.js'
import { db } from '../db/index.js'
import { moneyMakingMethods, methodItems, users } from '../db/schema.js'
import { eq, desc, sql, and, count, inArray, or, like, isNotNull } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const moneyMakingMethodsRouter = router({
  // Get user's personal money making methods
  getUserMethods: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all')
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        let whereClause = eq(moneyMakingMethods.userId, userId)
        
        if (input.status !== 'all') {
          whereClause = and(whereClause, eq(moneyMakingMethods.status, input.status)) ?? whereClause
        }
        
        const userMethods = await db
          .select({
            id: moneyMakingMethods.id,
            methodName: moneyMakingMethods.methodName,
            description: moneyMakingMethods.description,
            category: moneyMakingMethods.category,
            difficulty: moneyMakingMethods.difficulty,
            profitPerHour: moneyMakingMethods.profitPerHour,
            status: moneyMakingMethods.status,
            isGlobal: moneyMakingMethods.isGlobal,
            rejectionReason: moneyMakingMethods.rejectionReason,
            requirements: moneyMakingMethods.requirements,
            createdAt: moneyMakingMethods.createdAt,
            updatedAt: moneyMakingMethods.updatedAt,
            items: sql<any[]>`
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', ${methodItems.id},
                    'itemId', ${methodItems.itemId},
                    'itemName', ${methodItems.itemName},
                    'type', ${methodItems.type},
                    'quantity', ${methodItems.quantity},
                    'priceType', ${methodItems.priceType},
                    'customPrice', ${methodItems.customPrice}
                  )
                  ORDER BY ${methodItems.sortOrder}, ${methodItems.createdAt}
                ) FILTER (WHERE ${methodItems.id} IS NOT NULL),
                '[]'::json
              )
            `
          })
          .from(moneyMakingMethods)
          .leftJoin(methodItems, eq(moneyMakingMethods.id, methodItems.methodId))
          .where(whereClause)
          .groupBy(
            moneyMakingMethods.id,
            moneyMakingMethods.methodName,
            moneyMakingMethods.description,
            moneyMakingMethods.category,
            moneyMakingMethods.difficulty,
            moneyMakingMethods.profitPerHour,
            moneyMakingMethods.status,
            moneyMakingMethods.isGlobal,
            moneyMakingMethods.rejectionReason,
            moneyMakingMethods.requirements,
            moneyMakingMethods.createdAt,
            moneyMakingMethods.updatedAt
          )
          .orderBy(desc(moneyMakingMethods.createdAt))
          .limit(input.limit)
          .offset(input.offset)

        return userMethods
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching user methods:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user methods.'
        })
      }
    }),

  // Get global (approved) money making methods
  getGlobalMethods: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(['profitPerHour', 'createdAt', 'methodName', 'category']).default('profitPerHour'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      category: z.enum(['all', 'skilling', 'pvm', 'merching']).default('all'),
      difficulty: z.enum(['all', 'easy', 'medium', 'hard', 'elite']).default('all'),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      try {
        let whereClause = and(
          eq(moneyMakingMethods.isGlobal, true),
          eq(moneyMakingMethods.status, 'approved')
        )

        // Add category filter
        if (input.category !== 'all') {
          whereClause = and(whereClause, eq(moneyMakingMethods.category, input.category))
        }

        // Add difficulty filter
        if (input.difficulty !== 'all') {
          whereClause = and(whereClause, eq(moneyMakingMethods.difficulty, input.difficulty))
        }

        // Add search filter
        if (input.search) {
          whereClause = and(
            whereClause,
            or(
              like(moneyMakingMethods.methodName, `%${input.search}%`),
              like(moneyMakingMethods.description, `%${input.search}%`)
            )
          )
        }

        const globalMethods = await db
          .select({
            id: moneyMakingMethods.id,
            userId: moneyMakingMethods.userId,
            methodName: moneyMakingMethods.methodName,
            description: moneyMakingMethods.description,
            category: moneyMakingMethods.category,
            difficulty: moneyMakingMethods.difficulty,
            profitPerHour: moneyMakingMethods.profitPerHour,
            requirements: moneyMakingMethods.requirements,
            createdAt: moneyMakingMethods.createdAt,
            username: users.username,
            items: sql<any[]>`
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', ${methodItems.id},
                    'itemId', ${methodItems.itemId},
                    'itemName', ${methodItems.itemName},
                    'type', ${methodItems.type},
                    'quantity', ${methodItems.quantity},
                    'priceType', ${methodItems.priceType},
                    'customPrice', ${methodItems.customPrice}
                  )
                  ORDER BY ${methodItems.sortOrder}, ${methodItems.createdAt}
                ) FILTER (WHERE ${methodItems.id} IS NOT NULL),
                '[]'::json
              )
            `
          })
          .from(moneyMakingMethods)
          .leftJoin(methodItems, eq(moneyMakingMethods.id, methodItems.methodId))
          .leftJoin(users, eq(moneyMakingMethods.userId, users.id))
          .where(whereClause)
          .groupBy(
            moneyMakingMethods.id,
            moneyMakingMethods.userId,
            moneyMakingMethods.methodName,
            moneyMakingMethods.description,
            moneyMakingMethods.category,
            moneyMakingMethods.difficulty,
            moneyMakingMethods.profitPerHour,
            moneyMakingMethods.requirements,
            moneyMakingMethods.createdAt,
            users.username
          )
          .orderBy(
            input.sortOrder === 'desc' 
              ? desc(input.sortBy === 'profitPerHour' ? moneyMakingMethods.profitPerHour :
                     input.sortBy === 'methodName' ? moneyMakingMethods.methodName :
                     input.sortBy === 'category' ? moneyMakingMethods.category :
                     moneyMakingMethods.createdAt)
              : (input.sortBy === 'profitPerHour' ? moneyMakingMethods.profitPerHour :
                 input.sortBy === 'methodName' ? moneyMakingMethods.methodName :
                 input.sortBy === 'category' ? moneyMakingMethods.category :
                 moneyMakingMethods.createdAt)
          )
          .limit(input.limit)
          .offset(input.offset)

        return globalMethods
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching global methods:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch global methods.'
        })
      }
    }),

  // Create new money making method
  createMethod: protectedProcedure
    .input(z.object({
      methodName: z.string().min(1).max(255),
      description: z.string().min(1).max(2000),
      category: z.enum(['skilling', 'pvm', 'merching']),
      difficulty: z.enum(['easy', 'medium', 'hard', 'elite']),
      profitPerHour: z.number().nonnegative(),
      requirements: z.object({
        skills: z.record(z.number()).optional(),
        quests: z.array(z.string()).optional(),
        items: z.array(z.string()).optional(),
        other: z.string().optional()
      }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        return await db.transaction(async (tx) => {
          // Create the method with user-provided profit per hour
          const newMethod = await tx
            .insert(moneyMakingMethods)
            .values({
              userId,
              methodName: input.methodName,
              description: input.description,
              category: input.category,
              difficulty: input.difficulty,
              profitPerHour: input.profitPerHour,
              requirements: input.requirements || {},
              status: 'pending'
            })
            .returning()

          return {
            method: newMethod[0],
            message: 'Money making method created successfully. It will be reviewed by an admin before appearing globally.'
          }
        })
      } catch (error) {
        console.error('[MoneyMakingMethods] Error creating method:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create money making method.'
        })
      }
    }),

  // Update user's method
  updateMethod: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      methodName: z.string().min(1).max(255),
      description: z.string().min(1).max(2000),
      category: z.enum(['skilling', 'pvm', 'merching']),
      difficulty: z.enum(['easy', 'medium', 'hard', 'elite']),
      profitPerHour: z.number().nonnegative(),
      requirements: z.object({
        skills: z.record(z.number()).optional(),
        quests: z.array(z.string()).optional(),
        items: z.array(z.string()).optional(),
        other: z.string().optional()
      }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        return await db.transaction(async (tx) => {
          // Check if method exists and belongs to user
          const existingMethod = await tx
            .select({ id: moneyMakingMethods.id })
            .from(moneyMakingMethods)
            .where(and(
              eq(moneyMakingMethods.id, input.id),
              eq(moneyMakingMethods.userId, userId)
            ))
            .limit(1)

          if (existingMethod.length === 0) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Method not found or access denied.'
            })
          }

          // Update the method
          const updatedMethod = await tx
            .update(moneyMakingMethods)
            .set({
              methodName: input.methodName,
              description: input.description,
              category: input.category,
              difficulty: input.difficulty,
              profitPerHour: input.profitPerHour,
              requirements: input.requirements || {},
              status: 'pending', // Reset to pending when updated
              isGlobal: false,   // Remove from global when updated
              rejectionReason: null,
              approvedBy: null,
              approvedAt: null,
              updatedAt: new Date()
            })
            .where(eq(moneyMakingMethods.id, input.id))
            .returning()

          return {
            method: updatedMethod[0],
            message: 'Method updated successfully. It will need re-approval before appearing globally.'
          }
        })
      } catch (error) {
        console.error('[MoneyMakingMethods] Error updating method:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update money making method.'
        })
      }
    }),

  // Delete user's method
  deleteMethod: protectedProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        const deletedMethod = await db
          .delete(moneyMakingMethods)
          .where(and(
            eq(moneyMakingMethods.id, input.id),
            eq(moneyMakingMethods.userId, userId)
          ))
          .returning()

        if (deletedMethod.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Method not found or access denied.'
          })
        }

        return { success: true, message: 'Method deleted successfully.' }
      } catch (error) {
        console.error('[MoneyMakingMethods] Error deleting method:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete money making method.'
        })
      }
    }),

  // ===== ADMIN ROUTES =====

  // Get all methods for admin review
  getAllMethodsForReview: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(['all', 'pending', 'approved', 'rejected']).default('pending')
    }))
    .query(async ({ input }) => {
      try {
        let whereClause = sql`1=1`
        
        if (input.status !== 'all') {
          whereClause = eq(moneyMakingMethods.status, input.status)
        }

        const allMethods = await db
          .select({
            id: moneyMakingMethods.id,
            userId: moneyMakingMethods.userId,
            methodName: moneyMakingMethods.methodName,
            description: moneyMakingMethods.description,
            category: moneyMakingMethods.category,
            difficulty: moneyMakingMethods.difficulty,
            profitPerHour: moneyMakingMethods.profitPerHour,
            status: moneyMakingMethods.status,
            isGlobal: moneyMakingMethods.isGlobal,
            rejectionReason: moneyMakingMethods.rejectionReason,
            approvedBy: moneyMakingMethods.approvedBy,
            approvedAt: moneyMakingMethods.approvedAt,
            requirements: moneyMakingMethods.requirements,
            createdAt: moneyMakingMethods.createdAt,
            updatedAt: moneyMakingMethods.updatedAt,
            username: users.username,
            items: sql<any[]>`
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', ${methodItems.id},
                    'itemId', ${methodItems.itemId},
                    'itemName', ${methodItems.itemName},
                    'type', ${methodItems.type},
                    'quantity', ${methodItems.quantity},
                    'priceType', ${methodItems.priceType},
                    'customPrice', ${methodItems.customPrice}
                  )
                  ORDER BY ${methodItems.sortOrder}, ${methodItems.createdAt}
                ) FILTER (WHERE ${methodItems.id} IS NOT NULL),
                '[]'::json
              )
            `
          })
          .from(moneyMakingMethods)
          .leftJoin(methodItems, eq(moneyMakingMethods.id, methodItems.methodId))
          .leftJoin(users, eq(moneyMakingMethods.userId, users.id))
          .where(whereClause)
          .groupBy(
            moneyMakingMethods.id,
            moneyMakingMethods.userId,
            moneyMakingMethods.methodName,
            moneyMakingMethods.description,
            moneyMakingMethods.category,
            moneyMakingMethods.difficulty,
            moneyMakingMethods.profitPerHour,
            moneyMakingMethods.status,
            moneyMakingMethods.isGlobal,
            moneyMakingMethods.rejectionReason,
            moneyMakingMethods.approvedBy,
            moneyMakingMethods.approvedAt,
            moneyMakingMethods.requirements,
            moneyMakingMethods.createdAt,
            moneyMakingMethods.updatedAt,
            users.username
          )
          .orderBy(desc(moneyMakingMethods.createdAt))
          .limit(input.limit)
          .offset(input.offset)

        return allMethods
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching methods for review:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch methods for review.'
        })
      }
    }),

  // Approve method (admin only)
  approveMethod: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      approvalNotes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const adminUserId = ctx.user.id

      try {
        const updatedMethod = await db
          .update(moneyMakingMethods)
          .set({
            status: 'approved',
            isGlobal: true,
            rejectionReason: null,
            approvedBy: adminUserId,
            approvedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(moneyMakingMethods.id, input.id))
          .returning()

        if (updatedMethod.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Method not found.'
          })
        }

        return {
          method: updatedMethod[0],
          message: 'Method approved and published globally.'
        }
      } catch (error) {
        console.error('[MoneyMakingMethods] Error approving method:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve method.'
        })
      }
    }),

  // Reject method (admin only)
  rejectMethod: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      rejectionReason: z.string().min(1).max(500)
    }))
    .mutation(async ({ input }) => {
      try {
        const updatedMethod = await db
          .update(moneyMakingMethods)
          .set({
            status: 'rejected',
            isGlobal: false,
            rejectionReason: input.rejectionReason,
            approvedBy: null,
            approvedAt: null,
            updatedAt: new Date()
          })
          .where(eq(moneyMakingMethods.id, input.id))
          .returning()

        if (updatedMethod.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Method not found.'
          })
        }

        return {
          method: updatedMethod[0],
          message: 'Method rejected with feedback sent to user.'
        }
      } catch (error) {
        console.error('[MoneyMakingMethods] Error rejecting method:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reject method.'
        })
      }
    }),

  // Delete method globally (admin only)
  deleteMethodGlobally: adminProcedure
    .input(z.object({
      id: z.string().uuid()
    }))
    .mutation(async ({ input }) => {
      try {
        const deletedMethod = await db
          .delete(moneyMakingMethods)
          .where(eq(moneyMakingMethods.id, input.id))
          .returning()

        if (deletedMethod.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Method not found.'
          })
        }

        return { success: true, message: 'Method deleted globally.' }
      } catch (error) {
        console.error('[MoneyMakingMethods] Error deleting method globally:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete method globally.'
        })
      }
    }),

  // Get pending methods (admin only)
  getPendingMethods: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      try {
        const pendingMethods = await db
          .select({
            id: moneyMakingMethods.id,
            userId: moneyMakingMethods.userId,
            methodName: moneyMakingMethods.methodName,
            description: moneyMakingMethods.description,
            category: moneyMakingMethods.category,
            difficulty: moneyMakingMethods.difficulty,
            profitPerHour: moneyMakingMethods.profitPerHour,
            status: moneyMakingMethods.status,
            isGlobal: moneyMakingMethods.isGlobal,
            rejectionReason: moneyMakingMethods.rejectionReason,
            requirements: moneyMakingMethods.requirements,
            createdAt: moneyMakingMethods.createdAt,
            updatedAt: moneyMakingMethods.updatedAt,
            username: users.username,
            userEmail: users.email
          })
          .from(moneyMakingMethods)
          .leftJoin(users, eq(moneyMakingMethods.userId, users.id))
          .where(eq(moneyMakingMethods.status, 'pending'))
          .orderBy(desc(moneyMakingMethods.createdAt))
          .limit(input.limit)
          .offset(input.offset)

        return pendingMethods
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching pending methods:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch pending methods.'
        })
      }
    }),

  // Get all methods (admin only)
  getAllMethods: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(100),
      offset: z.number().min(0).default(0),
      status: z.string().optional()
    }))
    .query(async ({ input }) => {
      try {
        let whereCondition = input.status ? eq(moneyMakingMethods.status, input.status) : undefined

        const query = db
          .select({
            id: moneyMakingMethods.id,
            userId: moneyMakingMethods.userId,
            methodName: moneyMakingMethods.methodName,
            description: moneyMakingMethods.description,
            category: moneyMakingMethods.category,
            difficulty: moneyMakingMethods.difficulty,
            profitPerHour: moneyMakingMethods.profitPerHour,
            status: moneyMakingMethods.status,
            isGlobal: moneyMakingMethods.isGlobal,
            rejectionReason: moneyMakingMethods.rejectionReason,
            requirements: moneyMakingMethods.requirements,
            createdAt: moneyMakingMethods.createdAt,
            updatedAt: moneyMakingMethods.updatedAt,
            username: users.username,
            userEmail: users.email
          })
          .from(moneyMakingMethods)
          .leftJoin(users, eq(moneyMakingMethods.userId, users.id))
          .$dynamic()

        const methods = await (whereCondition 
          ? query.where(whereCondition) 
          : query)
          .orderBy(desc(moneyMakingMethods.createdAt))
          .limit(input.limit)
          .offset(input.offset)

        return methods
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching all methods:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch all methods.'
        })
      }
    }),

  // Get admin statistics
  getAdminStats: adminProcedure
    .query(async () => {
      try {
        const [totalResult, pendingResult, approvedResult, rejectedResult] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(moneyMakingMethods),
          db.select({ count: sql<number>`count(*)` }).from(moneyMakingMethods).where(eq(moneyMakingMethods.status, 'pending')),
          db.select({ count: sql<number>`count(*)` }).from(moneyMakingMethods).where(eq(moneyMakingMethods.status, 'approved')),
          db.select({ count: sql<number>`count(*)` }).from(moneyMakingMethods).where(eq(moneyMakingMethods.status, 'rejected'))
        ])

        return {
          total: totalResult[0]?.count || 0,
          pending: pendingResult[0]?.count || 0,
          approved: approvedResult[0]?.count || 0,
          rejected: rejectedResult[0]?.count || 0
        }
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching admin stats:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch admin statistics.'
        })
      }
    }),

  // Calculate real-time profit for a method based on current item prices
  calculateRealTimeProfit: subscribedProcedure
    .input(z.object({
      itemDependencies: z.array(z.object({
        itemId: z.number(),
        quantity: z.number().positive(),
        type: z.enum(['input', 'output']).default('input') // input = cost, output = revenue
      })),
      conversionCosts: z.number().optional().default(0),
      timeHours: z.number().positive().optional().default(1) // Assume per hour by default
    }))
    .query(async ({ input }) => {
      try {
        // This would integrate with the existing item pricing system
        // For now, we'll return a placeholder calculation
        // In a real implementation, this would fetch current prices from the items API

        let totalCosts = input.conversionCosts || 0
        let totalRevenue = 0

        // Calculate costs and revenue based on item dependencies
        for (const dep of input.itemDependencies) {
          // Placeholder: In real implementation, fetch current prices
          // const currentPrice = await getCurrentItemPrice(dep.itemId)
          const placeholderPrice = dep.itemId * 10 // Placeholder calculation
          
          if (dep.type === 'input') {
            totalCosts += placeholderPrice * dep.quantity
          } else {
            totalRevenue += placeholderPrice * dep.quantity
          }
        }

        const profit = totalRevenue - totalCosts
        const profitPerHour = profit / input.timeHours

        return {
          totalCosts,
          totalRevenue,
          profit,
          profitPerHour,
          margin: totalCosts > 0 ? (profit / totalCosts) * 100 : 0,
          calculatedAt: new Date()
        }
      } catch (error) {
        console.error('[MoneyMakingMethods] Error calculating real-time profit:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to calculate profit.'
        })
      }
    }),

  // Update profit calculations for all methods (admin only - for batch updates)
  recalculateProfits: adminProcedure
    .mutation(async () => {
      try {
        // This would recalculate profits for all methods based on current item prices
        // Placeholder implementation
        console.log('[MoneyMakingMethods] Recalculating profits for all methods...')
        
        return {
          success: true,
          message: 'Profit calculations updated for all methods',
          updatedCount: 0 // Placeholder
        }
      } catch (error) {
        console.error('[MoneyMakingMethods] Error recalculating profits:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to recalculate profits.'
        })
      }
    })
})