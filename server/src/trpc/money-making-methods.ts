import { z } from 'zod'
import { protectedProcedure, adminProcedure, router, publicProcedure, subscribedProcedure } from './trpc.js'
import { db } from '../db/index.js'
import { moneyMakingMethods, methodItems, users, methodVotes } from '../db/schema.js'
import { eq, desc, sql, and, count, inArray, or, like, isNotNull } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const moneyMakingMethodsRouter = router({
  // Get user's personal money making methods
  getUserMethods: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(['all', 'pending', 'approved', 'rejected', 'private']).default('all')
    }))
    .query(async ({ input }) => {
      // Return test data without any database calls for now
      console.log('[MoneyMakingMethods] Returning test data - no database calls')
      return [{
        id: 'test-1',
        methodName: 'Test Method',
        description: 'Test Description', 
        category: 'skilling',
        difficulty: 'easy',
        profitPerHour: '1000000',
        status: 'approved',
        isGlobal: false,
        rejectionReason: null,
        requirements: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        items: []
      }]
    }),

  // Get global (approved) money making methods
  getGlobalMethods: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(['profitPerHour', 'createdAt', 'methodName', 'category']).default('profitPerHour'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      category: z.enum(['skilling', 'pvm', 'merching']).optional(),
      difficulty: z.enum(['easy', 'medium', 'hard', 'elite']).optional(),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      // Return test global methods data
      console.log('[MoneyMakingMethods] Returning test global methods - no database calls')
      
      const testMethods = [
        {
          id: 'global-1',
          userId: 1,
          methodName: 'Dragon Bone Grinding',
          description: 'Grind dragon bones for massive prayer XP and decent profit',
          category: 'skilling',
          difficulty: 'easy',
          profitPerHour: 2500000,
          requirements: { skills: { prayer: 1 } },
          createdAt: new Date('2024-01-01'),
          username: 'test_user',
          items: []
        },
        {
          id: 'global-2', 
          userId: 2,
          methodName: 'Zulrah Farming',
          description: 'Farm Zulrah for high-value drops and consistent profit',
          category: 'pvm',
          difficulty: 'hard',
          profitPerHour: 4200000,
          requirements: { skills: { ranged: 75, magic: 75 } },
          createdAt: new Date('2024-01-02'),
          username: 'pvm_master',
          items: []
        },
        {
          id: 'global-3',
          userId: 3, 
          methodName: 'Flipping Bandos Items',
          description: 'Buy and sell Bandos gear for quick flips',
          category: 'merching',
          difficulty: 'medium',
          profitPerHour: 1800000,
          requirements: { other: '50M+ starting capital recommended' },
          createdAt: new Date('2024-01-03'),
          username: 'merchant_pro',
          items: []
        }
      ]

      // Apply basic filtering
      let filteredMethods = testMethods
      
      if (input.category) {
        filteredMethods = filteredMethods.filter(m => m.category === input.category)
      }
      
      if (input.difficulty) {
        filteredMethods = filteredMethods.filter(m => m.difficulty === input.difficulty)
      }
      
      if (input.search) {
        const search = input.search.toLowerCase()
        filteredMethods = filteredMethods.filter(m => 
          m.methodName.toLowerCase().includes(search) || 
          m.description.toLowerCase().includes(search)
        )
      }

      // Apply sorting
      filteredMethods.sort((a, b) => {
        let aVal, bVal
        switch (input.sortBy) {
          case 'profitPerHour':
            aVal = a.profitPerHour
            bVal = b.profitPerHour
            break
          case 'methodName':
            aVal = a.methodName
            bVal = b.methodName
            break
          case 'category':
            aVal = a.category
            bVal = b.category
            break
          default:
            aVal = a.createdAt
            bVal = b.createdAt
        }
        
        if (input.sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1
        } else {
          return aVal > bVal ? 1 : -1
        }
      })

      // Apply pagination
      const start = input.offset
      const end = start + input.limit
      const paginatedMethods = filteredMethods.slice(start, end)

      return paginatedMethods
    }),

  // Create new money making method
  createMethod: protectedProcedure
    .input(z.object({
      methodName: z.string().min(1).max(255),
      description: z.string().min(1).max(2000),
      category: z.enum(['skilling', 'pvm', 'merching']),
      difficulty: z.enum(['easy', 'medium', 'hard', 'elite']),
      profitPerHour: z.number().nonnegative(),
      isPrivate: z.boolean().optional().default(false), // New field for private/public
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
          // If private, don't submit for approval
          const newMethod = await tx
            .insert(moneyMakingMethods)
            .values({
              userId,
              methodName: input.methodName,
              description: input.description,
              category: input.category,
              difficulty: input.difficulty,
              profitPerHour: String(input.profitPerHour),
              requirements: input.requirements || {},
              status: input.isPrivate ? 'private' : 'pending',
              isGlobal: false // Never global on creation
            })
            .returning()

          return {
            method: newMethod[0],
            message: input.isPrivate 
              ? 'Private money making method created successfully. Only you can see this method.'
              : 'Money making method created successfully. It will be reviewed by an admin before appearing globally.'
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
      isPrivate: z.boolean().optional(), // Toggle private/public
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
          // Determine new status based on isPrivate
          let newStatus: string
          let message: string
          
          if (input.isPrivate === true) {
            newStatus = 'private'
            message = 'Method updated and set to private. Only you can see this method.'
          } else if (input.isPrivate === false) {
            newStatus = 'pending'
            message = 'Method updated and submitted for approval. It will be reviewed by an admin before appearing globally.'
          } else {
            // Keep existing status if not changing privacy
            const [existing] = await tx
              .select({ status: moneyMakingMethods.status })
              .from(moneyMakingMethods)
              .where(eq(moneyMakingMethods.id, input.id))
              .limit(1)
            
            newStatus = existing.status === 'private' ? 'private' : 'pending'
            message = existing.status === 'private' 
              ? 'Private method updated successfully.'
              : 'Method updated successfully. It will need re-approval before appearing globally.'
          }

          const updatedMethod = await tx
            .update(moneyMakingMethods)
            .set({
              methodName: input.methodName,
              description: input.description,
              category: input.category,
              difficulty: input.difficulty,
              profitPerHour: String(input.profitPerHour),
              requirements: input.requirements || {},
              status: newStatus,
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
            message
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

  // Get admin statistics (admin only - includes all stats)
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

  // Get global statistics (public - only approved methods)
  getGlobalStats: publicProcedure
    .query(async () => {
      try {
        const [approvedResult] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(moneyMakingMethods)
            .where(and(
              eq(moneyMakingMethods.status, 'approved'),
              eq(moneyMakingMethods.isGlobal, true)
            ))
        ])

        // Count by category for public display
        const categoryResults = await db
          .select({
            category: moneyMakingMethods.category,
            count: sql<number>`count(*)`
          })
          .from(moneyMakingMethods)
          .where(and(
            eq(moneyMakingMethods.status, 'approved'),
            eq(moneyMakingMethods.isGlobal, true)
          ))
          .groupBy(moneyMakingMethods.category)

        const categoryStats = categoryResults.reduce((acc, row) => {
          acc[row.category] = row.count || 0
          return acc
        }, {} as Record<string, number>)

        return {
          approved: approvedResult[0]?.count || 0,
          skilling: categoryStats.skilling || 0,
          pvm: categoryStats.pvm || 0,
          merching: categoryStats.merching || 0
        }
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching global stats:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch global statistics.'
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
    }),

  // ===== VOTING SYSTEM =====

  // Vote on a method
  voteOnMethod: protectedProcedure
    .input(z.object({
      methodId: z.string().uuid(),
      voteType: z.enum(['thumbsup', 'thumbsdown', 'heart', 'fire', 'star'])
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        return await db.transaction(async (tx) => {
          // Check if method exists and is viewable
          const [method] = await tx
            .select({ 
              id: moneyMakingMethods.id, 
              status: moneyMakingMethods.status,
              userId: moneyMakingMethods.userId
            })
            .from(moneyMakingMethods)
            .where(eq(moneyMakingMethods.id, input.methodId))
            .limit(1)

          if (!method) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Method not found'
            })
          }

          // Check if user can vote on this method
          // Can vote on: approved methods, or own private methods
          if (method.status !== 'approved' && method.status !== 'private') {
            if (method.userId !== userId) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Cannot vote on pending or rejected methods'
              })
            }
          }

          // Upsert vote (update if exists, insert if not)
          const existingVote = await tx
            .select()
            .from(methodVotes)
            .where(and(
              eq(methodVotes.userId, userId),
              eq(methodVotes.methodId, input.methodId)
            ))
            .limit(1)

          let voteResult
          if (existingVote.length > 0) {
            // Update existing vote
            voteResult = await tx
              .update(methodVotes)
              .set({
                voteType: input.voteType,
                updatedAt: new Date()
              })
              .where(and(
                eq(methodVotes.userId, userId),
                eq(methodVotes.methodId, input.methodId)
              ))
              .returning()
          } else {
            // Create new vote
            voteResult = await tx
              .insert(methodVotes)
              .values({
                userId,
                methodId: input.methodId,
                voteType: input.voteType
              })
              .returning()
          }

          // Get updated vote counts
          const voteCounts = await tx
            .select({
              voteType: methodVotes.voteType,
              count: sql<number>`count(*)`
            })
            .from(methodVotes)
            .where(eq(methodVotes.methodId, input.methodId))
            .groupBy(methodVotes.voteType)

          // Format vote counts
          const formattedCounts = {
            thumbsup: 0,
            thumbsdown: 0,
            heart: 0,
            fire: 0,
            star: 0
          }

          voteCounts.forEach(vc => {
            (formattedCounts as Record<string, number>)[vc.voteType] = vc.count || 0
          })

          // Update method with new vote counts
          await tx
            .update(moneyMakingMethods)
            .set({
              voteCounts: formattedCounts
            })
            .where(eq(moneyMakingMethods.id, input.methodId))

          return {
            vote: voteResult[0],
            voteCounts: formattedCounts,
            message: 'Vote recorded successfully'
          }
        })
      } catch (error) {
        console.error('[MoneyMakingMethods] Error voting on method:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to record vote'
        })
      }
    }),

  // Remove vote from a method
  removeVote: protectedProcedure
    .input(z.object({
      methodId: z.string().uuid()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        return await db.transaction(async (tx) => {
          // Delete the vote
          const deleted = await tx
            .delete(methodVotes)
            .where(and(
              eq(methodVotes.userId, userId),
              eq(methodVotes.methodId, input.methodId)
            ))
            .returning()

          if (deleted.length === 0) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Vote not found'
            })
          }

          // Get updated vote counts
          const voteCounts = await tx
            .select({
              voteType: methodVotes.voteType,
              count: sql<number>`count(*)`
            })
            .from(methodVotes)
            .where(eq(methodVotes.methodId, input.methodId))
            .groupBy(methodVotes.voteType)

          // Format vote counts
          const formattedCounts = {
            thumbsup: 0,
            thumbsdown: 0,
            heart: 0,
            fire: 0,
            star: 0
          }

          voteCounts.forEach(vc => {
            (formattedCounts as Record<string, number>)[vc.voteType] = vc.count || 0
          })

          // Update method with new vote counts
          await tx
            .update(moneyMakingMethods)
            .set({
              voteCounts: formattedCounts
            })
            .where(eq(moneyMakingMethods.id, input.methodId))

          return {
            voteCounts: formattedCounts,
            message: 'Vote removed successfully'
          }
        })
      } catch (error) {
        console.error('[MoneyMakingMethods] Error removing vote:', error)
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove vote'
        })
      }
    }),

  // Get votes for a method (who voted what)
  getMethodVotes: publicProcedure
    .input(z.object({
      methodId: z.string().uuid()
    }))
    .query(async ({ input }) => {
      try {
        const votes = await db
          .select({
            voteType: methodVotes.voteType,
            userId: methodVotes.userId,
            username: users.username,
            avatar: users.avatar,
            votedAt: methodVotes.createdAt
          })
          .from(methodVotes)
          .leftJoin(users, eq(methodVotes.userId, users.id))
          .where(eq(methodVotes.methodId, input.methodId))
          .orderBy(desc(methodVotes.createdAt))

        // Group votes by type
        const groupedVotes = votes.reduce((acc, vote) => {
          if (!acc[vote.voteType]) {
            acc[vote.voteType] = []
          }
          acc[vote.voteType].push({
            userId: vote.userId,
            username: vote.username,
            avatar: vote.avatar,
            votedAt: vote.votedAt
          })
          return acc
        }, {} as Record<string, any[]>)

        return groupedVotes
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching method votes:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch votes'
        })
      }
    }),

  // Get user's votes for multiple methods
  getUserVotes: protectedProcedure
    .input(z.object({
      methodIds: z.array(z.string().uuid())
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        const userVotes = await db
          .select({
            methodId: methodVotes.methodId,
            voteType: methodVotes.voteType
          })
          .from(methodVotes)
          .where(and(
            eq(methodVotes.userId, userId),
            inArray(methodVotes.methodId, input.methodIds)
          ))

        // Convert to map for easy lookup
        const votesMap = userVotes.reduce((acc, vote) => {
          acc[vote.methodId] = vote.voteType
          return acc
        }, {} as Record<string, string>)

        return votesMap
      } catch (error) {
        console.error('[MoneyMakingMethods] Error fetching user votes:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user votes'
        })
      }
    })
})