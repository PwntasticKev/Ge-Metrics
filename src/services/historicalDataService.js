import { db } from '../db'
import { historicalData } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import axios from 'axios'
import { getLatestTimestamp } from '../utils/data-utils'

const USER_AGENT = 'Ge-Metrics OSRS Trading App - Price Scraper (contact@ge-metrics.com)'

class HistoricalDataService {
  constructor () {
    this.baseUrl = 'https://prices.runescape.wiki/api/v1/osrs'
    this.userAgent = 'Ge-Metrics Historical Data Collector - Contact: admin@ge-metrics.com'
    this.requestDelay = 100 // 100ms between requests to be respectful
  }

  /**
   * Get all current prices and volumes for all items
   */
  async fetchLatestPrices () {
    try {
      const response = await fetch(`${this.baseUrl}/latest`, {
        headers: {
          'User-Agent': this.userAgent
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Fetched latest prices for ${Object.keys(data).length} items`)
      return data
    } catch (error) {
      console.error('Error fetching latest prices:', error)
      throw error
    }
  }

  /**
   * Get item mapping (ID to name mapping)
   */
  async fetchItemMapping () {
    try {
      const response = await fetch(`${this.baseUrl}/mapping`, {
        headers: {
          'User-Agent': this.userAgent
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Fetched mapping for ${data.length} items`)
      return data
    } catch (error) {
      console.error('Error fetching item mapping:', error)
      throw error
    }
  }

  /**
   * Get 5-minute averages for a specific timestamp
   */
  async fetch5MinuteData (timestamp = null) {
    try {
      let url = `${this.baseUrl}/5m`
      if (timestamp) {
        url += `?timestamp=${timestamp}`
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Fetched 5-minute data for ${Object.keys(data.data || data).length} items`)
      return data
    } catch (error) {
      console.error('Error fetching 5-minute data:', error)
      throw error
    }
  }

  /**
   * Get 1-hour averages for a specific timestamp
   */
  async fetch1HourData (timestamp = null) {
    try {
      let url = `${this.baseUrl}/1h`
      if (timestamp) {
        url += `?timestamp=${timestamp}`
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Fetched 1-hour data for ${Object.keys(data.data || data).length} items`)
      return data
    } catch (error) {
      console.error('Error fetching 1-hour data:', error)
      throw error
    }
  }

  /**
   * Get time-series data for a specific item
   */
  async fetchTimeSeries (itemId, timestep = '24h') {
    try {
      const url = `${this.baseUrl}/timeseries?id=${itemId}&timestep=${timestep}`

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Fetched time-series data for item ${itemId}: ${data.data?.length || 0} data points`)
      return data
    } catch (error) {
      console.error(`Error fetching time-series for item ${itemId}:`, error)
      throw error
    }
  }

  /**
   * Transform API data to database format
   */
  transformPriceData (apiData, timestamp = null) {
    const transformedData = []
    const currentTimestamp = timestamp || new Date()

    for (const [itemId, priceData] of Object.entries(apiData)) {
      if (priceData && (priceData.high || priceData.low)) {
        transformedData.push({
          item_id: parseInt(itemId),
          timestamp: currentTimestamp,
          high_price: priceData.high || null,
          low_price: priceData.low || null,
          volume: priceData.volume || null
        })
      }
    }

    return transformedData
  }

  /**
   * Collect current prices and save to database
   */
  async collectCurrentPrices () {
    try {
      console.log('Starting current price collection...')

      const latestPrices = await this.fetchLatestPrices()
      const transformedData = this.transformPriceData(latestPrices)

      console.log(`Transformed ${transformedData.length} price records`)

      // Here you would save to your database
      // Example: await this.savePriceData(transformedData)

      return {
        success: true,
        recordsProcessed: transformedData.length,
        data: transformedData
      }
    } catch (error) {
      console.error('Error collecting current prices:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Collect historical data for specific items
   */
  async collectItemHistory (itemIds, timestep = '24h') {
    try {
      console.log(`Starting historical data collection for ${itemIds.length} items...`)

      const results = []

      for (const itemId of itemIds) {
        try {
          const timeSeriesData = await this.fetchTimeSeries(itemId, timestep)

          if (timeSeriesData.data && timeSeriesData.data.length > 0) {
            const transformedData = timeSeriesData.data.map(dataPoint => ({
              item_id: parseInt(itemId),
              timestamp: new Date(dataPoint[0] * 1000), // Convert Unix timestamp
              high_price: dataPoint[1] || null,
              low_price: dataPoint[1] || null, // API doesn't separate high/low in timeseries
              volume: dataPoint[2] || null
            }))

            results.push({
              itemId,
              records: transformedData.length,
              data: transformedData
            })
          }

          // Be respectful to the API
          await this.delay(this.requestDelay)
        } catch (error) {
          console.error(`Error collecting history for item ${itemId}:`, error)
          results.push({
            itemId,
            error: error.message
          })
        }
      }

      console.log(`Historical data collection completed for ${results.length} items`)
      return results
    } catch (error) {
      console.error('Error in collectItemHistory:', error)
      throw error
    }
  }

  /**
   * Get high volume items for monitoring
   */
  async getHighVolumeItems (limit = 100) {
    try {
      const latestPrices = await this.fetchLatestPrices()

      // Filter and sort by volume
      const itemsWithVolume = Object.entries(latestPrices)
        .filter(([itemId, data]) => data.volume && data.volume > 0)
        .sort(([, a], [, b]) => (b.volume || 0) - (a.volume || 0))
        .slice(0, limit)

      return itemsWithVolume.map(([itemId, data]) => ({
        item_id: parseInt(itemId),
        volume: data.volume,
        high_price: data.high,
        low_price: data.low
      }))
    } catch (error) {
      console.error('Error getting high volume items:', error)
      throw error
    }
  }

  /**
   * Collect comprehensive historical data for all items
   */
  async collectAllHistoricalData (timesteps = ['5m', '1h', '24h']) {
    try {
      console.log('Starting comprehensive historical data collection...')

      // Get item mapping first
      const itemMapping = await this.fetchItemMapping()
      const allItemIds = itemMapping.map(item => item.id)

      console.log(`Found ${allItemIds.length} total items`)

      const results = {
        totalItems: allItemIds.length,
        timesteps: {},
        errors: []
      }

      // Collect data for each timestep
      for (const timestep of timesteps) {
        console.log(`Collecting ${timestep} data...`)
        try {
          const timestepResults = await this.collectItemHistory(allItemIds, timestep)
          results.timesteps[timestep] = timestepResults
        } catch (error) {
          console.error(`Error collecting ${timestep} data:`, error)
          results.errors.push({
            timestep,
            error: error.message
          })
        }
      }

      return results
    } catch (error) {
      console.error('Error in comprehensive data collection:', error)
      throw error
    }
  }

  /**
   * Utility function to add delay between requests
   */
  delay (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get statistics about collected data
   */
  getCollectionStats (results) {
    const stats = {
      totalItems: 0,
      totalRecords: 0,
      successfulItems: 0,
      failedItems: 0,
      timesteps: {}
    }

    if (results.timesteps) {
      for (const [timestep, timestepResults] of Object.entries(results.timesteps)) {
        const timestepStats = {
          items: timestepResults.length,
          records: 0,
          successful: 0,
          failed: 0
        }

        timestepResults.forEach(result => {
          if (result.data) {
            timestepStats.successful++
            timestepStats.records += result.records || result.data.length
          } else {
            timestepStats.failed++
          }
        })

        stats.timesteps[timestep] = timestepStats
        stats.totalItems += timestepStats.items
        stats.totalRecords += timestepStats.records
        stats.successfulItems += timestepStats.successful
        stats.failedItems += timestepStats.failed
      }
    }

    return stats
  }

  /**
   * Save price data to database (implement based on your database choice)
   */
  async savePriceData (priceData) {
    // This would be implemented based on your database
    // Example for Prisma:
    /*
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    try {
      const result = await prisma.item_price_history.createMany({
        data: priceData,
        skipDuplicates: true
      })

      console.log(`Saved ${result.count} price records to database`)
      return result
    } catch (error) {
      console.error('Error saving price data:', error)
      throw error
    } finally {
      await prisma.$disconnect()
    }
    */

    console.log(`Would save ${priceData.length} records to database`)
    return { count: priceData.length }
  }
}

export default HistoricalDataService
