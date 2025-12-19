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
// Note: OSRS Wiki API start parameter is unreliable - fetching without it
export const getItemHistoryById = async (timeframe, id, startUnix = undefined) => {
  try {
    // Validate inputs
    if (!id || !timeframe) {
      throw new Error('Missing required parameters: id and timeframe are required')
    }

    // OSRS Wiki API doesn't reliably accept start parameter
    // Always fetch without start parameter to avoid 400 errors
    // The API will return available historical data for the timeframe
    const url = `${TIMESERIES_URL}?timestep=${timeframe}&id=${id}`
    
    console.log(`[RSWikiAPI] Fetching: ${url}`)
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new TypeError("Oops, we haven't got JSON!")
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching item History:', error)
    return { success: false, error }
  }
}