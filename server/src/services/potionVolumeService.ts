import { db, potionVolumes, type PotionVolume, type NewPotionVolume } from '../db/index.js'
import { eq, and, desc, asc, inArray } from 'drizzle-orm'

// Utility function to parse price strings (e.g., "23,651" -> 23651)
function parsePrice (price: string | number | null): number {
  if (price === null || price === undefined) return 0
  if (typeof price === 'number') return price
  return parseInt(price.toString().replace(/,/g, ''), 10) || 0
}

// No longer fetching bulk volume data - keeping system simple and fast

// Store or update potion data in database (no volume data needed)
export async function storePotionData (potionData: {
  itemId: number
  itemName: string
  dose: number
  baseName: string
  rank?: number
  isActive?: boolean
}): Promise<PotionVolume> {
  const now = new Date()

  // Try to find existing record
  const existing = await db.select()
    .from(potionVolumes)
    .where(eq(potionVolumes.itemId, potionData.itemId))
    .limit(1)

  if (existing.length > 0) {
    // Update existing record
    const [updated] = await db.update(potionVolumes)
      .set({
        itemName: potionData.itemName,
        dose: potionData.dose,
        baseName: potionData.baseName,
        rank: potionData.rank,
        isActive: potionData.isActive ?? true,
        lastUpdated: now,
        updatedAt: now
      })
      .where(eq(potionVolumes.itemId, potionData.itemId))
      .returning()

    return updated
  } else {
    // Insert new record
    const [inserted] = await db.insert(potionVolumes)
      .values({
        itemId: potionData.itemId,
        itemName: potionData.itemName,
        dose: potionData.dose,
        baseName: potionData.baseName,
        volume: 0, // Default to 0 - no volume data
        highPriceVolume: 0,
        lowPriceVolume: 0,
        hourlyVolume: 0,
        hourlyHighVolume: 0,
        hourlyLowVolume: 0,
        totalVolume: 0,
        rank: potionData.rank,
        isActive: potionData.isActive ?? true,
        lastUpdated: now,
        createdAt: now,
        updatedAt: now
      })
      .returning()

    return inserted
  }
}

// Get all active cached potion volumes
export async function getAllPotionVolumes (): Promise<PotionVolume[]> {
  return await db.select()
    .from(potionVolumes)
    .where(eq(potionVolumes.isActive, true))
    .orderBy(asc(potionVolumes.rank))
}

// Get potion volume by item ID
export async function getPotionVolumeById (itemId: number): Promise<PotionVolume | null> {
  const result = await db.select()
    .from(potionVolumes)
    .where(eq(potionVolumes.itemId, itemId))
    .limit(1)

  return result[0] || null
}

// Get potion volumes by base name (all doses)
export async function getPotionVolumesByBaseName (baseName: string): Promise<PotionVolume[]> {
  return await db.select()
    .from(potionVolumes)
    .where(and(
      eq(potionVolumes.baseName, baseName),
      eq(potionVolumes.isActive, true)
    ))
    .orderBy(asc(potionVolumes.dose))
}

// Mark potion as inactive
export async function markPotionInactive (itemId: number): Promise<void> {
  await db.update(potionVolumes)
    .set({
      isActive: false,
      updatedAt: new Date()
    })
    .where(eq(potionVolumes.itemId, itemId))
}

// Mark all potions as inactive (for cache refresh)
export async function markAllPotionsInactive (): Promise<void> {
  await db.update(potionVolumes)
    .set({
      isActive: false,
      updatedAt: new Date()
    })
}

// Get cache status
export async function getVolumesCacheStatus (): Promise<{
  lastUpdated: Date | null
  totalCachedPotions: number
  isStale: boolean
}> {
  const result = await db.select({
    lastUpdated: potionVolumes.lastUpdated,
    count: potionVolumes.id
  })
    .from(potionVolumes)
    .where(eq(potionVolumes.isActive, true))

  const totalCachedPotions = result.length
  const lastUpdated = result.length > 0
    ? result.reduce((latest, item) =>
      !latest || item.lastUpdated > latest ? item.lastUpdated : latest,
      null as Date | null
    )
    : null

  // Consider cache stale if older than 5 minutes (2x the refresh rate)
  const isStale = !lastUpdated || (Date.now() - lastUpdated.getTime()) > 5 * 60 * 1000

  return {
    lastUpdated,
    totalCachedPotions,
    isStale
  }
}

