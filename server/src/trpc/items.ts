import { z } from 'zod'
import { publicProcedure, router } from './trpc.js'
import { db, itemVolumes, itemMapping } from '../db/index.js'
import { NewItemVolume } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const itemsRouter = router({
  // Get all cached item volumes
  getAllVolumes: publicProcedure
    .query(async () => {
      const allVolumes = await db.select().from(itemVolumes)
      // Convert array to an object for JSON-friendly transfer
      const volumeMap: Record<number, Omit<NewItemVolume, 'id'>> = {}
      allVolumes.forEach(item => {
        volumeMap[item.itemId] = {
          itemId: item.itemId,
          highPriceVolume: item.highPriceVolume,
          lowPriceVolume: item.lowPriceVolume,
          hourlyHighPriceVolume: item.hourlyHighPriceVolume,
          hourlyLowPriceVolume: item.hourlyLowPriceVolume,
          lastUpdatedAt: item.lastUpdatedAt
        }
      })
      return volumeMap
    }),

  // Get all item mappings
  getItemMapping: publicProcedure
    .query(async () => {
      try {
        console.log('[getItemMapping] Fetching item mappings from database...')
        const mappings = await db.select().from(itemMapping)
        console.log(`[getItemMapping] Successfully fetched ${mappings.length} item mappings`)
        
        const mappingObject: Record<number, typeof mappings[number]> = {}
        mappings.forEach(item => {
          mappingObject[item.id] = item
        })
        return mappingObject
      } catch (error) {
        console.error('[getItemMapping] Error fetching item mappings:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch item mappings from database',
          cause: error
        })
      }
    }),

  // This endpoint is effectively replaced by getItemMapping and client-side logic
  // We can add a dedicated price fetcher here later if needed.
  getAllItems: publicProcedure
    .query(async () => {
      try {
        console.log('[getAllItems] Fetching from OSRS Wiki API...')
        const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest', {
          headers: {
            'User-Agent': 'GE-Metrics/1.0 (https://ge-metrics.com)'
          }
        })
        
        if (!response.ok) {
          console.error(`[getAllItems] Failed to fetch latest prices from OSRS Wiki API: ${response.status} ${response.statusText}`)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `OSRS Wiki API returned ${response.status}: ${response.statusText}`
          })
        }
        
        const data = await response.json()
        console.log(`[getAllItems] Successfully fetched ${Object.keys(data.data || {}).length} items`)
        return data.data || {} // The actual item data is in the 'data' property
      } catch (error) {
        console.error('[getAllItems] Error fetching or parsing latest prices:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch price data from OSRS Wiki API',
          cause: error
        })
      }
    }),

  getVolumesLastUpdated: publicProcedure
    .query(async () => {
      const latestUpdate = await db.select({ lastUpdatedAt: itemVolumes.lastUpdatedAt })
        .from(itemVolumes)
        .orderBy(desc(itemVolumes.lastUpdatedAt))
        .limit(1)

      return latestUpdate[0] ?? null
    }),

  // Get potion families (client-side processing will handle this for now)
  getPotionFamilies: publicProcedure
    .query(async () => {
      // This is a placeholder. The actual logic is in `processPotionData` on the client.
      // We could move that logic here in the future if needed.
      return []
    }),

  getItemHistory: publicProcedure
    .input(z.object({
      timestep: z.string(),
      itemId: z.number()
    }))
    .query(async ({ input }) => {
      const { timestep, itemId } = input
      const url = `https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=${timestep}&id=${itemId}`
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch item history from OSRS Wiki API: ${response.statusText}`)
        }
        const data = await response.json()
        return data
      } catch (error) {
        console.error(`Error fetching item history for ID ${itemId}:`, error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch item history.',
          cause: error
        })
      }
    })
})
