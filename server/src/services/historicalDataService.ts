import { db } from '../db/index.js'
import { itemPriceHistory } from '../db/schema.js'
import { eq, and, gte } from 'drizzle-orm'

interface HistoricalDataPoint {
  timestamp: number
  avgHighPrice: number | null
  avgLowPrice: number | null
  highPriceVolume: number | null
  lowPriceVolume: number | null
}

interface CachedHistoricalData {
  itemId: number
  timestep: string
  data: HistoricalDataPoint[]
  cachedAt: Date
}

export class HistoricalDataService {
  private static readonly CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
  private static readonly USER_AGENT = 'Ge-Metrics OSRS Trading App - Historical Cache Service (contact@ge-metrics.com)'

  /**
   * Get historical data for an item, using cache when available
   */
  async getHistoricalData (itemId: number, timestep = '24h'): Promise<HistoricalDataPoint[]> {
    try {
      // Check if we have recent cached data
      const cachedData = await this.getCachedData(itemId, timestep)
      if (cachedData && this.isCacheValid(cachedData.cachedAt)) {
        console.log(`📊 Using cached historical data for item ${itemId}`)
        return cachedData.data
      }

      // Fetch fresh data from OSRS Wiki API
      console.log(`🔄 Fetching fresh historical data for item ${itemId} (${timestep})`)
      const freshData = await this.fetchFromAPI(itemId, timestep)

      // Cache the fresh data
      await this.cacheData(itemId, timestep, freshData)

      return freshData
    } catch (error) {
      console.error(`Error getting historical data for item ${itemId}:`, error)

      // Try to return stale cached data as fallback
      const staleData = await this.getCachedData(itemId, timestep)
      if (staleData) {
        console.log(`⚠️ Using stale cached data for item ${itemId} due to API error`)
        return staleData.data
      }

      throw error
    }
  }

  /**
   * Fetch historical data from OSRS Wiki API
   */
  private async fetchFromAPI (itemId: number, timestep: string): Promise<HistoricalDataPoint[]> {
    const response = await fetch(
      `https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=${timestep}&id=${itemId}`,
      {
        headers: {
          'User-Agent': HistoricalDataService.USER_AGENT
        }
      }
    )

    if (!response.ok) {
      if (response.status === 400) {
        // Item doesn't exist or no data available
        return []
      }
      throw new Error(`Failed to fetch historical data: ${response.status}`)
    }

    const data = await response.json()

    if (!data.data || !Array.isArray(data.data)) {
      return []
    }

    return data.data.map((point: any) => ({
      timestamp: point.timestamp,
      avgHighPrice: point.avgHighPrice || null,
      avgLowPrice: point.avgLowPrice || null,
      highPriceVolume: point.highPriceVolume || null,
      lowPriceVolume: point.lowPriceVolume || null
    }))
  }

  /**
   * Get cached historical data from database
   */
  private async getCachedData (itemId: number, timestep: string): Promise<CachedHistoricalData | null> {
    try {
      // For simplicity, we'll use the item_price_history table to store cached historical data
      // We'll use a special timestamp to indicate this is cached historical data
      const cacheKey = `historical_${timestep}`

      const result = await db.select()
        .from(itemPriceHistory)
        .where(
          and(
            eq(itemPriceHistory.itemId, itemId),
            eq(itemPriceHistory.timestamp, new Date(cacheKey)) // Use special timestamp as cache key
          )
        )
        .limit(1)

      if (result.length === 0) {
        return null
      }

      const cached = result[0]

      // Parse the cached data from the JSON field (we'll store it in the 'data' field)
      const data = JSON.parse(cached.data || '[]')

      return {
        itemId,
        timestep,
        data,
        cachedAt: cached.createdAt
      }
    } catch (error) {
      console.error('Error getting cached historical data:', error)
      return null
    }
  }

  /**
   * Cache historical data in database
   */
  private async cacheData (itemId: number, timestep: string, data: HistoricalDataPoint[]): Promise<void> {
    try {
      const cacheKey = `historical_${timestep}`
      const now = new Date()

      // Delete existing cache entry
      await db.delete(itemPriceHistory)
        .where(
          and(
            eq(itemPriceHistory.itemId, itemId),
            eq(itemPriceHistory.timestamp, new Date(cacheKey))
          )
        )

      // Insert new cache entry
      await db.insert(itemPriceHistory).values({
        itemId,
        timestamp: new Date(cacheKey), // Special timestamp for cache identification
        high: null,
        low: null,
        volume: data.length, // Store data length as volume
        data: JSON.stringify(data), // Store the actual data as JSON
        createdAt: now
      })

      console.log(`💾 Cached historical data for item ${itemId} (${data.length} points)`)
    } catch (error) {
      console.error('Error caching historical data:', error)
      // Don't throw - caching failure shouldn't break the API call
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid (cachedAt: Date): boolean {
    const now = Date.now()
    const cacheAge = now - cachedAt.getTime()
    return cacheAge < HistoricalDataService.CACHE_DURATION_MS
  }

  /**
   * Clear old cached data (cleanup method)
   */
  async clearOldCache (): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - (24 * 60 * 60 * 1000)) // 24 hours ago

      const result = await db.delete(itemPriceHistory)
        .where(
          and(
            gte(itemPriceHistory.timestamp, new Date('historical_')), // Only delete cache entries
            gte(itemPriceHistory.createdAt, cutoffDate)
          )
        )
        .returning()

      console.log(`🧹 Cleared ${result.length} old historical cache entries`)
    } catch (error) {
      console.error('Error clearing old cache:', error)
    }
  }
}

export default HistoricalDataService
