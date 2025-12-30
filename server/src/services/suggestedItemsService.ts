import { db, itemVolumes, itemMapping } from '../db/index.js'
import { eq, sql, desc, and, gte } from 'drizzle-orm'
import { HistoricalDataService } from './historicalDataService.js'

export interface SuggestedItem {
  itemId: number
  name: string
  icon: string | null
  buyPrice: number
  sellPrice: number
  currentPrice: number // Keep for backwards compatibility
  margin: number
  marginPercentage: number
  volume24h: number
  volume1h: number
  profitPerFlip: number
  bestBuyTime: string
  bestSellTime: string
  suggestionScore: number
  manipulationWarning: boolean
  affordable: boolean
}

export interface SuggestedItemsFilters {
  capital?: number
  volumeType?: 'global' | 'high' | 'low'
}

// Calculate suggestion score: 70% profit focus + 30% volume stability  
function calculateSuggestionScore(
  volume24h: number,
  volume1h: number,
  marginPercentage: number,
  profitPerFlip: number,
  manipulationWarning: boolean
): number {
  // Normalize volume (higher is better, with diminishing returns)
  const volumeScore = Math.min(Math.sqrt(volume24h) / 100, 100)
  
  // Profit scoring - heavily favor 500K+ profits
  let profitScore = 0
  if (profitPerFlip >= 500000) {
    profitScore = 100 // Maximum score for 500K+ profits
  } else if (profitPerFlip >= 100000) {
    profitScore = 80 + (profitPerFlip - 100000) / 20000 // 80-100 for 100K-500K
  } else if (profitPerFlip >= 50000) {
    profitScore = 60 + (profitPerFlip - 50000) / 2500 // 60-80 for 50K-100K
  } else if (profitPerFlip >= 10000) {
    profitScore = 30 + (profitPerFlip - 10000) / 1333 // 30-60 for 10K-50K
  } else {
    profitScore = Math.min(profitPerFlip / 333, 30) // 0-30 for <10K
  }
  
  // Calculate base score - 70% profit, 30% volume
  let score = (profitScore * 0.7) + (volumeScore * 0.3)
  
  // Penalize manipulated items less severely for high profit items
  if (manipulationWarning) {
    const penaltyFactor = profitPerFlip >= 500000 ? 0.9 : 0.7
    score *= penaltyFactor
  }
  
  return Math.round(score)
}

// Detect market manipulation based on volume/price patterns
function detectManipulation(
  volume24h: number,
  volume1h: number,
  highPrice: number,
  lowPrice: number
): boolean {
  // Flag if hourly volume is >300% of expected (24h/24)
  const expectedHourlyVolume = volume24h / 24
  const volumeSpike = volume1h > (expectedHourlyVolume * 3)
  
  // Flag if price spread is >50%
  const priceSpread = highPrice > 0 ? ((highPrice - lowPrice) / lowPrice) * 100 : 0
  const largePriceSpread = priceSpread > 50
  
  return volumeSpike || largePriceSpread
}

// Get optimized times for high-value items (async for future enhancement)
async function getBestTimesOptimized(itemId: number, volume24h: number, profitPerFlip: number): Promise<{ buyTime: string; sellTime: string }> {
  // Only do historical analysis for very high-value items to avoid performance hit
  if (profitPerFlip >= 1000000) {
    try {
      const historicalService = new HistoricalDataService()
      const historicalData = await historicalService.getHistoricalData(itemId, '5m')
      
      if (historicalData.length > 50) { // Ensure we have enough data
        // Quick analysis for high-value items only
        const hourlyAvgs: { [hour: number]: { low: number; high: number; count: number } } = {}
        
        historicalData.slice(-288).forEach(point => { // Last 24 hours of 5-min data
          const date = new Date(point.timestamp * 1000)
          const hour = date.getUTCHours()
          
          if (!hourlyAvgs[hour]) hourlyAvgs[hour] = { low: 0, high: 0, count: 0 }
          
          if (point.avgLowPrice && point.avgHighPrice) {
            hourlyAvgs[hour].low += point.avgLowPrice
            hourlyAvgs[hour].high += point.avgHighPrice
            hourlyAvgs[hour].count++
          }
        })
        
        let bestBuyHour = 0, bestSellHour = 12
        let lowestAvg = Infinity, highestAvg = 0
        
        Object.entries(hourlyAvgs).forEach(([hour, data]) => {
          if (data.count >= 3) { // Need at least 3 data points
            const avgLow = data.low / data.count
            const avgHigh = data.high / data.count
            
            if (avgLow < lowestAvg) { lowestAvg = avgLow; bestBuyHour = parseInt(hour) }
            if (avgHigh > highestAvg) { highestAvg = avgHigh; bestSellHour = parseInt(hour) }
          }
        })
        
        const formatHour = (h: number) => {
          const period = h < 12 ? 'AM' : 'PM'
          const display = h === 0 ? 12 : h > 12 ? h - 12 : h
          return `${display}${period} UTC`
        }
        
        return {
          buyTime: formatHour(bestBuyHour),
          sellTime: formatHour(bestSellHour)
        }
      }
    } catch (error) {
      console.warn(`[getBestTimesOptimized] Quick analysis failed for item ${itemId}:`, error)
    }
  }
  
  return getDefaultTimes(volume24h)
}

