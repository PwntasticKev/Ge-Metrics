import { z } from 'zod'
import { publicProcedure, router, subscribedProcedure } from './trpc.js'
import { db, itemVolumes, itemMapping, connection } from '../db/index.js'
import { NewItemVolume } from '../db/schema.js'
import { eq, desc, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { 
  rateLimitedProcedure, 
  rsWikiLimitedProcedure,
  rsWikiLimitedSubscribedProcedure,
  rateLimitedPublicProcedure 
} from '../middleware/trpcRateLimit.js'

// Cache for getAllItems to prevent excessive RSWiki API calls
let itemsCache: {
  data: any
  timestamp: number
} | null = null

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes - matches price update cycle

export const itemsRouter = router({
  // Get all cached item volumes with pagination
  getAllVolumes: subscribedProcedure
    .input(z.object({
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      try {
        console.log(`[getAllVolumes] Fetching ${input.limit} item volumes from database (offset: ${input.offset})...`)
        
        // Get total count for pagination info
        const totalCount = await db.select({ count: 'count(*)' }).from(itemVolumes)
        
        // Get paginated volumes
        const allVolumes = await db
          .select()
          .from(itemVolumes)
          .limit(input.limit)
          .offset(input.offset)
          
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
        return {
          data: volumeMap,
          pagination: {
            total: totalCount[0]?.count || 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: (input.offset + allVolumes.length) < (totalCount[0]?.count || 0)
          }
        }
      } catch (error) {
        console.error('[getAllVolumes] Error fetching item volumes:', error)
        // Return empty object instead of throwing - volumes can be empty initially
        // This allows the UI to still function without volume data
        console.log('[getAllVolumes] Returning empty volume map due to error')
        return {
          data: {},
          pagination: {
            total: 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: false
          }
        }
      }
    }),

  // Get all item mappings with pagination (rate limited due to potential RS Wiki API calls)
  getItemMapping: rsWikiLimitedSubscribedProcedure
    .input(z.object({
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      try {
        console.log(`[getItemMapping] Fetching ${input.limit} item mappings from database (offset: ${input.offset})...`)
        
        // Build query with optional search
        let query = db.select().from(itemMapping)
        
        if (input.search) {
          query = query.where(sql`name ILIKE ${'%' + input.search + '%'}`)
        }
        
        // Get total count for pagination
        let countQuery = db.select({ count: sql`count(*)` }).from(itemMapping)
        if (input.search) {
          countQuery = countQuery.where(sql`name ILIKE ${'%' + input.search + '%'}`)
        }
        const totalCount = await countQuery
        
        // Get paginated mappings
        const mappings = await query
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(itemMapping.name)
          
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
            
            // After repopulation, get paginated results
            const paginatedMappings = await query
              .limit(input.limit)
              .offset(input.offset)
              .orderBy(itemMapping.name)
              
            const mappingObject: Record<number, typeof paginatedMappings[number]> = {}
            paginatedMappings.forEach(item => {
              mappingObject[item.id] = item
            })
            
            return {
              data: mappingObject,
              pagination: {
                total: repopulatedMappings.length,
                limit: input.limit,
                offset: input.offset,
                hasMore: (input.offset + paginatedMappings.length) < repopulatedMappings.length
              }
            }
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
        
        return {
          data: mappingObject,
          pagination: {
            total: totalCount[0]?.count || 0,
            limit: input.limit,
            offset: input.offset,
            hasMore: (input.offset + mappings.length) < (totalCount[0]?.count || 0)
          }
        }
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

  // This endpoint fetches latest prices with caching to prevent RSWiki API rate limiting
  getAllItems: rsWikiLimitedSubscribedProcedure
    .query(async () => {
      try {
        const now = Date.now()
        
        // Check if we have valid cached data
        if (itemsCache && (now - itemsCache.timestamp < CACHE_DURATION_MS)) {
          console.log(`[getAllItems] Returning cached data (age: ${Math.round((now - itemsCache.timestamp) / 1000)}s)`)
          return itemsCache.data
        }
        
        console.log('[getAllItems] Cache miss or expired, fetching from OSRS Wiki API...')
        const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest', {
          headers: {
            'User-Agent': 'GE-Metrics/1.0 (https://ge-metrics.com)'
          }
        })
        
        if (!response.ok) {
          console.error(`[getAllItems] Failed to fetch latest prices from OSRS Wiki API: ${response.status} ${response.statusText}`)
          
          // If we have stale cached data, return it as fallback
          if (itemsCache) {
            console.log('[getAllItems] Returning stale cached data as fallback due to API error')
            return itemsCache.data
          }
          
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `OSRS Wiki API returned ${response.status}: ${response.statusText}`
          })
        }
        
        const apiResponse = await response.json()
        const itemData = apiResponse.data || {}
        
        // Cache the response
        itemsCache = {
          data: itemData,
          timestamp: now
        }
        
        console.log(`[getAllItems] Successfully fetched and cached ${Object.keys(itemData).length} items`)
        return itemData
      } catch (error) {
        console.error('[getAllItems] Error fetching or parsing latest prices:', error)
        
        // If we have any cached data, return it as fallback
        if (itemsCache) {
          console.log('[getAllItems] Returning cached data as fallback due to error')
          return itemsCache.data
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch price data from OSRS Wiki API',
          cause: error
        })
      }
    }),

  getVolumesLastUpdated: subscribedProcedure
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
  getPotionFamilies: subscribedProcedure
    .query(async () => {
      // This is a placeholder. The actual logic is in `processPotionData` on the client.
      // We could move that logic here in the future if needed.
      return []
    }),

  // Manually populate item mapping (useful for admin or when auto-population fails)
  populateItemMapping: subscribedProcedure
    .mutation(async () => {
      try {
        console.log('[populateItemMapping] Starting manual population...')
        
        // First, check if table exists using information_schema
        const tableCheck = await connection`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'item_mapping'
          ) as exists
        `
        const tableExists = tableCheck[0]?.exists ?? false
        
        let existingCount: any[] = []
        
        if (!tableExists) {
          console.log('[populateItemMapping] Table does not exist, creating it...')
          await connection`
            CREATE TABLE "item_mapping" (
              "id" integer PRIMARY KEY NOT NULL,
              "name" text NOT NULL,
              "examine" text,
              "members" boolean DEFAULT false,
              "lowalch" integer,
              "highalch" integer,
              "limit" integer,
              "value" integer,
              "icon" text,
              "wiki_url" text,
              "created_at" timestamp DEFAULT now() NOT NULL,
              "updated_at" timestamp DEFAULT now() NOT NULL
            )
          `
          console.log('[populateItemMapping] Table created successfully')
        } else {
          // Table exists, try to query it
          try {
            existingCount = await db.select().from(itemMapping)
            console.log(`[populateItemMapping] Table exists with ${existingCount.length} items`)
          } catch (queryError) {
            // Table exists but has wrong schema - drop and recreate
            console.error('[populateItemMapping] Table exists but query failed (wrong schema?), recreating...', queryError)
            await connection`DROP TABLE IF EXISTS "item_mapping" CASCADE`
            await connection`
              CREATE TABLE "item_mapping" (
                "id" integer PRIMARY KEY NOT NULL,
                "name" text NOT NULL,
                "examine" text,
                "members" boolean DEFAULT false,
                "lowalch" integer,
                "highalch" integer,
                "limit" integer,
                "value" integer,
                "icon" text,
                "wiki_url" text,
                "created_at" timestamp DEFAULT now() NOT NULL,
                "updated_at" timestamp DEFAULT now() NOT NULL
              )
            `
            console.log('[populateItemMapping] Table recreated successfully')
            existingCount = []
          }
        }
        
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

  // Manually populate item volumes cache (fetches from OSRS Wiki API)
  populateItemVolumes: publicProcedure
    .mutation(async () => {
      try {
        console.log('[populateItemVolumes] Starting manual volume population...')
        
        // First, check if table exists using information_schema
        const tableCheckResult = await connection.unsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'item_volumes'
          ) as exists
        `)
        const tableExists = tableCheckResult[0]?.exists || false
        
        if (!tableExists) {
          console.log('[populateItemVolumes] Table does not exist, creating it...')
          // Create table using raw SQL with proper syntax
          await connection.unsafe(`
            CREATE TABLE IF NOT EXISTS "item_volumes" (
              "id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY NOT NULL,
              "item_id" integer NOT NULL,
              "high_price" integer,
              "low_price" integer,
              "high_price_volume" integer DEFAULT 0 NOT NULL,
              "low_price_volume" integer DEFAULT 0 NOT NULL,
              "hourly_high_price_volume" integer DEFAULT 0,
              "hourly_low_price_volume" integer DEFAULT 0,
              "last_updated_at" timestamp DEFAULT now() NOT NULL,
              CONSTRAINT "item_volumes_item_id_unique" UNIQUE("item_id")
            )
          `)
          console.log('[populateItemVolumes] Table created successfully')
        }
        
        // Now try to query the table
        let existingCount: any[] = []
        try {
          existingCount = await db.select().from(itemVolumes)
          console.log(`[populateItemVolumes] Table exists with ${existingCount.length} items`)
        } catch (queryError) {
          console.error('[populateItemVolumes] Error querying table after creation:', queryError)
          // Table might have wrong schema - try to recreate it
          console.log('[populateItemVolumes] Attempting to drop and recreate table...')
          try {
            await connection.unsafe(`
              DROP TABLE IF EXISTS "item_volumes" CASCADE;
              CREATE TABLE "item_volumes" (
                "id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY NOT NULL,
                "item_id" integer NOT NULL,
                "high_price" integer,
                "low_price" integer,
                "high_price_volume" integer DEFAULT 0 NOT NULL,
                "low_price_volume" integer DEFAULT 0 NOT NULL,
                "hourly_high_price_volume" integer DEFAULT 0,
                "hourly_low_price_volume" integer DEFAULT 0,
                "last_updated_at" timestamp DEFAULT now() NOT NULL,
                CONSTRAINT "item_volumes_item_id_unique" UNIQUE("item_id")
              )
            `)
            existingCount = []
            console.log('[populateItemVolumes] Table recreated successfully')
          } catch (recreateError) {
            console.error('[populateItemVolumes] Failed to recreate table:', recreateError)
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Table does not exist and could not be created: ${recreateError instanceof Error ? recreateError.message : String(recreateError)}`,
              cause: recreateError
            })
          }
        }
        
        // Import the update function
        const { updateAllItemVolumes, updateHourlyItemVolumes } = await import('../services/itemVolumeService.js')
        
        // Update 24h volumes
        console.log('[populateItemVolumes] Fetching 24h volume data...')
        await updateAllItemVolumes()
        
        // Update 1h volumes
        console.log('[populateItemVolumes] Fetching 1h volume data...')
        await updateHourlyItemVolumes()
        
        // Get final count
        const finalCount = await db.select().from(itemVolumes)
        
        return {
          success: true,
          message: `Successfully populated item volumes. Table now has ${finalCount.length} items.`,
          count: finalCount.length,
          previousCount: existingCount.length
        }
      } catch (error) {
        console.error('[populateItemVolumes] Error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to populate item volumes: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
