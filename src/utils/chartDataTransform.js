/**
 * Data transformation utilities for converting OSRS API data to Lightweight Charts format
 */

/**
 * Convert OSRS API timeseries data to Lightweight Charts candlestick format
 * @param {Array} apiData - Array of { timestamp, avgHighPrice, avgLowPrice, highPriceVolume, lowPriceVolume }
 * @returns {Array} Array of { time, open, high, low, close }
 */
export function transformToCandlestick(apiData) {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    return []
  }

  const candles = []
  
  for (let i = 0; i < apiData.length; i++) {
    const point = apiData[i]
    const timestamp = point.timestamp
    
    // Convert Unix timestamp (seconds) to Lightweight Charts time format (Unix timestamp in seconds)
    const time = timestamp
    
    // Use high/low prices, derive open/close from previous candle or use same value
    const high = point.avgHighPrice ?? point.avgLowPrice ?? null
    const low = point.avgLowPrice ?? point.avgHighPrice ?? null
    
    if (high === null || low === null) {
      continue // Skip if no price data
    }
    
    // Open: use close of previous candle, or high if first candle
    const open = i > 0 && candles[i - 1]?.close ? candles[i - 1].close : high
    
    // Close: use high price (or average of high/low if both available)
    const close = point.avgHighPrice && point.avgLowPrice 
      ? Math.round((point.avgHighPrice + point.avgLowPrice) / 2)
      : high
    
    candles.push({
      time,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close)
    })
  }
  
  return candles
}

/**
 * Convert OSRS API timeseries data to Lightweight Charts line format
 * @param {Array} apiData - Array of { timestamp, avgHighPrice, avgLowPrice }
 * @param {string} priceType - 'high', 'low', or 'avg'
 * @returns {Array} Array of { time, value }
 */
export function transformToLine(apiData, priceType = 'high') {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    console.warn('transformToLine: Invalid input - not an array or empty')
    return []
  }

  const result = apiData
    .map((point, index) => {
      if (!point || typeof point !== 'object') {
        console.warn(`transformToLine: Invalid point at index ${index}:`, point)
        return null
      }

      const timestamp = point.timestamp
      
      // Validate timestamp is a number (Unix timestamp in seconds)
      if (typeof timestamp !== 'number' || timestamp <= 0) {
        console.warn(`transformToLine: Invalid timestamp at index ${index}:`, timestamp)
        return null
      }

      let value = null
      
      if (priceType === 'high') {
        value = point.avgHighPrice ?? point.avgLowPrice ?? null
      } else if (priceType === 'low') {
        value = point.avgLowPrice ?? point.avgHighPrice ?? null
      } else if (priceType === 'avg') {
        const high = point.avgHighPrice ?? null
        const low = point.avgLowPrice ?? null
        value = high && low ? Math.round((high + low) / 2) : (high ?? low ?? null)
      }
      
      if (value === null || typeof value !== 'number' || isNaN(value)) {
        return null
      }
      
      return {
        time: timestamp, // Unix timestamp in seconds (Lightweight Charts accepts this)
        value: Math.round(value)
      }
    })
    .filter(point => point !== null)

  if (result.length === 0) {
    console.warn('transformToLine: No valid data points after transformation')
  }

  return result
}

/**
 * Convert OSRS API timeseries data to Lightweight Charts volume format
 * @param {Array} apiData - Array of { timestamp, highPriceVolume, lowPriceVolume }
 * @param {string} volumeType - 'buy', 'sell', or 'total'
 * @returns {Array} Array of { time, value, color }
 */
export function transformToVolume(apiData, volumeType = 'total') {
  if (!Array.isArray(apiData) || apiData.length === 0) {
    return []
  }

  return apiData
    .map(point => {
      const timestamp = point.timestamp
      let value = 0
      let color = '#22c55e' // Default green
      
      if (volumeType === 'buy') {
        value = point.lowPriceVolume ?? 0
        color = '#22c55e' // Green for buy volume
      } else if (volumeType === 'sell') {
        value = point.highPriceVolume ?? 0
        color = '#ef4444' // Red for sell volume
      } else if (volumeType === 'total') {
        value = (point.highPriceVolume ?? 0) + (point.lowPriceVolume ?? 0)
        // Color based on buy vs sell ratio
        const buyVol = point.lowPriceVolume ?? 0
        const sellVol = point.highPriceVolume ?? 0
        color = buyVol >= sellVol ? '#22c55e' : '#ef4444'
      }
      
      if (value === 0) {
        return null
      }
      
      return {
        time: timestamp,
        value: Math.round(value),
        color
      }
    })
    .filter(point => point !== null)
}

/**
 * Convert timestamp to Lightweight Charts time format
 * Lightweight Charts expects Unix timestamp in seconds
 * @param {number|Date} timestamp - Unix timestamp in seconds or Date object
 * @returns {number} Unix timestamp in seconds
 */
export function toChartTime(timestamp) {
  if (timestamp instanceof Date) {
    return Math.floor(timestamp.getTime() / 1000)
  }
  // If already in seconds, return as-is
  // If in milliseconds, convert to seconds
  return timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp
}

/**
 * Get time range from data array
 * @param {Array} data - Array of data points with time property
 * @returns {Object} { min, max } time range
 */
export function getTimeRange(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { min: null, max: null }
  }
  
  const times = data.map(d => d.time).filter(t => t != null)
  if (times.length === 0) {
    return { min: null, max: null }
  }
  
  return {
    min: Math.min(...times),
    max: Math.max(...times)
  }
}

/**
 * Filter data by time range
 * @param {Array} data - Array of data points with time property
 * @param {number} minTime - Minimum time (Unix timestamp in seconds)
 * @param {number} maxTime - Maximum time (Unix timestamp in seconds)
 * @returns {Array} Filtered data array
 */
export function filterByTimeRange(data, minTime, maxTime) {
  if (!Array.isArray(data)) {
    return []
  }
  
  return data.filter(point => {
    const time = point.time
    if (time == null) return false
    
    if (minTime != null && time < minTime) return false
    if (maxTime != null && time > maxTime) return false
    
    return true
  })
}

