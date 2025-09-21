import { db, itemVolumes } from '../db'
import { NewItemVolume } from '../db/schema'
import { sql } from 'drizzle-orm'

// Fetches and updates 24-hour volume data
export async function updateAllItemVolumes () {
  console.log('🔄 Fetching 24h volume data...')
  try {
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/24h')
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`)
    }
    const jsonResponse = await response.json()
    const data = jsonResponse.data
    console.log(`✅ Fetched 24h volume for ${Object.keys(data).length} items.`)

    const volumeUpdates = Object.entries(data).map(([itemId, itemData]: [string, any]) => ({
      itemId: parseInt(itemId),
      highPriceVolume: itemData.highPriceVolume || 0,
      lowPriceVolume: itemData.lowPriceVolume || 0
    }))

    if (volumeUpdates.length > 0) {
      console.log('🔄 Upserting 24h volume data into the database...')
      const chunkSize = 500
      for (let i = 0; i < volumeUpdates.length; i += chunkSize) {
        const chunk = volumeUpdates.slice(i, i + chunkSize)
        await db.insert(itemVolumes)
          .values(chunk)
          .onConflictDoUpdate({
            target: itemVolumes.itemId,
            set: {
              highPriceVolume: sql`excluded.high_price_volume`,
              lowPriceVolume: sql`excluded.low_price_volume`,
              lastUpdatedAt: new Date()
            }
          })
      }
      console.log('✅ 24h volume data upsert complete.')
    }
  } catch (error) {
    console.error('❌ Error updating 24h item volumes:', error)
  }
}

// Fetches and updates 1-hour volume data
export async function updateHourlyItemVolumes () {
  console.log('🔄 Fetching 1h volume data...')
  try {
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/1h')
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`)
    }
    const jsonResponse = await response.json()
    const data = jsonResponse.data
    console.log(`✅ Fetched 1h volume for ${Object.keys(data).length} items.`)

    const hourlyVolumeUpdates = Object.entries(data).map(([itemId, itemData]: [string, any]) => ({
      itemId: parseInt(itemId),
      hourlyHighPriceVolume: itemData.highPriceVolume || 0,
      hourlyLowPriceVolume: itemData.lowPriceVolume || 0
    }))

    if (hourlyVolumeUpdates.length > 0) {
      console.log('🔄 Upserting 1h volume data into the database...')
      const chunkSize = 500
      for (let i = 0; i < hourlyVolumeUpdates.length; i += chunkSize) {
        const chunk = hourlyVolumeUpdates.slice(i, i + chunkSize)
        await db.insert(itemVolumes)
          .values(chunk)
          .onConflictDoUpdate({
            target: itemVolumes.itemId,
            set: {
              hourlyHighPriceVolume: sql`excluded.hourly_high_price_volume`,
              hourlyLowPriceVolume: sql`excluded.hourly_low_price_volume`,
              lastUpdatedAt: new Date()
            }
          })
      }
      console.log('✅ 1h volume data upsert complete.')
    }
  } catch (error) {
    console.error('❌ Error updating 1h item volumes:', error)
  }
}
