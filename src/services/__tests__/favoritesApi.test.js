/**
 * Tests for favorites API service
 */
import {
  getUserFavorites,
  getUserFavoritesByType,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  isFavorited,
  getPotionFavorites,
  togglePotionFavorite
} from '../favoritesApi'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Favorites API Service', () => {
  const mockUserId = '1'
  const mockPotionName = 'Attack Potion'

  beforeEach(() => {
    fetch.mockClear()
  })

  describe('getUserFavorites', () => {
    it('should fetch all user favorites successfully', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 1,
            userId: 1,
            favoriteType: 'combination',
            favoriteId: 'Attack Potion',
            createdAt: '2025-09-19T14:34:47.268Z',
            updatedAt: '2025-09-19T14:34:47.268Z'
          }
        ]
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await getUserFavorites(mockUserId)

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/favorites/1')
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle API errors', async () => {
      const mockResponse = {
        success: false,
        error: 'User not found'
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      await expect(getUserFavorites(mockUserId)).rejects.toThrow('User not found')
    })
  })

  describe('getUserFavoritesByType', () => {
    it('should fetch user favorites by type successfully', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 1,
            userId: 1,
            favoriteType: 'combination',
            favoriteId: 'Attack Potion',
            createdAt: '2025-09-19T14:34:47.268Z',
            updatedAt: '2025-09-19T14:34:47.268Z'
          }
        ]
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await getUserFavoritesByType(mockUserId, 'combination')

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/favorites/1/combination')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('addFavorite', () => {
    it('should add favorite successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 1,
          userId: 1,
          favoriteType: 'combination',
          favoriteId: 'Attack Potion',
          createdAt: '2025-09-19T14:34:47.268Z',
          updatedAt: '2025-09-19T14:34:47.268Z'
        }
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await addFavorite(mockUserId, 'combination', mockPotionName)

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          favoriteType: 'combination',
          favoriteId: mockPotionName
        })
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('removeFavorite', () => {
    it('should remove favorite successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Favorite removed successfully'
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await removeFavorite(mockUserId, 'combination', mockPotionName)

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          favoriteType: 'combination',
          favoriteId: mockPotionName
        })
      })
      expect(result).toBe(true)
    })
  })

  describe('toggleFavorite', () => {
    it('should toggle favorite successfully', async () => {
      const mockResponse = {
        success: true,
        data: { isFavorited: true }
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await toggleFavorite(mockUserId, 'combination', mockPotionName)

      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          favoriteType: 'combination',
          favoriteId: mockPotionName
        })
      })
      expect(result).toEqual({ isFavorited: true })
    })
  })

  describe('isFavorited', () => {
    it('should check favorite status successfully', async () => {
      const mockResponse = {
        success: true,
        data: { isFavorited: true }
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await isFavorited(mockUserId, 'combination', mockPotionName)

      expect(fetch).toHaveBeenCalledWith(`http://localhost:4000/api/favorites/check/1/combination/${encodeURIComponent(mockPotionName)}`)
      expect(result).toBe(true)
    })
  })

  describe('getPotionFavorites', () => {
    it('should get potion favorites as array of names', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 1,
            userId: 1,
            favoriteType: 'combination',
            favoriteId: 'Attack Potion',
            createdAt: '2025-09-19T14:34:47.268Z',
            updatedAt: '2025-09-19T14:34:47.268Z'
          },
          {
            id: 2,
            userId: 1,
            favoriteType: 'combination',
            favoriteId: 'Strength Potion',
            createdAt: '2025-09-19T14:34:47.268Z',
            updatedAt: '2025-09-19T14:34:47.268Z'
          }
        ]
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await getPotionFavorites(mockUserId)

      expect(result).toEqual(['Attack Potion', 'Strength Potion'])
    })

    it('should return empty array on error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getPotionFavorites(mockUserId)

      expect(result).toEqual([])
    })
  })

  describe('togglePotionFavorite', () => {
    it('should toggle potion favorite and return new status', async () => {
      const mockResponse = {
        success: true,
        data: { isFavorited: true }
      }

      fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      const result = await togglePotionFavorite(mockUserId, mockPotionName)

      expect(result).toBe(true)
    })
  })
})
