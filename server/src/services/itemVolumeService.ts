import { db, itemVolumes } from '../db/index.js'
import { sql } from 'drizzle-orm'
import { config } from '../config/index.js'

const OSRS_WIKI_API_URL = 'https://prices.runescape.wiki/api/v1/osrs/24h'

interface VolumeData {
  avgHighPrice: number | null
  highPriceVolume: number
  avgLowPrice: number | null
  lowPriceVolume: number
}

interface ApiResponse {
  data: {
    [itemId: string]: VolumeData
  }
}

async function fetchItemVolumes (): Promise<ApiResponse | null> {
  console.log('[ItemVolumeService] Fetching data from OSRS Wiki API...')
  try {
    const response = await fetch(OSRS_WIKI_API_URL, {
      headers: {
        'User-Agent': config.OSRS_WIKI_USER_AGENT
      }
    })
    if (!response.ok) {
      console.error(`[ItemVolumeService] API request failed with status ${response.status}: ${response.statusText}`)
      const errorBody = await response.text()
      console.error(`[ItemVolumeService] API Error Body: ${errorBody}`)
      return null
    }
    console.log('[ItemVolumeService] API request successful.')
    const data: ApiResponse = await response.json()
    return data
  } catch (error) {
    console.error('[ItemVolumeService] Failed to fetch item volumes:', error)
    return null
  }
}

export async function updateAllItemVolumes () {
  console.log('[ItemVolumeService] Starting 24h volume update...')
  const apiResponse = await fetchItemVolumes()

  if (!apiResponse || !apiResponse.data) {
    console.error('[ItemVolumeService] No data received from API. Aborting update.')
    return
  }

  const volumeData = apiResponse.data
  console.log(`[ItemVolumeService] Received data for ${Object.keys(volumeData).length} items.`)

  const itemUpdates = Object.entries(volumeData).map(([itemId, data]) => ({
    itemId: parseInt(itemId, 10),
    highPriceVolume: data.highPriceVolume || 0,
    lowPriceVolume: data.lowPriceVolume || 0,
    lastUpdatedAt: new Date()
  }))

  if (itemUpdates.length === 0) {
    console.log('[ItemVolumeService] No valid item volume data to process.')
    return
  }

  console.log(`[ItemVolumeService] Preparing to update ${itemUpdates.length} item volumes in the database.`)

  try {
    // Using a transaction for bulk upsert
    await db.transaction(async (tx) => {
      await tx.insert(itemVolumes)
        .values(itemUpdates)
        .onConflictDoUpdate({
          target: itemVolumes.itemId,
          set: {
            highPriceVolume: sql`excluded.high_price_volume`,
            lowPriceVolume: sql`excluded.low_price_volume`,
            lastUpdatedAt: sql`excluded.last_updated_at`
          }
        })
    })
    console.log(`[ItemVolumeService] Successfully upserted ${itemUpdates.length} item volumes.`)
  } catch (error) {
    console.error('[ItemVolumeService] Database transaction failed:', error)
  }
}
