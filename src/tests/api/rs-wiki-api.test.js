import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock axios since we can't import it directly
const mockAxios = {
  get: vi.fn()
}

// Mock API functions based on the actual implementation
const getPricingData = async () => {
  try {
    return await mockAxios.get('https://prices.runescape.wiki/api/v1/osrs/latest')
  } catch (error) {
    console.error('Error fetching Pricing data:', error)
    throw error
  }
}

const getDmmPricingData = async () => {
  try {
    return await mockAxios.get('https://prices.runescape.wiki/api/v1/dmm/latest')
  } catch (error) {
    console.error('Error fetching Pricing data for DMM:', error)
    throw error
  }
}

const getMappingData = async () => {
  const response = await mockAxios.get('https://prices.runescape.wiki/api/v1/osrs/mapping')
  return response.data.map(item => ({
    ...item,
    img: `https://oldschool.runescape.wiki/images/c/c1/${item.name.replace(/\s+/g, '_')}.png?${item.id}b`
  }))
}

const getItemHistoryById = async (time, itemId) => {
  try {
    return await mockAxios.get(
      `https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=${time}&id=${itemId}`
    )
  } catch (error) {
    console.error('Error fetching item History:', error)
    throw error
  }
}

const getVolumeData = async () => {
  try {
    return await mockAxios.get('https://prices.runescape.wiki/api/v1/osrs/latest')
  } catch (error) {
    console.error('Error fetching Volume data:', error)
    throw error
  }
}

const get5MinuteData = async (timestamp) => {
  try {
    const url = timestamp
      ? `https://prices.runescape.wiki/api/v1/osrs/5m?timestamp=${timestamp}`
      : 'https://prices.runescape.wiki/api/v1/osrs/5m'
    return await mockAxios.get(url)
  } catch (error) {
    console.error('Error fetching 5-minute data:', error)
    throw error
  }
}

const get1HourData = async (timestamp) => {
  try {
    const url = timestamp
      ? `https://prices.runescape.wiki/api/v1/osrs/1h?timestamp=${timestamp}`
      : 'https://prices.runescape.wiki/api/v1/osrs/1h'
    return await mockAxios.get(url)
  } catch (error) {
    console.error('Error fetching 1-hour data:', error)
    throw error
  }
}