// Main function to update top potion volumes (called by cron)
export async function updateTopPotionVolumes (): Promise<void> {
  console.log('Starting potion volume cache update...')

  try {
    // Step 1: Mark all existing volumes as inactive
    await markAllPotionsInactive()
    console.log('Marked all existing volumes as inactive')

    // Step 2: Get item mapping from API (simplified version for top potions)
    const mappingResponse = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', {
      headers: {
        'User-Agent': 'Ge-Metrics - OSRS Grand Exchange Tool'
      }
    })

    if (!mappingResponse.ok) {
      throw new Error(`Failed to fetch item mapping: ${mappingResponse.status}`)
    }

    const items = await mappingResponse.json()

    // Step 3: Get latest prices
    const pricesResponse = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest', {
      headers: {
        'User-Agent': 'Ge-Metrics - OSRS Grand Exchange Tool'
      }
    })

    if (!pricesResponse.ok) {
      throw new Error(`Failed to fetch latest prices: ${pricesResponse.status}`)
    }

    const pricesData = await pricesResponse.json()

    // Step 4: Identify 4-dose potions and calculate basic profits
    const potionFamilies = new Map<string, {
      baseName: string
      item4: any
      item3?: any
      item2?: any
      item1?: any
      maxProfit: number
    }>()

    // Find all 4-dose potions
    items.filter((item: any) =>
      item.name.toLowerCase().includes('(4)') &&
      item.name.toLowerCase().includes('potion')
    ).forEach((item4: any) => {
      const baseName = item4.name.replace(/\s*\(4\)/i, '')

      // Find corresponding lower doses
      const item3 = items.find((i: any) => i.name.toLowerCase() === `${baseName.toLowerCase()}(3)`)
      const item2 = items.find((i: any) => i.name.toLowerCase() === `${baseName.toLowerCase()}(2)`)
      const item1 = items.find((i: any) => i.name.toLowerCase() === `${baseName.toLowerCase()}(1)`)

      // Calculate simple profit for (3) dose method (most common)
      let maxProfit = 0
      if (item3 && pricesData.data[item4.id] && pricesData.data[item3.id]) {
        const item4Data = pricesData.data[item4.id]
        const item3Data = pricesData.data[item3.id]

        if (item4Data.high && item3Data.low) {
          const sellPrice = parsePrice(item4Data.high) * 0.98 // 2% tax
          const buyPrice = parsePrice(item3Data.low) * (4 / 3) // Buy 4x (3) dose to get 3x (4) dose
          maxProfit = (sellPrice * 3) - (buyPrice * 4)
        }
      }

      potionFamilies.set(baseName, {
        baseName,
        item4,
        item3,
        item2,
        item1,
        maxProfit
      })
    })

    // Step 5: Get top 15 most profitable potion families
    const topPotions = Array.from(potionFamilies.values())
      .filter(family => family.maxProfit > 0)
      .sort((a, b) => b.maxProfit - a.maxProfit)
      .slice(0, 15)

    console.log(`Found ${topPotions.length} profitable potion families`)

    // Step 6: Store potion data (no volume fetching - keeping it simple and fast!)
    console.log('💾 Storing potion data in database...')
    const storagePromises: Promise<void>[] = []

    topPotions.forEach((family, familyRank) => {
      [family.item4, family.item3, family.item2, family.item1].forEach((item, doseIndex) => {
        if (item) {
          const dose = 4 - doseIndex

          storagePromises.push(
            storePotionData({
              itemId: item.id,
              itemName: item.name,
              dose,
              baseName: family.baseName,
              rank: familyRank + 1,
              isActive: true
            }).then(() => {
              console.log(`✅ Cached potion data for ${item.name} (${dose}-dose)`)
            }).catch(error => {
              console.error(`❌ Failed to cache potion data for ${item.name}:`, error)
            })
          )
        }
      })
    })

    // Wait for all storage operations to complete
    await Promise.all(storagePromises)

    console.log('Potion volume cache update completed successfully')
  } catch (error) {
    console.error('Error updating potion volumes:', error)
    throw error
  }
}
