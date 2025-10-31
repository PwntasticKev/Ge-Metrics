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
      try {
        console.log('[getAllVolumes] Fetching item volumes from database...')
        const allVolumes = await db.select().from(itemVolumes)
        console.log(`[getAllVolumes] Successfully fetched ${allVolumes.length} item volumes`)
        
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
      } catch (error) {
        console.error('[getAllVolumes] Error fetching item volumes:', error)
        // Return empty object instead of throwing - volumes can be empty initially
        // This allows the UI to still function without volume data
        console.log('[getAllVolumes] Returning empty volume map due to error')
        return {}
      }
    }),

  // Get all item mappings
  getItemMapping: publicProcedure
    .query(async () => {
      try {
        console.log('[getItemMapping] Fetching item mappings from database...')
        const mappings = await db.select().from(itemMapping)
        console.log(`[getItemMapping] Successfully fetched ${mappings.length} item mappings`)
        
        // If table is empty, try to populate it from the API
        if (mappings.length === 0) {
          console.log('[getItemMapping] Table is empty, attempting to populate from OSRS Wiki API...')
          try {
            const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', {
              headers: {
                'User-Agent': 'GE-Metrics/1.0 (https://ge-metrics.com)'
              }
            })
            
            if (!response.ok) {
              const errorText = await response.text()
              console.error(`[getItemMapping] API error: ${response.status} ${response.statusText}`, errorText)
              throw new Error(`OSRS Wiki API returned ${response.status}: ${response.statusText}`)
            }
            
            const apiData: any[] = await response.json()
            console.log(`[getItemMapping] Fetched ${apiData.length} items from API, inserting into database...`)
            
            if (!apiData || apiData.length === 0) {
              throw new Error('API returned empty array')
            }
            
            // Insert in chunks to avoid overwhelming the database
            const chunkSize = 500
            let insertedCount = 0
            for (let i = 0; i < apiData.length; i += chunkSize) {
              const chunk = apiData.slice(i, i + chunkSize).map((item: any) => ({
                id: item.id,
                name: item.name,
                examine: item.examine || null,
                members: item.members || false,
                lowalch: item.lowalch || null,
                highalch: item.highalch || null,
                limit: item.limit || null,
                value: item.value || null,
                icon: item.icon || null,
                wikiUrl: `https://oldschool.runescape.wiki/w/${encodeURIComponent(item.name.replace(/\s+/g, '_'))}`
              }))
              
              try {
                await db.insert(itemMapping)
                  .values(chunk)
                  .onConflictDoUpdate({
                    target: itemMapping.id,
                    set: {
                      updatedAt: new Date()
                    }
                  })
                insertedCount += chunk.length
                console.log(`[getItemMapping] Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(apiData.length / chunkSize)} (${insertedCount} items inserted so far)`)
              } catch (insertError) {
                console.error(`[getItemMapping] Error inserting chunk ${Math.floor(i / chunkSize) + 1}:`, insertError)
                // Continue with other chunks even if one fails
              }
            }
            
            console.log(`[getItemMapping] Finished inserting. Total inserted: ${insertedCount}`)
            
            // Re-fetch from database after population
            const repopulatedMappings = await db.select().from(itemMapping)
            console.log(`[getItemMapping] Successfully populated and fetched ${repopulatedMappings.length} item mappings`)
            
            if (repopulatedMappings.length === 0) {
              throw new Error('Failed to populate item mapping - table still empty after insertion')
            }
            
            const mappingObject: Record<number, typeof repopulatedMappings[number]> = {}
            repopulatedMappings.forEach(item => {
              mappingObject[item.id] = item
            })
            return mappingObject
          } catch (populateError) {
            console.error('[getItemMapping] Failed to populate from API:', populateError)
            console.error('[getItemMapping] Error details:', populateError instanceof Error ? populateError.stack : String(populateError))
            // Throw error instead of returning empty - this will show up in logs and help debug
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Failed to populate item mapping: ${populateError instanceof Error ? populateError.message : 'Unknown error'}`,
              cause: populateError
            })
          }
        }
        
        const mappingObject: Record<number, typeof mappings[number]> = {}
        mappings.forEach(item => {
          mappingObject[item.id] = item
        })
        return mappingObject
      } catch (error) {
        console.error('[getItemMapping] Error fetching item mappings:', error)
        console.error('[getItemMapping] Error details:', error instanceof Error ? error.stack : String(error))
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
      try {
        const latestUpdate = await db.select({ lastUpdatedAt: itemVolumes.lastUpdatedAt })
          .from(itemVolumes)
          .orderBy(desc(itemVolumes.lastUpdatedAt))
          .limit(1)

        return latestUpdate[0] ?? null
      } catch (error) {
        console.error('[getVolumesLastUpdated] Error fetching last updated timestamp:', error)
        // Return null instead of throwing to prevent breaking the UI
        return null
      }
    }),

  // Get potion families (client-side processing will handle this for now)
  getPotionFamilies: publicProcedure
    .query(async () => {
      // This is a placeholder. The actual logic is in `processPotionData` on the client.
      // We could move that logic here in the future if needed.
      return []
    }),

  // Manually populate item mapping (useful for admin or when auto-population fails)
  populateItemMapping: publicProcedure
    .mutation(async () => {
      try {
        console.log('[populateItemMapping] Starting manual population...')
        const existingCount = await db.select().from(itemMapping)
        
        if (existingCount.length > 100) {
          console.log(`[populateItemMapping] Table already has ${existingCount.length} items, skipping population`)
          return { success: true, message: `Table already populated with ${existingCount.length} items`, count: existingCount.length }
        }
        
        const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', {
          headers: {
            'User-Agent': 'GE-Metrics/1.0 (https://ge-metrics.com)'
          }
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`OSRS Wiki API returned ${response.status}: ${response.statusText} - ${errorText}`)
        }
        
        const apiData: any[] = await response.json()
        console.log(`[populateItemMapping] Fetched ${apiData.length} items from API`)
        
        if (!apiData || apiData.length === 0) {
          throw new Error('API returned empty array')
        }
        
        const chunkSize = 500
        let insertedCount = 0
        let errorCount = 0
        
        for (let i = 0; i < apiData.length; i += chunkSize) {
          const chunk = apiData.slice(i, i + chunkSize).map((item: any) => ({
            id: item.id,
            name: item.name,
            examine: item.examine || null,
            members: item.members || false,
            lowalch: item.lowalch || null,
            highalch: item.highalch || null,
            limit: item.limit || null,
            value: item.value || null,
            icon: item.icon || null,
            wikiUrl: `https://oldschool.runescape.wiki/w/${encodeURIComponent(item.name.replace(/\s+/g, '_'))}`
          }))
          
          try {
            await db.insert(itemMapping)
              .values(chunk)
              .onConflictDoUpdate({
                target: itemMapping.id,
                set: {
                  updatedAt: new Date()
                }
              })
            insertedCount += chunk.length
            console.log(`[populateItemMapping] Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(apiData.length / chunkSize)}`)
          } catch (insertError) {
            errorCount++
            console.error(`[populateItemMapping] Error inserting chunk ${Math.floor(i / chunkSize) + 1}:`, insertError)
            // Continue with other chunks
          }
        }
        
        const finalCount = await db.select().from(itemMapping)
        
        return {
          success: true,
          message: `Inserted ${insertedCount} items. Table now has ${finalCount.length} items.`,
          inserted: insertedCount,
          finalCount: finalCount.length,
          errors: errorCount
        }
      } catch (error) {
        console.error('[populateItemMapping] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to populate item mapping: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cause: error
        })
      }
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
