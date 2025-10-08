import { z } from 'zod'
import { protectedProcedure, router } from './trpc.js'
import { db } from '../db/index.js'
import { userTransactions } from '../db/schema.js'
import { eq, desc, sql, and, gte } from 'drizzle-orm'

export const transactionsRouter = router({
  // Get user's transactions with pagination
  getTransactions: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      
      const transactions = await db
        .select()
        .from(userTransactions)
        .where(eq(userTransactions.userId, userId))
        .orderBy(desc(userTransactions.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      return transactions
    }),

  // Get user's trading stats
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.userId
      
      const stats = await db
        .select({
          totalProfit: sql<number>`COALESCE(SUM(${userTransactions.profit}), 0)`,
          totalTransactions: sql<number>`COUNT(*)`,
          totalVolume: sql<number>`COALESCE(SUM(${userTransactions.quantity} * ${userTransactions.price}), 0)`,
          avgProfit: sql<number>`COALESCE(AVG(${userTransactions.profit}), 0)`,
          bestTrade: sql<number>`COALESCE(MAX(${userTransactions.profit}), 0)`,
          worstTrade: sql<number>`COALESCE(MIN(${userTransactions.profit}), 0)`
        })
        .from(userTransactions)
        .where(eq(userTransactions.userId, userId))

      return stats[0] || {
        totalProfit: 0,
        totalTransactions: 0,
        totalVolume: 0,
        avgProfit: 0,
        bestTrade: 0,
        worstTrade: 0
      }
    }),

  // Get profit over time for charts
  getProfitOverTime: protectedProcedure
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

  // Add a new transaction
  addTransaction: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      itemName: z.string(),
      transactionType: z.enum(['buy', 'sell']),
      quantity: z.number().int().positive(),
      price: z.number().int().positive(),
      profit: z.number().int().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      
      const transaction = await db
        .insert(userTransactions)
        .values({
          userId,
          itemId: input.itemId,
          itemName: input.itemName,
          transactionType: input.transactionType,
          quantity: input.quantity,
          price: input.price,
          profit: input.profit || 0,
          notes: input.notes
        })
        .returning()

      return transaction[0]
    }),

  // Delete a transaction
  deleteTransaction: protectedProcedure
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

  // Get recent transactions for dashboard
  getRecentTransactions: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(5)
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.userId
      
      const transactions = await db
        .select()
        .from(userTransactions)
        .where(eq(userTransactions.userId, userId))
        .orderBy(desc(userTransactions.createdAt))
        .limit(input.limit)

      return transactions
    })
})