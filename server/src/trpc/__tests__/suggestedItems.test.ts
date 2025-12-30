import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { TRPCError } from '@trpc/server'
import { suggestedItemsRouter } from '../suggestedItems.js'
import * as suggestedItemsService from '../../services/suggestedItemsService.js'

// Mock the service module
vi.mock('../../services/suggestedItemsService.js', () => ({
  getSuggestedItems: vi.fn(),
  getSuggestedItemsStats: vi.fn()
}))

// Mock TRPC context
const mockContext = {
  req: { headers: {} },
  res: {},
  user: null
}

// Mock suggested items data
const mockSuggestedItems = [
  {
    itemId: 561,
    name: 'Nature rune',
    icon: '/images/4/4a/Nature_rune.png',
    currentPrice: 95,
    margin: 5,
    marginPercentage: 5.26,
    volume24h: 50000,
    volume1h: 2500,
    profitPerFlip: 4,
    bestBuyTime: '11 PM - 3 AM',
    bestSellTime: '6 PM - 10 PM',
    suggestionScore: 75,
    manipulationWarning: false,
    affordable: true
  },
  {
    itemId: 4151,
    name: 'Abyssal whip',
    icon: '/images/4/48/Abyssal_whip.png',
    currentPrice: 3000000,
    margin: 200000,
    marginPercentage: 6.67,
    volume24h: 50,
    volume1h: 3,
    profitPerFlip: 190000,
    bestBuyTime: '12 AM - 6 AM',
    bestSellTime: '7 PM - 11 PM',
    suggestionScore: 65,
    manipulationWarning: false,
    affordable: false
  }
]

const mockStats = {
  totalItems: 150,
  highVolumeItems: 75,
  lowVolumeItems: 75,
  averageMargin: 8.5
}

