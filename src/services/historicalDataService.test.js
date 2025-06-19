import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import HistoricalDataService from './historicalDataService'

// Mock fetch
global.fetch = vi.fn()

describe('HistoricalDataService', () => {
  let service

  beforeEach(() => {
    service = new HistoricalDataService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(service.baseUrl).toBe('https://prices.runescape.wiki/api/v1/osrs')
      expect(service.userAgent).toBe('Ge-Metrics Historical Data Collector - Contact: admin@ge-metrics.com')
      expect(service.requestDelay).toBe(100)
    })
  })

  describe('fetchLatestPrices', () => {
    it('should fetch latest prices successfully', async () => {
      const mockData = {
        4151: { high: 1000, low: 900, volume: 5000 },
        1515: { high: 2000, low: 1900, volume: 3000 }
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await service.fetchLatestPrices()

      expect(fetch).toHaveBeenCalledWith(
        'https://prices.runescape.wiki/api/v1/osrs/latest',
        {
          headers: {
            'User-Agent': 'Ge-Metrics Historical Data Collector - Contact: admin@ge-metrics.com'
          }
        }
      )
      expect(result).toEqual(mockData)
    })

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(service.fetchLatestPrices()).rejects.toThrow('HTTP error! status: 500')
    })

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(service.fetchLatestPrices()).rejects.toThrow('Network error')
    })
  })

  describe('fetchItemMapping', () => {
    it('should fetch item mapping successfully', async () => {
      const mockMapping = [
        { id: 4151, name: 'Abyssal whip', examine: 'A weapon from the abyss.' },
        { id: 1515, name: 'Yew logs', examine: 'Logs cut from a yew tree.' }
      ]

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMapping
      })

      const result = await service.fetchItemMapping()

      expect(fetch).toHaveBeenCalledWith(
        'https://prices.runescape.wiki/api/v1/osrs/mapping',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          })
        })
      )
      expect(result).toEqual(mockMapping)
    })
  })

  describe('fetch5MinuteData', () => {
    it('should fetch 5-minute data without timestamp', async () => {
      const mockData = { data: { 4151: { high: 1000, low: 900, volume: 100 } } }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await service.fetch5MinuteData()

      expect(fetch).toHaveBeenCalledWith(
        'https://prices.runescape.wiki/api/v1/osrs/5m',
        expect.any(Object)
      )
      expect(result).toEqual(mockData)
    })

    it('should fetch 5-minute data with timestamp', async () => {
      const timestamp = 1640995200
      const mockData = { data: { 4151: { high: 1000, low: 900, volume: 100 } } }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await service.fetch5MinuteData(timestamp)

      expect(fetch).toHaveBeenCalledWith(
        `https://prices.runescape.wiki/api/v1/osrs/5m?timestamp=${timestamp}`,
        expect.any(Object)
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('fetchTimeSeries', () => {
    it('should fetch time series data successfully', async () => {
      const itemId = 4151
      const timestep = '24h'
      const mockData = {
        data: [
          [1640995200, 1000, 5000],
          [1641081600, 1100, 5500]
        ]
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await service.fetchTimeSeries(itemId, timestep)

      expect(fetch).toHaveBeenCalledWith(
        `https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${itemId}&timestep=${timestep}`,
        expect.any(Object)
      )
      expect(result).toEqual(mockData)
    })

    it('should use default timestep of 24h', async () => {
      const itemId = 4151
      const mockData = { data: [] }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      await service.fetchTimeSeries(itemId)

      expect(fetch).toHaveBeenCalledWith(
        `https://prices.runescape.wiki/api/v1/osrs/timeseries?id=${itemId}&timestep=24h`,
        expect.any(Object)
      )
    })
  })

  describe('transformPriceData', () => {
    it('should transform API data to database format', () => {
      const apiData = {
        4151: { high: 1000, low: 900, volume: 5000 },
        1515: { high: 2000, low: 1900, volume: 3000 }
      }
      const timestamp = new Date('2024-01-01T00:00:00Z')

      const result = service.transformPriceData(apiData, timestamp)

      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          item_id: 4151,
          timestamp,
          high_price: 1000,
          low_price: 900,
          volume: 5000
        }),
        expect.objectContaining({
          item_id: 1515,
          timestamp,
          high_price: 2000,
          low_price: 1900,
          volume: 3000
        })
      ]))
    })

    it('should handle missing price data', () => {
      const apiData = {
        4151: null,
        1515: { high: null, low: null, volume: 100 }
      }

      const result = service.transformPriceData(apiData)

      expect(result).toEqual([])
    })

    it('should use current timestamp when none provided', () => {
      const apiData = {
        4151: { high: 1000, low: 900, volume: 5000 }
      }

      const result = service.transformPriceData(apiData)

      expect(result).toHaveLength(1)
      expect(result[0].timestamp).toBeInstanceOf(Date)
    })
  })

  describe('collectCurrentPrices', () => {
    it('should collect and transform current prices', async () => {
      const mockData = {
        4151: { high: 1000, low: 900, volume: 5000 }
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await service.collectCurrentPrices()

      expect(result.success).toBe(true)
      expect(result.recordsProcessed).toBe(1)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        item_id: 4151,
        high_price: 1000,
        low_price: 900,
        volume: 5000
      })
    })

    it('should handle collection errors', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'))

      const result = await service.collectCurrentPrices()

      expect(result.success).toBe(false)
      expect(result.error).toBe('API Error')
    })
  })

  describe('getHighVolumeItems', () => {
    it('should return top volume items', async () => {
      const mockData = {
        4151: { high: 1000, low: 900, volume: 10000 },
        1515: { high: 2000, low: 1900, volume: 5000 },
        999: { high: 500, low: 450, volume: 15000 }
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await service.getHighVolumeItems(2)

      expect(result).toHaveLength(2)
      expect(result[0].item_id).toBe(999) // Highest volume
      expect(result[0].volume).toBe(15000)
      expect(result[1].item_id).toBe(4151) // Second highest
      expect(result[1].volume).toBe(10000)
    })

    it('should filter out items without volume', async () => {
      const mockData = {
        4151: { high: 1000, low: 900, volume: 10000 },
        1515: { high: 2000, low: 1900, volume: null },
        999: { high: 500, low: 450 } // No volume property
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      })

      const result = await service.getHighVolumeItems()

      expect(result).toHaveLength(1)
      expect(result[0].item_id).toBe(4151)
    })
  })

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now()
      await service.delay(100)
      const end = Date.now()

      expect(end - start).toBeGreaterThanOrEqual(90) // Allow some variance
    })
  })

  describe('getCollectionStats', () => {
    it('should calculate statistics correctly', () => {
      const results = {
        timesteps: {
          '5m': [
            { data: [1, 2, 3], records: 3 },
            { data: [4, 5], records: 2 },
            { error: 'Failed' }
          ],
          '1h': [
            { data: [1, 2], records: 2 },
            { data: [3], records: 1 }
          ]
        }
      }

      const stats = service.getCollectionStats(results)

      expect(stats.timesteps['5m']).toEqual({
        items: 3,
        records: 5,
        successful: 2,
        failed: 1
      })
      expect(stats.timesteps['1h']).toEqual({
        items: 2,
        records: 3,
        successful: 2,
        failed: 0
      })
      expect(stats.totalItems).toBe(5)
      expect(stats.totalRecords).toBe(8)
      expect(stats.successfulItems).toBe(4)
      expect(stats.failedItems).toBe(1)
    })
  })

  describe('savePriceData', () => {
    it('should log save operation', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
      const priceData = [
        { item_id: 4151, timestamp: new Date(), high_price: 1000 }
      ]

      const result = await service.savePriceData(priceData)

      expect(consoleSpy).toHaveBeenCalledWith('Would save 1 records to database')
      expect(result.count).toBe(1)

      consoleSpy.mockRestore()
    })
  })
})
