import {
  LATEST_PRICES_URL,
  MAPPING_URL,
  TIMESERIES_URL,
  VOLUMES_URL
} from '../utils/constants'

// Fetches the latest price data for all items
export const getPricingData = async () => {
  try {
    const response = await fetch(LATEST_PRICES_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Failed to fetch pricing data:', error)
    return { success: false, error }
  }
}

// Fetches the item mapping data
export const getMappingData = async () => {
  try {
    const response = await fetch(MAPPING_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    // Ensure we always return an array, even if the API call fails or returns unexpected data.
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Failed to fetch mapping data:', error)
    // Return an empty array on error to prevent crashes downstream.
    return []
  }
}

// Fetches the 24-hour volume data for all items
export const getVolumeData = async () => {
  try {
    const response = await fetch(VOLUMES_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Failed to fetch volume data:', error)
    return { success: false, error }
  }
}

// Fetches historical data for a specific item
export const getItemHistoryById = async (timeframe, id) => {
  try {
    const url = `${TIMESERIES_URL}?timestep=${timeframe}&id=${id}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error(`Failed to fetch history for item ${id}:`, error)
    return { success: false, error }
  }
}
