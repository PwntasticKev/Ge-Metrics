const API_BASE_URL = 'http://localhost:4000/api/historical'

/**
 * Get cached historical data for an item
 * @param {string} timestep - Time interval (5m, 1h, 6h, 24h)
 * @param {number} itemId - Item ID
 * @returns {Promise<Object>} Historical data in OSRS Wiki API format
 */
export const getItemHistoryById = async (timestep, itemId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${itemId}?timestep=${timestep}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch historical data: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch historical data')
    }

    // Return in the same format as OSRS Wiki API for compatibility
    return {
      data: result.data
    }
  } catch (error) {
    console.error('Error fetching historical data:', error)
    throw error
  }
}

/**
 * Clear old cached historical data
 * @returns {Promise<Object>} Success status
 */
export const clearHistoricalCache = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/clear-cache`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`Failed to clear cache: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to clear cache')
    }

    return result
  } catch (error) {
    console.error('Error clearing historical cache:', error)
    throw error
  }
}
