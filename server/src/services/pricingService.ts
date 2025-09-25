import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { eq, and, gte, desc } from 'drizzle-orm'
import axios from 'axios'

interface PriceData {
  [itemId: string]: {
    high: number
    low: number
    highTime: number
    lowTime: number
  }
}

interface ItemMapping {
  id: number
  name: string
  examine: string
  members: boolean
  lowalch: number
  highalch: number
  limit: number
  value: number
  icon: string
  wikiUrl: string
}

export class PricingService {
  private static instance: PricingService
  private lastFetchTime = 0
  private readonly FETCH_INTERVAL = 2.5 * 60 * 1000 // 2.5 minutes in milliseconds
  private readonly API_BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs'
  private readonly USER_AGENT = 'Ge-Metrics Pricing Service - Contact: admin@ge-metrics.com'

  private constructor () {}

  public static getInstance (): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService()
    }
    return PricingService.instance
  }

  /**
   * Get latest pricing data with caching
   * Only fetches from API if 2.5 minutes have passed since last fetch
   */
  async getLatestPrices (): Promise<PriceData> {
    const now = Date.now()

    // Check if we need to fetch new data
    if (now - this.lastFetchTime < this.FETCH_INTERVAL) {
      console.log('Using cached pricing data (last fetch was less than 2.5 minutes ago)')
      return this.getCachedPrices()
    }

    try {
      console.log('Fetching fresh pricing data from OSRS Wiki API...')
      const response = await axios.get(`${this.API_BASE_URL}/latest`, {
        headers: {
          'User-Agent': this.USER_AGENT
        }
      })

      const priceData = response.data.data || response.data

      // Save to database
      await this.savePricesToDatabase(priceData)

      // Update last fetch time
      this.lastFetchTime = now

      console.log(`Successfully fetched and cached pricing data for ${Object.keys(priceData).length} items`)
      return priceData
    } catch (error) {
      console.error('Error fetching latest prices:', error)
      console.log('Falling back to cached database data...')
      return this.getCachedPrices()
    }
  }

  /**
   * Get pricing data from database cache
   */
  private async getCachedPrices (): Promise<PriceData> {
    try {
      // Get the most recent price data for each item
      const latestPrices = await db
        .select({
          itemId: schema.itemPriceHistory.itemId,
          highPrice: schema.itemPriceHistory.high,
          lowPrice: schema.itemPriceHistory.low,
          volume: schema.itemPriceHistory.volume,
          timestamp: schema.itemPriceHistory.timestamp
        })
        .from(schema.itemPriceHistory)
        .where(eq(schema.itemPriceHistory.timeframe, 'latest'))
        .orderBy(desc(schema.itemPriceHistory.timestamp))

      // Group by item ID and get the most recent for each
      const priceMap: PriceData = {}
      const seenItems = new Set<number>()

      for (const price of latestPrices) {
        if (!seenItems.has(price.itemId)) {
          seenItems.add(price.itemId)
          priceMap[price.itemId.toString()] = {
            high: price.highPrice || 0,
            low: price.lowPrice || 0,
            highTime: price.timestamp.getTime() / 1000,
            lowTime: price.timestamp.getTime() / 1000
          }
        }
      }

      return priceMap
    } catch (error) {
      console.error('Error getting cached prices:', error)
      return {}
    }
  }

  /**
   * Save pricing data to database
   */
  private async savePricesToDatabase (priceData: PriceData): Promise<void> {
    try {
      const timestamp = new Date()
      const records = []

      for (const [itemId, data] of Object.entries(priceData)) {
        records.push({
          itemId: parseInt(itemId),
          timestamp,
          highPrice: data.high,
          lowPrice: data.low,
          volume: 0, // Volume not available in latest API
          timeframe: 'latest'
        })
      }

      // Insert in batches to avoid overwhelming the database
      const batchSize = 100
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        await db.insert(schema.itemPriceHistory).values(batch)
      }

      console.log(`Saved ${records.length} price records to database`)
    } catch (error) {
      console.error('Error saving prices to database:', error)
    }
  }

  /**
   * Get item mapping data with caching
   */
  async getItemMapping (): Promise<ItemMapping[]> {
    try {
      // First try to get from database
      const dbItems = await db.select().from(schema.itemMapping)

      if (dbItems.length > 0) {
        console.log(`Using cached item mapping from database (${dbItems.length} items)`)
        return dbItems as ItemMapping[]
      }

      // If database is empty, fetch from API
      console.log('Fetching item mapping from OSRS Wiki API...')
      const response = await axios.get(`${this.API_BASE_URL}/mapping`, {
        headers: {
          'User-Agent': this.USER_AGENT
        }
      })

      const items: ItemMapping[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        examine: item.examine,
        members: item.members || false,
        lowalch: item.lowalch,
        highalch: item.highalch,
        limit: item.limit,
        value: item.value,
        icon: `https://oldschool.runescape.wiki/images/c/c1/${item.name.replace(/\s+/g, '_')}.png?${item.id}b`,
        wikiUrl: `https://oldschool.runescape.wiki/w/${item.name.replace(/\s+/g, '_')}`
      }))

      // Save to database
      await this.saveItemMappingToDatabase(items)

      console.log(`Saved ${items.length} items to database mapping`)
      return items
    } catch (error) {
      console.error('Error getting item mapping:', error)
      return []
    }
  }

  /**
   * Save item mapping to database
   */
  private async saveItemMappingToDatabase (items: ItemMapping[]): Promise<void> {
    try {
      // Insert in batches
      const batchSize = 50
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        await db.insert(schema.itemMapping).values(batch)
      }
    } catch (error) {
      console.error('Error saving item mapping to database:', error)
    }
  }

  /**
   * Get price for specific item
   */
  async getItemPrice (itemId: number): Promise<{ high: number; low: number; volume: number } | null> {
    try {
      const prices = await this.getLatestPrices()
      const itemPrice = prices[itemId.toString()]

      if (itemPrice) {
        return {
          high: itemPrice.high,
          low: itemPrice.low,
          volume: 0 // Volume not available in latest API
        }
      }

      return null
    } catch (error) {
      console.error(`Error getting price for item ${itemId}:`, error)
      return null
    }
  }

  /**
   * Get historical price data for an item
   */
  async getItemHistory (itemId: number, timestep = '24h'): Promise<any[]> {
    try {
      // Check database first
      const dbHistory = await db
        .select()
        .from(schema.itemPriceHistory)
        .where(
          and(
            eq(schema.itemPriceHistory.itemId, itemId),
            eq(schema.itemPriceHistory.timeframe, timestep)
          )
        )
        .orderBy(desc(schema.itemPriceHistory.timestamp))
        .limit(100)

      if (dbHistory.length > 0) {
        console.log(`Using cached historical data for item ${itemId} (${dbHistory.length} records)`)
        return dbHistory.map(record => ({
          timestamp: record.timestamp.getTime() / 1000,
          price: record.highPrice,
          volume: record.volume
        }))
      }

      // If no cached data, fetch from API
      console.log(`Fetching historical data for item ${itemId} from API...`)
      const response = await axios.get(`${this.API_BASE_URL}/timeseries`, {
        params: {
          id: itemId,
          timestep
        },
        headers: {
          'User-Agent': this.USER_AGENT
        }
      })

      const historyData = response.data.data[itemId] || []

      // Save to database
      await this.saveHistoryToDatabase(itemId, historyData, timestep)

      return historyData
    } catch (error) {
      console.error(`Error getting history for item ${itemId}:`, error)
      return []
    }
  }

  /**
   * Save historical data to database
   */
  private async saveHistoryToDatabase (itemId: number, historyData: any[], timestep: string): Promise<void> {
    try {
      const records = historyData.map((dataPoint: any) => ({
        itemId,
        timestamp: new Date(dataPoint[0] * 1000),
        highPrice: dataPoint[1],
        lowPrice: dataPoint[1],
        volume: dataPoint[2] || 0,
        timeframe: timestep
      }))

      await db.insert(schema.itemPriceHistory).values(records)
      console.log(`Saved ${records.length} historical records for item ${itemId}`)
    } catch (error) {
      console.error('Error saving historical data to database:', error)
    }
  }

  /**
   * Force refresh pricing data (ignores cache)
   */
  async forceRefreshPrices (): Promise<PriceData> {
    this.lastFetchTime = 0 // Reset last fetch time
    return this.getLatestPrices()
  }

  /**
   * Get cache status
   */
  getCacheStatus (): { lastFetch: Date; timeUntilNextFetch: number; isStale: boolean } {
    const now = Date.now()
    const timeSinceLastFetch = now - this.lastFetchTime
    const timeUntilNextFetch = Math.max(0, this.FETCH_INTERVAL - timeSinceLastFetch)
    const isStale = timeSinceLastFetch >= this.FETCH_INTERVAL

    return {
      lastFetch: new Date(this.lastFetchTime),
      timeUntilNextFetch,
      isStale
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache (): Promise<void> {
    try {
      await db.delete(schema.itemPriceHistory)
      this.lastFetchTime = 0
      console.log('Cache cleared successfully')
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }
}

export default PricingService