// Fallback to general patterns when historical data unavailable  
function getDefaultTimes(volume24h: number): { buyTime: string; sellTime: string } {
  // High volume items: More general patterns
  if (volume24h > 1000) {
    return {
      buyTime: 'Late Night/Early Morning',
      sellTime: 'Evening Peak Hours'
    }
  }
  
  // Low volume items: General guidance
  return {
    buyTime: 'Off-Peak Hours',
    sellTime: 'Peak Activity Times'
  }
}

// Simple in-memory cache for suggested items
let cachedSuggestedItems: { items: SuggestedItem[]; timestamp: number } | null = null
const CACHE_DURATION = 30_000 // 30 seconds

export async function getSuggestedItems(filters: SuggestedItemsFilters = {}): Promise<SuggestedItem[]> {
  try {
    console.log('[getSuggestedItems] Fetching suggested items with filters:', filters)
    
    // For unfiltered requests, use cache if available and recent
    if (!filters.capital && !filters.volumeType && cachedSuggestedItems) {
      const age = Date.now() - cachedSuggestedItems.timestamp
      if (age < CACHE_DURATION) {
        console.log(`[getSuggestedItems] Using cached data (${Math.round(age/1000)}s old)`)
        return cachedSuggestedItems.items
      }
    }
    
    // Get current prices from OSRS API since database prices are null
    const pricesResponse = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest', {
      headers: {
        'User-Agent': 'GE-Metrics/1.0 (https://ge-metrics.com)'
      }
    })
    
    let currentPrices: Record<string, any> = {}
    if (pricesResponse.ok) {
      const pricesData = await pricesResponse.json()
      currentPrices = pricesData.data || {}
      console.log(`[getSuggestedItems] Fetched current prices for ${Object.keys(currentPrices).length} items`)
    } else {
      console.warn('[getSuggestedItems] Failed to fetch current prices, using database prices only')
    }
    
    // Get all items with volume data and mapping
    const query = db
      .select({
        itemId: itemVolumes.itemId,
        name: itemMapping.name,
        icon: itemMapping.icon,
        highPrice: itemVolumes.highPrice,
        lowPrice: itemVolumes.lowPrice,
        highPriceVolume: itemVolumes.highPriceVolume,
        lowPriceVolume: itemVolumes.lowPriceVolume,
        hourlyHighPriceVolume: itemVolumes.hourlyHighPriceVolume,
        hourlyLowPriceVolume: itemVolumes.hourlyLowPriceVolume,
        limit: itemMapping.limit
      })
      .from(itemVolumes)
      .innerJoin(itemMapping, eq(itemVolumes.itemId, itemMapping.id))
      .where(
        and(
          gte(itemVolumes.highPriceVolume, 1), // Lower minimum volume threshold
          gte(itemVolumes.lowPriceVolume, 1)
        )
      )

    const items = await query
    
    console.log(`[getSuggestedItems] Processing ${items.length} items`)
    
    const suggestedItems: SuggestedItem[] = []
    let processedCount = 0
    let skippedNoPrices = 0
    let skippedNoMargin = 0
    let skippedCapital = 0
    let skippedVolume = 0
    
    for (const item of items) {
      // Use current API prices if database prices are null/0
      const currentItemPrice = currentPrices[item.itemId.toString()]
      const highPrice = item.highPrice || currentItemPrice?.high || 0
      const lowPrice = item.lowPrice || currentItemPrice?.low || 0
      
      // Skip items with no price data
      if (highPrice === 0 || lowPrice === 0) {
        skippedNoPrices++
        continue
      }
      
      // Calculate profit metrics
      const margin = highPrice - lowPrice
      const marginPercentage = (margin / lowPrice) * 100
      const profitPerFlip = Math.floor(margin * 0.98) // Account for 2% GE tax
      
      // Skip items with negative or zero margins
      if (margin <= 0 || marginPercentage < 0.1) {
        skippedNoMargin++
        continue
      }
      
      // Volume metrics
      const volume24h = Math.max(item.highPriceVolume, item.lowPriceVolume)
      const volume1h = Math.max(item.hourlyHighPriceVolume || 0, item.hourlyLowPriceVolume || 0)
      
      // Filter by capital if specified
      const affordable = !filters.capital || lowPrice <= filters.capital
      if (filters.capital && !affordable) {
        skippedCapital++
        continue
      }
      
      // Filter by volume type
      if (filters.volumeType === 'high' && volume24h < 1000) {
        skippedVolume++
        continue
      }
      if (filters.volumeType === 'low' && volume24h >= 1000) {
        skippedVolume++
        continue
      }
      
      // Detect manipulation
      const manipulationWarning = detectManipulation(volume24h, volume1h, highPrice, lowPrice)
      
      // Calculate suggestion score
      const suggestionScore = calculateSuggestionScore(
        volume24h,
        volume1h,
        marginPercentage,
        profitPerFlip,
        manipulationWarning
      )
      
      // Get optimal buy/sell times (use fast default for now)
      const { buyTime, sellTime } = getDefaultTimes(volume24h)
      
      suggestedItems.push({
        itemId: item.itemId,
        name: item.name,
        icon: item.icon,
        buyPrice: lowPrice,
        sellPrice: highPrice,
        currentPrice: lowPrice, // Keep for backwards compatibility
        margin,
        marginPercentage,
        volume24h,
        volume1h,
        profitPerFlip,
        bestBuyTime: buyTime,
        bestSellTime: sellTime,
        suggestionScore,
        manipulationWarning,
        affordable
      })
      
      processedCount++
    }
    
    // Sort by suggestion score (highest first) and limit earlier for performance
    const sortedItems = suggestedItems
      .sort((a, b) => b.suggestionScore - a.suggestionScore)
      .slice(0, 500) // Reduced to 500 items for faster loading
    
    // Cache unfiltered results for 30 seconds
    if (!filters.capital && !filters.volumeType) {
      cachedSuggestedItems = {
        items: sortedItems,
        timestamp: Date.now()
      }
      console.log('[getSuggestedItems] Cached results for future requests')
    }
    
    console.log(`[getSuggestedItems] Returning ${sortedItems.length} suggested items`)
    return sortedItems
    
  } catch (error) {
    console.error('[getSuggestedItems] Error:', error)
    throw error
  }
}

export async function getSuggestedItemsStats(): Promise<{
  totalItems: number
  highVolumeItems: number
  lowVolumeItems: number
  averageMargin: number
}> {
  try {
    const items = await getSuggestedItems()
    
    const highVolumeItems = items.filter(item => item.volume24h >= 1000).length
    const lowVolumeItems = items.filter(item => item.volume24h < 1000).length
    const averageMargin = items.length > 0 
      ? items.reduce((sum, item) => sum + item.marginPercentage, 0) / items.length 
      : 0
    
    return {
      totalItems: items.length,
      highVolumeItems,
      lowVolumeItems,
      averageMargin: Math.round(averageMargin * 100) / 100
    }
  } catch (error) {
    console.error('[getSuggestedItemsStats] Error:', error)
    return {
      totalItems: 0,
      highVolumeItems: 0,
      lowVolumeItems: 0,
      averageMargin: 0
    }
  }
}