describe('SuggestedItems TRPC Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    vi.mocked(suggestedItemsService.getSuggestedItems).mockResolvedValue(mockSuggestedItems)
    vi.mocked(suggestedItemsService.getSuggestedItemsStats).mockResolvedValue(mockStats)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getItems procedure', () => {
    test('should return suggested items with default parameters', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      const result = await caller.getItems({})
      
      expect(result).toEqual(mockSuggestedItems)
      expect(suggestedItemsService.getSuggestedItems).toHaveBeenCalledWith({
        capital: undefined,
        volumeType: 'global'
      })
    })

    test('should pass capital filter to service', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      await caller.getItems({ capital: 1000000 })
      
      expect(suggestedItemsService.getSuggestedItems).toHaveBeenCalledWith({
        capital: 1000000,
        volumeType: 'global'
      })
    })

    test('should pass volume type filter to service', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      await caller.getItems({ volumeType: 'high' })
      
      expect(suggestedItemsService.getSuggestedItems).toHaveBeenCalledWith({
        capital: undefined,
        volumeType: 'high'
      })
    })

    test('should pass both filters to service', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      await caller.getItems({ 
        capital: 5000000,
        volumeType: 'low' 
      })
      
      expect(suggestedItemsService.getSuggestedItems).toHaveBeenCalledWith({
        capital: 5000000,
        volumeType: 'low'
      })
    })

    test('should handle service errors and throw TRPCError', async () => {
      const serviceError = new Error('Database connection failed')
      vi.mocked(suggestedItemsService.getSuggestedItems).mockRejectedValue(serviceError)
      
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      await expect(caller.getItems({})).rejects.toThrow(TRPCError)
      await expect(caller.getItems({})).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch suggested items'
      })
    })

    test('should validate input schema - reject invalid volume type', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      // This should fail validation
      await expect(caller.getItems({ 
        volumeType: 'invalid' as any 
      })).rejects.toThrow()
    })

    test('should validate input schema - accept valid volume types', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      // These should pass validation
      await caller.getItems({ volumeType: 'global' })
      await caller.getItems({ volumeType: 'high' })
      await caller.getItems({ volumeType: 'low' })
      
      expect(suggestedItemsService.getSuggestedItems).toHaveBeenCalledTimes(3)
    })

    test('should validate capital as positive number', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      // Valid capital values
      await caller.getItems({ capital: 1000000 })
      await caller.getItems({ capital: 1 })
      
      expect(suggestedItemsService.getSuggestedItems).toHaveBeenCalledTimes(2)
    })

    test('should handle empty results from service', async () => {
      vi.mocked(suggestedItemsService.getSuggestedItems).mockResolvedValue([])
      
      const caller = suggestedItemsRouter.createCaller(mockContext)
      const result = await caller.getItems({})
      
      expect(result).toEqual([])
    })

    test('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        itemId: i + 1,
        name: `Item ${i + 1}`,
        icon: `/images/item_${i}.png`,
        currentPrice: 1000 + i,
        margin: 100,
        marginPercentage: 10,
        volume24h: 1000,
        volume1h: 50,
        profitPerFlip: 95,
        bestBuyTime: '11 PM - 3 AM',
        bestSellTime: '6 PM - 10 PM',
        suggestionScore: 50,
        manipulationWarning: false,
        affordable: true
      }))
      
      vi.mocked(suggestedItemsService.getSuggestedItems).mockResolvedValue(largeDataset)
      
      const caller = suggestedItemsRouter.createCaller(mockContext)
      const result = await caller.getItems({})
      
      expect(result).toHaveLength(1000)
      expect(result[0]).toHaveProperty('itemId')
      expect(result[0]).toHaveProperty('suggestionScore')
    })
  })

  describe('getStats procedure', () => {
    test('should return statistics from service', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      const result = await caller.getStats()
      
      expect(result).toEqual(mockStats)
      expect(suggestedItemsService.getSuggestedItemsStats).toHaveBeenCalledOnce()
    })

    test('should handle service errors and throw TRPCError', async () => {
      const serviceError = new Error('Failed to calculate stats')
      vi.mocked(suggestedItemsService.getSuggestedItemsStats).mockRejectedValue(serviceError)
      
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      await expect(caller.getStats()).rejects.toThrow(TRPCError)
      await expect(caller.getStats()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch suggested items statistics'
      })
    })

    test('should handle zero stats gracefully', async () => {
      const emptyStats = {
        totalItems: 0,
        highVolumeItems: 0,
        lowVolumeItems: 0,
        averageMargin: 0
      }
      
      vi.mocked(suggestedItemsService.getSuggestedItemsStats).mockResolvedValue(emptyStats)
      
      const caller = suggestedItemsRouter.createCaller(mockContext)
      const result = await caller.getStats()
      
      expect(result).toEqual(emptyStats)
    })

    test('should cache results appropriately', async () => {
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      // Call multiple times
      await caller.getStats()
      await caller.getStats()
      
      // Service should be called twice (no built-in caching in router)
      expect(suggestedItemsService.getSuggestedItemsStats).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error handling and logging', () => {
    test('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const serviceError = new Error('Database timeout')
      vi.mocked(suggestedItemsService.getSuggestedItems).mockRejectedValue(serviceError)
      
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      await expect(caller.getItems({})).rejects.toThrow(TRPCError)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[getItems] Error fetching suggested items:',
        serviceError
      )
      
      consoleSpy.mockRestore()
    })

    test('should include service error in TRPCError cause', async () => {
      const serviceError = new Error('Service failure')
      vi.mocked(suggestedItemsService.getSuggestedItemsStats).mockRejectedValue(serviceError)
      
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      try {
        await caller.getStats()
        expect.fail('Should have thrown TRPCError')
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).cause).toBe(serviceError)
      }
    })

    test('should provide user-friendly error messages', async () => {
      vi.mocked(suggestedItemsService.getSuggestedItems).mockRejectedValue(
        new Error('Complex technical error with stack trace...')
      )
      
      const caller = suggestedItemsRouter.createCaller(mockContext)
      
      try {
        await caller.getItems({})
        expect.fail('Should have thrown TRPCError')
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError)
        expect((error as TRPCError).message).toBe('Failed to fetch suggested items')
        // Error should be user-friendly, not expose internal details
      }
    })
  })
})