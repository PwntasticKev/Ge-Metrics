import {
  TIMESERIES_URL,
  VOLUMES_URL
} from '../utils/constants.js'
import { safeFetch } from '../utils/safeJsonParser.js'
import { wikiItemsService } from '../services/wiki/wikiItemsService.js'

// /latest and /mapping go through the shared wiki service, so the header
// search, the tRPC-backed pages and ItemData reuse one request (and one saved
// mapping) instead of each downloading the same ~2 MB.

// Fetches the latest price data for all items
export const getPricingData = async () => {
  try {
    const data = await wikiItemsService.getLatest()
    return { success: true, data: { data } }
  } catch (error) {
    console.error('Failed to fetch pricing data:', error)
    return { success: false, error }
  }
}

// Fetches the item mapping data. Returns [] on failure so callers never crash.
export const getMappingData = async () => {
  try {
    const mapping = await wikiItemsService.getMapping()
    return Array.isArray(mapping) ? mapping : []
  } catch (error) {
    console.error('Failed to fetch mapping data:', error)
    return []
  }
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