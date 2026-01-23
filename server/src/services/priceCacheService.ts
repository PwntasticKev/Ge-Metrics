import { db } from '../db/index.js'
import { itemPriceHistory, itemMapping } from '../db/schema.js'
import { eq, desc, and, gte } from 'drizzle-orm'
import axios from 'axios'
import { apiRotation } from './apiRotationService.js'

interface PriceData {
  [itemId: string]: {
    high: number
    low: number
    highTime: number
    lowTime: number
  }
}

interface VolumeData {
  [itemId: string]: {
    high: number
    low: number
    volume: number
  }
}

export class PriceCacheService {
  private static instance: PriceCacheService
  private lastFetchTime = 0
  private readonly FETCH_INTERVAL = 2 * 60 * 1000 // 2 minutes in milliseconds
  private readonly API_BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs'
  private isFetching = false
  private retryCount = 0
  private readonly MAX_RETRIES = 3

  private constructor () {}

  public static getInstance (): PriceCacheService {
    if (!PriceCacheService.instance) {
      PriceCacheService.instance = new PriceCacheService()
    }
    return PriceCacheService.instance
  }

  /**
   * Main method to get prices - returns cached data or fetches fresh data
   */
  async getPrices (): Promise<PriceData> {
    const now = Date.now()

    // Check if we need to fetch new data
    if (now - this.lastFetchTime >= this.FETCH_INTERVAL) {
      console.log('Cache expired, fetching fresh price data...')
      await this.fetchAndCachePrices()
    } else {
      console.log(`Using cached data, next fetch in ${Math.round((this.FETCH_INTERVAL - (now - this.lastFetchTime)) / 1000)}s`)
    }

    return this.getCachedPrices()
  }

  /**
   * Fetch fresh price data from the API and cache it
   */
  async fetchAndCachePrices (): Promise<void> {
    if (this.isFetching) {
      console.log('Already fetching, skipping...')
      return
    }

    this.isFetching = true

    try {
      console.log('🔄 Fetching fresh price data from OSRS Wiki API...')

      // Get rotating API headers for this request
      const headers = apiRotation.getCurrentHeaders()
      console.log(`🔄 Using identity: ${headers['User-Agent']}`)

      // Fetch both latest prices and volume data
      const [latestResponse, volumeResponse] = await Promise.all([
        axios.get(`${this.API_BASE_URL}/latest`, { headers }),
        axios.get(`${this.API_BASE_URL}/5m`, { headers })
      ])

      const latestData: PriceData = latestResponse.data.data || latestResponse.data
      const volumeData: VolumeData = volumeResponse.data.data || volumeResponse.data

      // Merge volume data with price data
      const mergedData: any = {}
      for (const itemId in latestData) {
        mergedData[itemId] = {
          ...latestData[itemId],
          volume: volumeData[itemId]?.volume || 0
        }
      }

      // Save to database
      await this.savePricesToDatabase(mergedData)

      this.lastFetchTime = Date.now()
      this.retryCount = 0 // Reset retry count on success
      console.log(`✅ Successfully cached ${Object.keys(mergedData).length} items`)
    } catch (error) {
      console.error('❌ Error fetching prices:', error)
      
      // Handle rate limiting with API rotation and retry
      if (this.isRateLimitError(error) && this.retryCount < this.MAX_RETRIES) {
        console.warn(`🔄 Rate limit detected, attempt ${this.retryCount + 1}/${this.MAX_RETRIES}`)
        
        const { delayMs } = apiRotation.handleRateLimit()
        this.retryCount++
        
        // Wait and retry with new identity
        await new Promise(resolve => setTimeout(resolve, delayMs))
        console.log(`⏳ Retrying after ${delayMs}ms delay...`)
        
        // Recursively retry with new identity
        return this.fetchAndCachePrices()
      }
      
      throw error
    } finally {
      this.isFetching = false
    }
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (error.response) {
      const status = error.response.status
      // Common rate limit status codes
      return status === 429 || status === 503 || status === 502
    }
    
    // Check error message for rate limit indicators
    const message = error.message?.toLowerCase() || ''
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('quota exceeded')
  }

  /**
   * Save price data to database
   */
  private async savePricesToDatabase (priceData: any): Promise<void> {
    const timestamp = new Date()
    const records = []

    for (const [itemId, data] of Object.entries(priceData)) {
      const typedData = data as any
      records.push({
        itemId: parseInt(itemId),
        timestamp,
        highPrice: typedData.high || 0,
        lowPrice: typedData.low || 0,
        volume: typedData.volume || 0,
        timeframe: 'latest'
      })
    }

    // Insert in batches to avoid overwhelming the database
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      try {
        await db.insert(itemPriceHistory).values(batch)
      } catch (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
      }
    }

