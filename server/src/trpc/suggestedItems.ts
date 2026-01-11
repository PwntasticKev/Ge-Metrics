import { z } from 'zod'
import { router, subscribedProcedure } from './trpc.js'
import { TRPCError } from '@trpc/server'
import { getSuggestedItems, getSuggestedItemsStats } from '../services/suggestedItemsService.js'

export const suggestedItemsRouter = router({
  // Get suggested items with optional filters
  getItems: subscribedProcedure
    .input(z.object({
      capital: z.number().optional(),
      volumeType: z.enum(['global', 'high', 'low']).optional().default('global')
    }))
    .query(async ({ input }) => {
      try {
        console.log(`[getItems] Fetching suggested items with filters:`, input)
        
        const items = await getSuggestedItems({
          capital: input.capital,
          volumeType: input.volumeType
        })
        
        console.log(`[getItems] Successfully returned ${items.length} suggested items`)
        return items
      } catch (error) {
        console.error('[getItems] Error fetching suggested items:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch suggested items',
          cause: error
        })
      }
    }),

  // Get statistics about suggested items
  getStats: subscribedProcedure
    .query(async () => {
      try {
        console.log('[getStats] Fetching suggested items statistics')
        
        const stats = await getSuggestedItemsStats()
        
        console.log('[getStats] Successfully returned statistics:', stats)
        return stats
      } catch (error) {
        console.error('[getStats] Error fetching statistics:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch suggested items statistics',
          cause: error
        })
      }
    })
})