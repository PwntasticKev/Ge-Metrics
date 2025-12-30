import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { getSuggestedItems, getSuggestedItemsStats } from '../suggestedItemsService.js'
import { db } from '../../db/index.js'

// Mock the database
vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([]))
        }))
      }))
    }))
  },
  itemVolumes: {},
  itemMapping: {}
}))

// Mock data that simulates realistic OSRS items
const mockItemData = [
  // High volume, good margin item (Nature Rune)
  {
    itemId: 561,
    name: 'Nature rune',
    icon: '/images/4/4a/Nature_rune.png',
    highPrice: 100,
    lowPrice: 95,
    highPriceVolume: 50000,
    lowPriceVolume: 45000,
    hourlyHighPriceVolume: 2500,
    hourlyLowPriceVolume: 2200,
    limit: 5000
  },
  // Low volume, high margin item (Abyssal Whip)
  {
    itemId: 4151,
    name: 'Abyssal whip',
    icon: '/images/4/48/Abyssal_whip.png',
    highPrice: 3200000,
    lowPrice: 3000000,
    highPriceVolume: 50,
    lowPriceVolume: 45,
    hourlyHighPriceVolume: 3,
    hourlyLowPriceVolume: 2,
    limit: 70
  },
  // Manipulated item (unusual volume spike)
  {
    itemId: 1234,
    name: 'Suspicious item',
    icon: '/images/suspicious.png',
    highPrice: 1000,
    lowPrice: 500, // 100% margin - suspicious
    highPriceVolume: 100,
    lowPriceVolume: 90,
    hourlyHighPriceVolume: 50, // 50% of daily volume in 1 hour - manipulation
    hourlyLowPriceVolume: 45,
    limit: 100
  },
  // Very expensive item (beyond most budgets)
  {
    itemId: 20997,
    name: 'Twisted bow',
    icon: '/images/twisted_bow.png',
    highPrice: 1500000000, // 1.5B
    lowPrice: 1400000000, // 1.4B
    highPriceVolume: 5,
    lowPriceVolume: 3,
    hourlyHighPriceVolume: 0,
    hourlyLowPriceVolume: 0,
    limit: 1
  },
  // Item with no profit margin
  {
    itemId: 995,
    name: 'Coins',
    icon: '/images/coins.png',
    highPrice: 1,
    lowPrice: 1,
    highPriceVolume: 1000000,
    lowPriceVolume: 1000000,
    hourlyHighPriceVolume: 50000,
    hourlyLowPriceVolume: 50000,
    limit: null
  }
]

