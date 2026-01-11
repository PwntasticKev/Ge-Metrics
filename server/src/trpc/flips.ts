import { z } from 'zod'
import { router, subscribedProcedure } from './trpc.js'
import { db } from '../db/index.js'
import { userTransactions } from '../db/schema.js'
import { eq, desc, sql, and, gte } from 'drizzle-orm'

export const flipsRouter = router({
  // Get user's flips with pagination
  getFlips: subscribedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      
      const flips = await db
        .select()
        .from(userTransactions)
        .where(eq(userTransactions.userId, userId))
        .orderBy(desc(userTransactions.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      return flips
    }),

  // Get user's flipping stats
  getFlipStats: subscribedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.userId
      
      const stats = await db
        .select({
          totalProfit: sql<number>`COALESCE(SUM(${userTransactions.profit}), 0)`,
          totalFlips: sql<number>`COUNT(*)`,
          totalVolume: sql<number>`COALESCE(SUM(${userTransactions.quantity} * ${userTransactions.price}), 0)`,
          avgProfit: sql<number>`COALESCE(AVG(${userTransactions.profit}), 0)`,
          bestFlip: sql<number>`COALESCE(MAX(${userTransactions.profit}), 0)`,
          worstFlip: sql<number>`COALESCE(MIN(${userTransactions.profit}), 0)`
        })
        .from(userTransactions)
        .where(eq(userTransactions.userId, userId))

      return stats[0] || {
        totalProfit: 0,
        totalFlips: 0,
        totalVolume: 0,
        avgProfit: 0,
        bestFlip: 0,
        worstFlip: 0
      }
    }),

  // Get profit over time for charts
  getProfitOverTime: subscribedProcedure
    .input(z.object({
      days: z.number().min(7).max(365).default(30)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - input.days)
      
      const profitData = await db
        .select({
          date: sql<string>`DATE(${userTransactions.createdAt}) as date`,
          profit: sql<number>`COALESCE(SUM(${userTransactions.profit}), 0)`,
          transactions: sql<number>`COUNT(*)`
        })
        .from(userTransactions)
        .where(and(
          eq(userTransactions.userId, userId),
          gte(userTransactions.createdAt, daysAgo)
        ))
        .groupBy(sql`DATE(${userTransactions.createdAt})`)
        .orderBy(sql`DATE(${userTransactions.createdAt})`)

      return profitData
    }),

  // Add a new flip
  addFlip: subscribedProcedure
    .input(z.object({
      itemId: z.string(),
      itemName: z.string(),
      flipType: z.enum(['buy', 'sell']).optional().default('buy'),
      quantity: z.number().int().positive(),
      price: z.number().int().positive(),
      profit: z.number().int().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      
      const flip = await db
        .insert(userTransactions)
        .values({
          userId,
          itemId: input.itemId,
          itemName: input.itemName,
          transactionType: input.flipType,
          quantity: input.quantity,
          price: input.price,
          profit: input.profit || 0,
          notes: input.notes
        })
        .returning()

      return flip[0]
    }),

  // Update a flip
  updateFlip: subscribedProcedure
    .input(z.object({
      id: z.string(),
      itemId: z.string().optional(),
      itemName: z.string().optional(),
      flipType: z.enum(['buy', 'sell']).optional(),
      quantity: z.number().int().positive().optional(),
      price: z.number().int().positive().optional(),
      profit: z.number().int().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      const { id, ...updateData } = input
      
      // Convert flipType to transactionType for database
      const dbUpdateData: any = { ...updateData }
      if (updateData.flipType) {
        dbUpdateData.transactionType = updateData.flipType
        delete dbUpdateData.flipType
      }
      
      const flip = await db
        .update(userTransactions)
        .set(dbUpdateData)
        .where(and(
          eq(userTransactions.id, id),
          eq(userTransactions.userId, userId)
        ))
        .returning()

      return flip[0]
    }),

  // Delete a flip
  deleteFlip: subscribedProcedure
    .input(z.object({
      id: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      
      await db
        .delete(userTransactions)
        .where(and(
          eq(userTransactions.id, input.id),
          eq(userTransactions.userId, userId)
        ))

      return { success: true }
    }),

  // Get recent flips for dashboard
  getRecentFlips: subscribedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(5)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      
      const flips = await db
        .select()
        .from(userTransactions)
        .where(eq(userTransactions.userId, userId))
        .orderBy(desc(userTransactions.createdAt))
        .limit(input.limit)

      return flips
    })
})