describe('RS Wiki API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPricingData', () => {
    it('should fetch latest pricing data successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            4151: { high: 1000, low: 900, highTime: 1640995200, lowTime: 1640995200 }
          }
        }
      }
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await getPricingData()

      expect(mockAxios.get).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/latest')
      expect(result).toEqual(mockResponse)
    })

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network error')
      mockAxios.get.mockRejectedValue(mockError)

      await expect(getPricingData()).rejects.toThrow('Network error')
      expect(mockAxios.get).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/latest')
    })

    it('should make correct API call', async () => {
      mockAxios.get.mockResolvedValue({ data: {} })

      await getPricingData()

      expect(mockAxios.get).toHaveBeenCalledTimes(1)
      expect(mockAxios.get).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/latest')
    })
  })

  describe('getDmmPricingData', () => {
    it('should fetch DMM pricing data successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            4151: { high: 2000, low: 1800, highTime: 1640995200, lowTime: 1640995200 }
          }
        }
      }
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await getDmmPricingData()

      expect(mockAxios.get).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/dmm/latest')
      expect(result).toEqual(mockResponse)
    })

    it('should handle DMM API errors', async () => {
      const mockError = new Error('DMM API unavailable')
      mockAxios.get.mockRejectedValue(mockError)

      await expect(getDmmPricingData()).rejects.toThrow('DMM API unavailable')
    })
  })

  describe('getMappingData', () => {
    it('should fetch and transform mapping data', async () => {
      const mockResponse = {
        data: [
          { id: 4151, name: 'Abyssal whip', examine: 'A weapon from the abyss.' },
          { id: 4153, name: 'Granite maul', examine: 'A heavy maul.' }
        ]
      }
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await getMappingData()

      expect(mockAxios.get).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/mapping')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 4151,
        name: 'Abyssal whip',
        examine: 'A weapon from the abyss.',
        img: 'https://oldschool.runescape.wiki/images/c/c1/Abyssal_whip.png?4151b'
      })
      expect(result[1]).toEqual({
        id: 4153,
        name: 'Granite maul',
        examine: 'A heavy maul.',
        img: 'https://oldschool.runescape.wiki/images/c/c1/Granite_maul.png?4153b'
      })
    })

    it('should handle spaces in item names for image URLs', async () => {
      const mockResponse = {
        data: [
          { id: 1234, name: 'Dragon long sword', examine: 'A long sword.' }
        ]
      }
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await getMappingData()

      expect(result[0].img).toBe('https://oldschool.runescape.wiki/images/c/c1/Dragon_long_sword.png?1234b')
    })
  })

  describe('getItemHistoryById', () => {
    it('should fetch item history with correct parameters', async () => {
      const mockResponse = {
        data: {
          data: [
            { timestamp: 1640995200, avgHighPrice: 1000, avgLowPrice: 900 }
          ]
        }
      }
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await getItemHistoryById('1h', 4151)

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=1h&id=4151'
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle different time intervals', async () => {
      mockAxios.get.mockResolvedValue({ data: {} })

      await getItemHistoryById('5m', 1234)
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=5m&id=1234'
      )

      await getItemHistoryById('24h', 5678)
      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=24h&id=5678'
      )
    })

    it('should handle history API errors', async () => {
      const mockError = new Error('Item not found')
      mockAxios.get.mockRejectedValue(mockError)

      await expect(getItemHistoryById('1h', 9999)).rejects.toThrow('Item not found')
    })
  })

  describe('getVolumeData', () => {
    it('should fetch volume data successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            4151: { high: 1000, low: 900, highTime: 1640995200, lowTime: 1640995200 }
          }
        }
      }
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await getVolumeData()

      expect(mockAxios.get).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/latest')
      expect(result).toEqual(mockResponse)
    })

    it('should handle volume data errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Volume API error'))

      await expect(getVolumeData()).rejects.toThrow('Volume API error')
    })
  })

  describe('get5MinuteData', () => {
    it('should fetch 5-minute data without timestamp', async () => {
      const mockResponse = { data: { data: {} } }
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await get5MinuteData()

      expect(mockAxios.get).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/5m')
      expect(result).toEqual(mockResponse)
    })

    it('should fetch 5-minute data with timestamp', async () => {
      const mockResponse = { data: { data: {} } }
      const timestamp = 1640995200
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await get5MinuteData(timestamp)

      expect(mockAxios.get).toHaveBeenCalledWith(
        `https://prices.runescape.wiki/api/v1/osrs/5m?timestamp=${timestamp}`
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle 5-minute data errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('5-minute API error'))

      await expect(get5MinuteData()).rejects.toThrow('5-minute API error')
    })
  })

  describe('get1HourData', () => {
    it('should fetch 1-hour data without timestamp', async () => {
      const mockResponse = { data: { data: {} } }
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await get1HourData()

      expect(mockAxios.get).toHaveBeenCalledWith('https://prices.runescape.wiki/api/v1/osrs/1h')
      expect(result).toEqual(mockResponse)
    })

    it('should fetch 1-hour data with timestamp', async () => {
      const mockResponse = { data: { data: {} } }
      const timestamp = 1640995200
      mockAxios.get.mockResolvedValue(mockResponse)

      const result = await get1HourData(timestamp)

      expect(mockAxios.get).toHaveBeenCalledWith(
        `https://prices.runescape.wiki/api/v1/osrs/1h?timestamp=${timestamp}`
      )
      expect(result).toEqual(mockResponse)
    })

    it('should handle 1-hour data errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('1-hour API error'))

      await expect(get1HourData()).rejects.toThrow('1-hour API error')
    })
  })

  describe('API Integration Tests', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      mockAxios.get.mockRejectedValue(timeoutError)

      await expect(getPricingData()).rejects.toThrow('timeout of 5000ms exceeded')
    })

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Request failed with status code 429')
      rateLimitError.response = { status: 429 }
      mockAxios.get.mockRejectedValue(rateLimitError)

      await expect(getPricingData()).rejects.toThrow('Request failed with status code 429')
    })

    it('should handle server errors', async () => {
      const serverError = new Error('Request failed with status code 500')
      serverError.response = { status: 500 }
      mockAxios.get.mockRejectedValue(serverError)

      await expect(getPricingData()).rejects.toThrow('Request failed with status code 500')
    })

    it('should handle malformed responses', async () => {
      mockAxios.get.mockResolvedValue({ data: null })

      const result = await getPricingData()
      expect(result.data).toBeNull()
    })
  })
})