    console.log(`💾 Saved ${records.length} price records to database`)
  }

  /**
   * Get cached prices from database
   */
  private async getCachedPrices (): Promise<PriceData> {
    try {
      // Get the most recent price data for each item
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000)

      const latestPrices = await db
        .select({
          itemId: itemPriceHistory.itemId,
          highPrice: itemPriceHistory.high,
          lowPrice: itemPriceHistory.low,
          volume: itemPriceHistory.volume,
          timestamp: itemPriceHistory.timestamp
        })
        .from(itemPriceHistory)
        .where(
          and(
            eq(itemPriceHistory.timeframe, 'latest'),
            gte(itemPriceHistory.timestamp, oneMinuteAgo)
          )
        )
        .orderBy(desc(itemPriceHistory.timestamp))

      // Group by item ID and get the most recent for each
      const priceMap: PriceData = {}
      const seenItems = new Set<number>()

      for (const price of latestPrices) {
        if (!seenItems.has(price.itemId)) {
          seenItems.add(price.itemId)
          priceMap[price.itemId.toString()] = {
            high: price.highPrice || 0,
            low: price.lowPrice || 0,
            highTime: Math.floor(price.timestamp.getTime() / 1000),
            lowTime: Math.floor(price.timestamp.getTime() / 1000)
          }
        }
      }

      console.log(`📊 Retrieved ${Object.keys(priceMap).length} items from cache`)
      return priceMap
    } catch (error) {
      console.error('❌ Error getting cached prices:', error)
      return {}
    }
  }

  /**
   * Get prices for specific items
   */
  async getItemPrices (itemIds: number[]): Promise<PriceData> {
    const allPrices = await this.getPrices()
    const filteredPrices: PriceData = {}

    for (const itemId of itemIds) {
      const itemIdStr = itemId.toString()
      if (allPrices[itemIdStr]) {
        filteredPrices[itemIdStr] = allPrices[itemIdStr]
      }
    }

    return filteredPrices
  }

  /**
   * Get high volume items
   */
  async getHighVolumeItems (limit = 100): Promise<any[]> {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

      const highVolumeItems = await db
        .select({
          itemId: itemPriceHistory.itemId,
          highPrice: itemPriceHistory.high,
          lowPrice: itemPriceHistory.low,
          volume: itemPriceHistory.volume,
          timestamp: itemPriceHistory.timestamp
        })
        .from(itemPriceHistory)
        .where(
          and(
            eq(itemPriceHistory.timeframe, 'latest'),
            gte(itemPriceHistory.timestamp, tenMinutesAgo)
          )
        )
        .orderBy(desc(itemPriceHistory.volume))
        .limit(limit)

      return highVolumeItems.map(item => ({
        itemId: item.itemId,
        high: item.highPrice,
        low: item.lowPrice,
        volume: item.volume,
        timestamp: item.timestamp
      }))
    } catch (error) {
      console.error('❌ Error getting high volume items:', error)
      return []
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats (): Promise<any> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      const stats = await db
        .select({
          itemId: itemPriceHistory.itemId,
          timestamp: itemPriceHistory.timestamp
        })
        .from(itemPriceHistory)
        .where(
          and(
            eq(itemPriceHistory.timeframe, 'latest'),
            gte(itemPriceHistory.timestamp, oneHourAgo)
          )
        )

      const uniqueItems = new Set(stats.map(s => s.itemId)).size
      const totalRecords = stats.length
      const lastUpdate = stats.length > 0 ? Math.max(...stats.map(s => s.timestamp.getTime())) : 0

      return {
        uniqueItems,
        totalRecords,
        lastUpdate: new Date(lastUpdate),
        cacheAge: Date.now() - this.lastFetchTime,
        nextFetch: new Date(this.lastFetchTime + this.FETCH_INTERVAL)
      }
    } catch (error) {
      console.error('❌ Error getting cache stats:', error)
      return { error: (error as Error).message }
    }
  }

  /**
   * Force refresh cache
   */
  async forceRefresh (): Promise<void> {
    console.log('🔄 Force refreshing price cache...')
    this.lastFetchTime = 0
    await this.fetchAndCachePrices()
  }

  /**
   * Start automatic price fetching
   */
  startPeriodicFetching (): void {
    console.log('🚀 Starting periodic price fetching every 2 minutes...')

    // Immediate fetch
    this.fetchAndCachePrices()

    // Set up interval
    setInterval(() => {
      this.fetchAndCachePrices()
    }, this.FETCH_INTERVAL)
  }
}

export default PriceCacheService.getInstance()
