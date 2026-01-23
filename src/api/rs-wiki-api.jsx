import {
  LATEST_PRICES_URL,
  MAPPING_URL,
  TIMESERIES_URL,
  VOLUMES_URL
} from '../utils/constants.js'
import { safeFetch } from '../utils/safeJsonParser.js'

// Fetches the latest price data for all items
export const getPricingData = async () => {
  console.log('[RSWikiAPI] Fetching pricing data from:', LATEST_PRICES_URL)
  const result = await safeFetch(LATEST_PRICES_URL, {}, {})
  
  if (!result.success) {
    console.error('Failed to fetch pricing data:', result.error)
    return { success: false, error: result.error }
  }
  
  return { success: true, data: result.data }
}

// Fetches the item mapping data
export const getMappingData = async () => {
  console.log('[RSWikiAPI] Fetching mapping data from:', MAPPING_URL)
  const result = await safeFetch(MAPPING_URL, {}, [])
  
  if (!result.success) {
    console.error('Failed to fetch mapping data:', result.error)
    // Return an empty array on error to prevent crashes downstream.
    return []
  }
  
  // Ensure we always return an array, even if the API call fails or returns unexpected data.
  return Array.isArray(result.data) ? result.data : []
}

// Fetches the 24-hour volume data for all items
export const getVolumeData = async () => {
  console.log('[RSWikiAPI] Fetching volume data from:', VOLUMES_URL)
  const result = await safeFetch(VOLUMES_URL, {}, {})
  
  if (!result.success) {
    console.error('Failed to fetch volume data:', result.error)
    return { success: false, error: result.error }
  }
  
  return { success: true, data: result.data }
}

// Fetches historical data for a specific item
// Note: OSRS Wiki API start parameter is unreliable - fetching without it
export const getItemHistoryById = async (timeframe, id) => {
  try {
    // Validate inputs
    if (!id || !timeframe) {
      throw new Error('Missing required parameters: id and timeframe are required')
    }

    // OSRS Wiki API doesn't reliably accept start parameter
    // Always fetch without start parameter to avoid 400 errors
    // The API will return available historical data for the timeframe
    const url = `${TIMESERIES_URL}?timestep=${timeframe}&id=${id}`
    
    console.log(`[RSWikiAPI] Fetching historical data: ${url}`)
    const result = await safeFetch(url, {}, {})
    
    if (!result.success) {
      console.error('Error fetching item history:', result.error)
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error fetching item History:', error)
    return { success: false, error }
  }
}