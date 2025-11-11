import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'
import { db, osrsAccounts, tradeEvents, tradeMatches, openPositions, allTradesAdmin, users } from '../db/index.js'
import { protectedProcedure, router } from './trpc.js'
import { securityEvents } from '../db/schema.js'

// Rate limiting: Track trades per user per day
const RATE_LIMIT_PER_DAY = 5000

// Trade input schema
const tradeInputSchema = z.object({
  runeliteEventId: z.string().min(1),
  itemId: z.number().int().positive(),
  itemName: z.string().min(1),
  offerType: z.enum(['buy', 'sell']),
  price: z.number().int().positive(),
  quantity: z.number().int().positive(),
  filledQuantity: z.number().int().nonnegative(),
  remainingQuantity: z.number().int().nonnegative(),
  status: z.enum(['pending', 'completed', 'canceled']),
  timestamp: z.string().datetime()
})

const batchTradeInputSchema = z.object({
  runeliteClientId: z.string().uuid(),
  osrsUsername: z.string().optional(),
  trades: z.array(tradeInputSchema).min(1).max(100) // Max 100 trades per batch
})

/**
 * Check rate limit for user (5000 trades per day)
 */
async function checkRateLimit(userId: number): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const count = await db.select({ count: sql<number>`count(*)` })
    .from(tradeEvents)
    .where(
      and(
        eq(tradeEvents.userId, userId),
        sql`${tradeEvents.createdAt} >= ${today}`
      )
    )
  
  const dailyCount = Number(count[0]?.count || 0)
  
  if (dailyCount >= RATE_LIMIT_PER_DAY) {
    // Log security event
    await db.insert(securityEvents).values({
      userId,
      eventType: 'rate_limit_exceeded',
      severity: 'medium',
      details: {
        dailyCount,
        limit: RATE_LIMIT_PER_DAY,
        endpoint: 'runelite.trades.submit'
      }
    }).catch(() => {}) // Don't fail if logging fails
    
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Maximum ${RATE_LIMIT_PER_DAY} trades per day.`
    })
  }
}

/**
 * Get or create OSRS account for user and client
 */
async function getOrCreateOsrsAccount(
  userId: number,
  runeliteClientId: string,
  osrsUsername?: string
): Promise<{ id: string }> {
  // Try to find existing account
  const existing = await db.select()
    .from(osrsAccounts)
    .where(
      and(
        eq(osrsAccounts.userId, userId),
        eq(osrsAccounts.runeliteClientId, runeliteClientId)
      )
    )
    .limit(1)
  
  if (existing.length > 0) {
    // Update username if provided and different
    if (osrsUsername && existing[0].osrsUsername !== osrsUsername) {
      await db.update(osrsAccounts)
        .set({ osrsUsername, updatedAt: new Date() })
        .where(eq(osrsAccounts.id, existing[0].id))
    }
    return { id: existing[0].id }
  }
  
  // Create new account
  const [newAccount] = await db.insert(osrsAccounts).values({
    userId,
    runeliteClientId,
    osrsUsername: osrsUsername || null
  }).returning({ id: osrsAccounts.id })
  
  return { id: newAccount.id }
}

/**
 * Process FIFO matching for sell events
 */
async function processFifoMatching(
  sellEvent: typeof tradeEvents.$inferSelect,
  osrsAccountId: string
): Promise<void> {
  const { itemId, filledQuantity, price: sellPrice, id: sellEventId, userId } = sellEvent
  
  if (filledQuantity === 0) {
    return // Nothing to match
  }
  
  // Find open positions (unmatched buy orders) for this item and account (FIFO order)
  // Order by the timestamp of the buy event (oldest first)
  const openPositionsList = await db.select()
    .from(openPositions)
    .where(
      and(
        eq(openPositions.osrsAccountId, osrsAccountId),
        eq(openPositions.itemId, itemId)
      )
    )
    .limit(100) // Reasonable limit
  
  // Get the buy events to sort by timestamp (FIFO)
  const positionIds = openPositionsList.map(p => p.buyEventId)
  if (positionIds.length === 0) {
    return // No open positions to match
  }
  
  const buyEvents = await db.select()
    .from(tradeEvents)
    .where(
      and(
        inArray(tradeEvents.id, positionIds),
        eq(tradeEvents.offerType, 'buy')
      )
    )
  
  // Create a map of buyEventId -> timestamp for sorting
  const buyEventMap = new Map(buyEvents.map(b => [b.id, b.timestamp]))
  
  // Sort positions by buy event timestamp (FIFO: oldest first)
  const sortedPositions = openPositionsList.sort((a, b) => {
    const timestampA = buyEventMap.get(a.buyEventId)?.getTime() || 0
    const timestampB = buyEventMap.get(b.buyEventId)?.getTime() || 0
    return timestampA - timestampB
  })
  
  let remainingSellQuantity = filledQuantity
  
  for (const position of sortedPositions) {
    if (remainingSellQuantity <= 0) break
    
    const availableQuantity = position.quantity
    
    if (availableQuantity <= 0) continue
    
    // Match what we can
    const matchQuantity = Math.min(remainingSellQuantity, availableQuantity)
    const buyPrice = position.averageBuyPrice
    const profit = (sellPrice - buyPrice) * matchQuantity
    const profitAfterTax = Math.floor(profit * 0.98) // 2% GE tax
    const roiPercentage = buyPrice > 0 ? Math.floor((profit / buyPrice) * 10000) : 0 // Percentage * 100
    
    // Create trade match
    await db.insert(tradeMatches).values({
      userId,
      osrsAccountId,
      itemId,
      buyEventId: position.buyEventId,
      sellEventId,
      buyPrice,
      sellPrice,
      quantity: matchQuantity,
      profit,
      profitAfterTax,
      roiPercentage
    })
    
    // Update open position
    const newQuantity = position.quantity - matchQuantity
    if (newQuantity > 0) {
      await db.update(openPositions)
        .set({ quantity: newQuantity, updatedAt: new Date() })
        .where(eq(openPositions.id, position.id))
    } else {
      await db.delete(openPositions)
        .where(eq(openPositions.id, position.id))
    }
    
    remainingSellQuantity -= matchQuantity
  }
}

/**
 * Process a single trade event
 */
async function processTradeEvent(
  trade: z.infer<typeof tradeInputSchema>,
  osrsAccountId: string,
  userId: number
): Promise<void> {
  // Check for duplicate event
  const existing = await db.select()
    .from(tradeEvents)
    .where(eq(tradeEvents.runeliteEventId, trade.runeliteEventId))
    .limit(1)
  
  if (existing.length > 0) {
    // Update existing event (for partial fills)
    const existingEvent = existing[0]
    
    await db.update(tradeEvents)
      .set({
        filledQuantity: trade.filledQuantity,
        remainingQuantity: trade.remainingQuantity,
        status: trade.status,
        updatedAt: new Date()
      })
      .where(eq(tradeEvents.id, existingEvent.id))
    
    // If status changed to completed or canceled, and it's a sell, process matching
    if (trade.offerType === 'sell' && 
        (trade.status === 'completed' || trade.status === 'canceled') &&
        existingEvent.status === 'pending') {
      // Convert trade timestamp string to Date for matching
      const updatedEvent = {
        ...existingEvent,
        filledQuantity: trade.filledQuantity,
        remainingQuantity: trade.remainingQuantity,
        status: trade.status,
        timestamp: new Date(trade.timestamp)
      }
      await processFifoMatching(updatedEvent, osrsAccountId)
    }
    
    return
  }
  
  // Create new trade event
  const timestamp = new Date(trade.timestamp)
  
  const [newEvent] = await db.insert(tradeEvents).values({
    osrsAccountId,
    userId,
    itemId: trade.itemId,
    itemName: trade.itemName,
    offerType: trade.offerType,
    price: trade.price,
    quantity: trade.quantity,
    filledQuantity: trade.filledQuantity,
    remainingQuantity: trade.remainingQuantity,
    status: trade.status,
    runeliteEventId: trade.runeliteEventId,
    timestamp
  }).returning()
  
  // If it's a completed buy, create/open position
  if (trade.offerType === 'buy' && trade.status === 'completed' && trade.filledQuantity > 0) {
    // Check if position already exists
    const existingPosition = await db.select()
      .from(openPositions)
      .where(
        and(
          eq(openPositions.osrsAccountId, osrsAccountId),
          eq(openPositions.itemId, trade.itemId),
          eq(openPositions.buyEventId, newEvent.id)
        )
      )
      .limit(1)
    
    if (existingPosition.length === 0) {
      await db.insert(openPositions).values({
        userId,
        osrsAccountId,
        itemId: trade.itemId,
        buyEventId: newEvent.id,
        quantity: trade.filledQuantity,
        averageBuyPrice: trade.price
      })
    }
  }
  
  // If it's a completed/canceled sell, process FIFO matching
  if (trade.offerType === 'sell' && 
      (trade.status === 'completed' || trade.status === 'canceled') &&
      trade.filledQuantity > 0) {
    await processFifoMatching(newEvent, osrsAccountId)
  }
  
  // Also insert into admin table
  await db.insert(allTradesAdmin).values({
    userId,
    osrsAccountId,
    itemId: trade.itemId,
    itemName: trade.itemName,
    offerType: trade.offerType,
    price: trade.price,
    quantity: trade.quantity,
    filledQuantity: trade.filledQuantity,
    status: trade.status,
    timestamp
  }).catch(() => {}) // Don't fail if admin table insert fails
}

export const runeliteTradesRouter = router({
  /**
   * Submit trades from RuneLite plugin
   * Requires authentication (JWT token)
   */
  submit: protectedProcedure
    .input(batchTradeInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { runeliteClientId, osrsUsername, trades } = input
      const userId = ctx.user.id
      
      try {
        // Check rate limit
        await checkRateLimit(userId)
        
        // Get or create OSRS account
        const { id: osrsAccountId } = await getOrCreateOsrsAccount(
          userId,
          runeliteClientId,
          osrsUsername
        )
        
        // Process each trade
        const processed: string[] = []
        const errors: Array<{ runeliteEventId: string; error: string }> = []
        
        for (const trade of trades) {
          try {
            await processTradeEvent(trade, osrsAccountId, userId)
            processed.push(trade.runeliteEventId)
          } catch (error) {
            errors.push({
              runeliteEventId: trade.runeliteEventId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            
            // Log security event for suspicious activity
            if (error instanceof Error && error.message.includes('SQL')) {
              await db.insert(securityEvents).values({
                userId,
                eventType: 'suspicious_activity',
                severity: 'high',
                details: {
                  error: error.message,
                  tradeData: trade
                }
              }).catch(() => {})
            }
          }
        }
        
        return {
          success: true,
          processed: processed.length,
          errors: errors.length > 0 ? errors : undefined
        }
      } catch (error) {
        // Log error
        console.error('[runeliteTrades.submit] Error:', error)
        
        // Log security event
        await db.insert(securityEvents).values({
          userId: ctx.user.id,
          eventType: 'api_error',
          severity: 'medium',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            endpoint: 'runelite.trades.submit'
          }
        }).catch(() => {})
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process trades'
        })
      }
    }),
  
  /**
   * Get trade history for authenticated user
   */
  getHistory: protectedProcedure
    .input(z.object({
      osrsAccountId: z.string().uuid().optional(),
      itemId: z.number().int().positive().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      cursor: z.string().optional(), // For pagination
      limit: z.number().int().positive().max(100).default(100)
    }))
    .query(async ({ input, ctx }) => {
      const { osrsAccountId, itemId, startDate, endDate, cursor, limit } = input
      const userId = ctx.user.id
      
      const conditions = [eq(tradeEvents.userId, userId)]
      
      if (osrsAccountId) {
        conditions.push(eq(tradeEvents.osrsAccountId, osrsAccountId))
      }
      
      if (itemId) {
        conditions.push(eq(tradeEvents.itemId, itemId))
      }
      
      if (startDate) {
        conditions.push(sql`${tradeEvents.timestamp} >= ${new Date(startDate)}`)
      }
      
      if (endDate) {
        conditions.push(sql`${tradeEvents.timestamp} <= ${new Date(endDate)}`)
      }
      
      if (cursor) {
        // Cursor-based pagination
        const cursorDate = new Date(cursor)
        conditions.push(sql`${tradeEvents.timestamp} < ${cursorDate}`)
      }
      
      const trades = await db.select()
        .from(tradeEvents)
        .where(and(...conditions))
        .orderBy(desc(tradeEvents.timestamp))
        .limit(limit + 1) // Fetch one extra to check if there's more
      
      const hasMore = trades.length > limit
      const results = hasMore ? trades.slice(0, limit) : trades
      const nextCursor = results.length > 0 ? results[results.length - 1].timestamp.toISOString() : null
      
      return {
        trades: results,
        nextCursor: hasMore ? nextCursor : null
      }
    }),
  
  /**
   * Get open positions for authenticated user
   */
  getOpenPositions: protectedProcedure
    .input(z.object({
      osrsAccountId: z.string().uuid().optional()
    }).optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id
      const conditions = [eq(openPositions.userId, userId)]
      
      if (input?.osrsAccountId) {
        conditions.push(eq(openPositions.osrsAccountId, input.osrsAccountId))
      }
      
      const positions = await db.select()
        .from(openPositions)
        .where(and(...conditions))
      
      // Get buy events for these positions
      const buyEventIds = positions.map(p => p.buyEventId)
      const buyEvents = buyEventIds.length > 0 ? await db.select()
        .from(tradeEvents)
        .where(inArray(tradeEvents.id, buyEventIds)) : []
      
      const buyEventMap = new Map(buyEvents.map(b => [b.id, b]))
      
      return positions.map(position => ({
        position,
        buyEvent: buyEventMap.get(position.buyEventId)
      }))
    }),
  
  /**
   * Get trade matches (completed flips) for authenticated user
   */
  getMatches: protectedProcedure
    .input(z.object({
      osrsAccountId: z.string().uuid().optional(),
      itemId: z.number().int().positive().optional(),
      cursor: z.string().optional(),
      limit: z.number().int().positive().max(100).default(100)
    }).optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id
      const conditions = [eq(tradeMatches.userId, userId)]
      
      if (input?.osrsAccountId) {
        conditions.push(eq(tradeMatches.osrsAccountId, input.osrsAccountId))
      }
      
      if (input?.itemId) {
        conditions.push(eq(tradeMatches.itemId, input.itemId))
      }
      
      if (input?.cursor) {
        const cursorDate = new Date(input.cursor)
        conditions.push(sql`${tradeMatches.matchedAt} < ${cursorDate}`)
      }
      
      const matches = await db.select()
        .from(tradeMatches)
        .where(and(...conditions))
        .orderBy(desc(tradeMatches.matchedAt))
        .limit((input?.limit || 100) + 1)
      
      const hasMore = matches.length > (input?.limit || 100)
      const results = hasMore ? matches.slice(0, input?.limit || 100) : matches
      const nextCursor = results.length > 0 ? results[results.length - 1].matchedAt.toISOString() : null
      
      return {
        matches: results,
        nextCursor: hasMore ? nextCursor : null
      }
    })
})

