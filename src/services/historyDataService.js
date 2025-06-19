import axios from 'axios'

class HistoryDataService {
  constructor () {
    this.baseURL = 'https://prices.runescape.wiki/api/v1/osrs'
    this.userAgent = 'Ge-Metrics Price History Collector - Contact: admin@ge-metrics.com'
  }

  // Set up axios with proper headers
  getAxiosConfig () {
    return {
      headers: {
        'User-Agent': this.userAgent
      }
    }
  }

  // Fetch latest prices with volume data for all items
  async fetchLatestPrices () {
    try {
      const response = await axios.get(`${this.baseURL}/latest`, this.getAxiosConfig())
      return response.data
    } catch (error) {
      console.error('Error fetching latest prices:', error)
      throw error
    }
  }

  // Fetch 5-minute price data
  async fetch5MinuteData (timestamp = null) {
    try {
      const url = timestamp
        ? `${this.baseURL}/5m?timestamp=${timestamp}`
        : `${this.baseURL}/5m`
      const response = await axios.get(url, this.getAxiosConfig())
      return response.data
    } catch (error) {
      console.error('Error fetching 5-minute data:', error)
      throw error
    }
  }

  // Fetch 1-hour price data
  async fetch1HourData (timestamp = null) {
    try {
      const url = timestamp
        ? `${this.baseURL}/1h?timestamp=${timestamp}`
        : `${this.baseURL}/1h`
      const response = await axios.get(url, this.getAxiosConfig())
      return response.data
    } catch (error) {
      console.error('Error fetching 1-hour data:', error)
      throw error
    }
  }

  // Fetch time series data for a specific item
  async fetchTimeSeries (itemId, timestep = '1h') {
    try {
      const response = await axios.get(
        `${this.baseURL}/timeseries?id=${itemId}&timestep=${timestep}`,
        this.getAxiosConfig()
      )
      return response.data
    } catch (error) {
      console.error(`Error fetching time series for item ${itemId}:`, error)
      throw error
    }
  }

  // Transform API data to database format
  transformPriceData (apiData, timestamp = null) {
    const records = []
    const currentTime = timestamp || new Date()

    Object.entries(apiData).forEach(([itemId, priceData]) => {
      if (priceData && typeof priceData === 'object') {
        records.push({
          item_id: parseInt(itemId),
          timestamp: currentTime,
          high_price: priceData.high || null,
          low_price: priceData.low || null,
          volume: priceData.volume || null
        })
      }
    })

    return records
  }

  // Save price history to database (this would need to be implemented with your DB layer)
  async savePriceHistory (records) {
    try {
      // This is a placeholder - you would implement the actual database save logic here
      // For example, using Prisma:
      // const savedRecords = await prisma.item_price_history.createMany({
      //   data: records,
      //   skipDuplicates: true
      // })
      // return savedRecords

      console.log(`Would save ${records.length} price history records to database`)
      return { count: records.length }
    } catch (error) {
      console.error('Error saving price history:', error)
      throw error
    }
  }

  // Collect and save current price data
  async collectCurrentPrices () {
    try {
      console.log('Fetching latest prices...')
      const latestPrices = await this.fetchLatestPrices()

      const records = this.transformPriceData(latestPrices)
      console.log(`Transformed ${records.length} price records`)

      const result = await this.savePriceHistory(records)
      console.log(`Saved price history: ${result.count} records`)

      return result
    } catch (error) {
      console.error('Error collecting current prices:', error)
      throw error
    }
  }

  // Collect historical data for a specific item
  async collectItemHistory (itemId, timestep = '1h') {
    try {
      console.log(`Fetching historical data for item ${itemId}...`)
      const timeSeriesData = await this.fetchTimeSeries(itemId, timestep)

      if (!timeSeriesData || !timeSeriesData.data || !timeSeriesData.data[itemId]) {
        console.log(`No historical data found for item ${itemId}`)
        return { count: 0 }
      }

      const itemData = timeSeriesData.data[itemId]
      const records = []

      itemData.forEach(dataPoint => {
        if (Array.isArray(dataPoint) && dataPoint.length >= 2) {
          const [timestamp, price, volume] = dataPoint
          records.push({
            item_id: parseInt(itemId),
            timestamp: new Date(timestamp * 1000), // Convert Unix timestamp to Date
            high_price: price,
            low_price: price, // For time series, we might only have one price
            volume: volume || null
          })
        }
      })

      console.log(`Transformed ${records.length} historical records for item ${itemId}`)
      const result = await this.savePriceHistory(records)
      console.log(`Saved historical data: ${result.count} records`)

      return result
    } catch (error) {
      console.error(`Error collecting history for item ${itemId}:`, error)
      throw error
    }
  }

  // Get high volume items from latest data
  async getHighVolumeItems (limit = 100) {
    try {
      const latestPrices = await this.fetchLatestPrices()

      // Convert to array and sort by volume
      const itemsWithVolume = Object.entries(latestPrices)
        .map(([itemId, data]) => ({
          itemId: parseInt(itemId),
          ...data
        }))
        .filter(item => item.volume && item.volume > 0)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, limit)

      return itemsWithVolume
    } catch (error) {
      console.error('Error getting high volume items:', error)
      throw error
    }
  }
}

export default new HistoryDataService()