describe('SuggestedItemsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock the complex query chain
    const mockQuery = {
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(mockItemData))
        }))
      }))
    }
    
    vi.mocked(db.select).mockReturnValue(mockQuery)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSuggestedItems', () => {
    test('should return items within capital budget', async () => {
      const result = await getSuggestedItems({ capital: 1000000 }) // 1M budget
      
      // Should exclude Twisted bow (1.4B) and Abyssal whip (3M)
      expect(result).toHaveLength(2) // Nature rune and Suspicious item
      
      const itemNames = result.map(item => item.name)
      expect(itemNames).toContain('Nature rune')
      expect(itemNames).toContain('Suspicious item')
      expect(itemNames).not.toContain('Twisted bow')
      expect(itemNames).not.toContain('Abyssal whip')
    })

    test('should return all affordable items with 1B capital', async () => {
      const result = await getSuggestedItems({ capital: 1000000000 }) // 1B budget
      
      // Should include Nature rune, Abyssal whip, and Suspicious item
      // Should exclude Twisted bow (1.4B) and Coins (no margin)
      expect(result).toHaveLength(3)
      
      const itemNames = result.map(item => item.name)
      expect(itemNames).toContain('Nature rune')
      expect(itemNames).toContain('Abyssal whip')
      expect(itemNames).toContain('Suspicious item')
      expect(itemNames).not.toContain('Twisted bow')
      expect(itemNames).not.toContain('Coins')
    })

    test('should filter by volume type - high volume only', async () => {
      const result = await getSuggestedItems({ 
        capital: 1000000000,
        volumeType: 'high'
      })
      
      // Only Nature rune and Suspicious item have >1000 volume
      expect(result).toHaveLength(2)
      
      const itemNames = result.map(item => item.name)
      expect(itemNames).toContain('Nature rune')
      expect(itemNames).toContain('Suspicious item')
      expect(itemNames).not.toContain('Abyssal whip') // Low volume
    })

    test('should filter by volume type - low volume only', async () => {
      const result = await getSuggestedItems({ 
        capital: 1000000000,
        volumeType: 'low'
      })
      
      // Only Abyssal whip has <1000 volume
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Abyssal whip')
    })

    test('should calculate margins correctly', async () => {
      const result = await getSuggestedItems({ capital: 1000000000 })
      
      const natureRune = result.find(item => item.name === 'Nature rune')
      expect(natureRune).toBeDefined()
      expect(natureRune!.margin).toBe(5) // 100 - 95
      expect(natureRune!.marginPercentage).toBeCloseTo(5.26, 1) // (5/95) * 100
      expect(natureRune!.profitPerFlip).toBe(4) // 5 * 0.95 (GE tax)
    })

    test('should detect market manipulation', async () => {
      const result = await getSuggestedItems({ capital: 1000000 })
      
      const suspiciousItem = result.find(item => item.name === 'Suspicious item')
      expect(suspiciousItem).toBeDefined()
      expect(suspiciousItem!.manipulationWarning).toBe(true)
      
      const natureRune = result.find(item => item.name === 'Nature rune')
      expect(natureRune).toBeDefined()
      expect(natureRune!.manipulationWarning).toBe(false)
    })

    test('should assign best buy/sell times based on volume', async () => {
      const result = await getSuggestedItems({ capital: 1000000000 })
      
      // High volume item should have specific time patterns
      const natureRune = result.find(item => item.name === 'Nature rune')
      expect(natureRune!.bestBuyTime).toBe('11 PM - 3 AM')
      expect(natureRune!.bestSellTime).toBe('6 PM - 10 PM')
      
      // Low volume item should have general guidance
      const abyssalWhip = result.find(item => item.name === 'Abyssal whip')
      expect(abyssalWhip!.bestBuyTime).toBe('12 AM - 6 AM')
      expect(abyssalWhip!.bestSellTime).toBe('7 PM - 11 PM')
    })

    test('should calculate suggestion scores', async () => {
      const result = await getSuggestedItems({ capital: 1000000000 })
      
      // All items should have suggestion scores
      result.forEach(item => {
        expect(item.suggestionScore).toBeGreaterThan(0)
        expect(item.suggestionScore).toBeLessThanOrEqual(100)
      })
      
      // Items should be sorted by score (highest first)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].suggestionScore).toBeLessThanOrEqual(result[i-1].suggestionScore)
      }
    })

    test('should exclude items with no margin', async () => {
      const result = await getSuggestedItems({ capital: 1000000000 })
      
      // Coins should be excluded (no profit margin)
      const itemNames = result.map(item => item.name)
      expect(itemNames).not.toContain('Coins')
    })

    test('should handle empty database gracefully', async () => {
      // Mock empty result
      const emptyQuery = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([]))
          }))
        }))
      }
      vi.mocked(db.select).mockReturnValue(emptyQuery)
      
      const result = await getSuggestedItems({ capital: 1000000 })
      expect(result).toEqual([])
    })

    test('should handle database errors', async () => {
      // Mock database error
      const errorQuery = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => Promise.reject(new Error('Database connection failed')))
          }))
        }))
      }
      vi.mocked(db.select).mockReturnValue(errorQuery)
      
      await expect(getSuggestedItems({ capital: 1000000 }))
        .rejects.toThrow('Database connection failed')
    })

    test('should limit results to 1000 items', async () => {
      // Create mock data with more than 1000 items
      const largeDataset = Array.from({ length: 1500 }, (_, i) => ({
        itemId: i + 1,
        name: `Item ${i + 1}`,
        icon: `/images/item_${i}.png`,
        highPrice: 1000 + i,
        lowPrice: 900 + i,
        highPriceVolume: 100,
        lowPriceVolume: 90,
        hourlyHighPriceVolume: 5,
        hourlyLowPriceVolume: 4,
        limit: 100
      }))
      
      const largeQuery = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve(largeDataset))
          }))
        }))
      }
      vi.mocked(db.select).mockReturnValue(largeQuery)
      
      const result = await getSuggestedItems({ capital: 1000000000 })
      expect(result).toHaveLength(1000)
    })
  })

  describe('getSuggestedItemsStats', () => {
    test('should return correct statistics', async () => {
      const stats = await getSuggestedItemsStats()
      
      expect(stats).toHaveProperty('totalItems')
      expect(stats).toHaveProperty('highVolumeItems')
      expect(stats).toHaveProperty('lowVolumeItems')
      expect(stats).toHaveProperty('averageMargin')
      
      expect(stats.totalItems).toBe(3) // Nature rune, Abyssal whip, Suspicious item
      expect(stats.highVolumeItems).toBe(2) // Nature rune, Suspicious item
      expect(stats.lowVolumeItems).toBe(1) // Abyssal whip
      expect(stats.averageMargin).toBeGreaterThan(0)
    })

    test('should handle empty results for statistics', async () => {
      // Mock empty result
      const emptyQuery = {
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([]))
          }))
        }))
      }
      vi.mocked(db.select).mockReturnValue(emptyQuery)
      
      const stats = await getSuggestedItemsStats()
      
      expect(stats.totalItems).toBe(0)
      expect(stats.highVolumeItems).toBe(0)
      expect(stats.lowVolumeItems).toBe(0)
      expect(stats.averageMargin).toBe(0)
    })
  })
})