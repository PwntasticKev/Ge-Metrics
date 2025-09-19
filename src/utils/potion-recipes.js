import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import ItemData from './item-data'
import { getAllPotionVolumes, getVolumesCacheStatus } from '../services/potionVolumeApi'
const parsePrice = (price) => {
  if (typeof price === 'number') return price
  if (typeof price !== 'string' || !price) {
    return null
  }
  const number = parseInt(price.replace(/,/g, ''), 10)
  return isNaN(number) ? null : number
}

export function usePotionRecipes () {
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { items } = ItemData()

  // Get cached volume data from API
  const { data: cachedVolumes } = useQuery('potionVolumes', getAllPotionVolumes, {
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2.5 * 60 * 1000 // 2.5 minutes
  })
  const { data: cacheStatus } = useQuery('potionVolumeStatus', getVolumesCacheStatus, {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // 1 minute
  })

  useEffect(() => {
    // Helper function to get cached volume for an item
    const getCachedVolume = (itemId, volumeType = 'hourly') => {
      if (!cachedVolumes) return 0
      if (!itemId) return 0

      const cachedItem = cachedVolumes.find(v => v.itemId === itemId)
      if (!cachedItem) return 0

      // Return different volume types based on preference
      switch (volumeType) {
        case 'hourly':
        case 'current': {
          // Primary: Most recent hourly activity, fallback to daily
          const hourlyVol = cachedItem.hourlyVolume || 0
          const dailyVol = cachedItem.volume || ((cachedItem.highPriceVolume || 0) + (cachedItem.lowPriceVolume || 0))
          return hourlyVol >= 10 ? hourlyVol : (dailyVol >= 20 ? dailyVol : 0)
        }
        case 'daily':
          // Current day's trading volume (high + low from latest data point)
          return cachedItem.volume || ((cachedItem.highPriceVolume || 0) + (cachedItem.lowPriceVolume || 0))
        case 'sell':
        case 'high':
          // High price volume = people selling = supply available
          return cachedItem.highPriceVolume || 0
        case 'buy':
        case 'low':
          // Low price volume = people buying = demand/competition
          return cachedItem.lowPriceVolume || 0
        case 'total':
          // Historical cumulative (avoid for real-time trading decisions)
          return cachedItem.totalVolume || 0
        default: {
          const defaultHourly = cachedItem.hourlyVolume || 0
          const defaultDaily = cachedItem.volume || 0
          return defaultHourly >= 10 ? defaultHourly : (defaultDaily >= 20 ? defaultDaily : 0)
        }
      }
    }

    // Outlier detection for market manipulation
    const detectOutliers = (itemId) => {
      if (!cachedVolumes || !itemId) return { isOutlier: false, reason: null }

      const cachedItem = cachedVolumes.find(v => v.itemId === itemId)
      if (!cachedItem) return { isOutlier: false, reason: null }

      const hourlyVol = cachedItem.hourlyVolume || 0
      const dailyVol = cachedItem.volume || 0

      // Skip if insufficient data
      if (hourlyVol < 10 && dailyVol < 20) {
        return { isOutlier: false, reason: 'Insufficient volume data' }
      }

      // Calculate expected hourly volume (daily / 24)
      const expectedHourlyVol = Math.max(1, Math.floor(dailyVol / 24))

      // Check for 4x+ volume spike
      if (hourlyVol > 0 && hourlyVol >= (expectedHourlyVol * 4)) {
        return {
          isOutlier: true,
          reason: `Volume spike: ${hourlyVol} vs expected ${expectedHourlyVol} (${Math.round(hourlyVol / expectedHourlyVol)}x normal)`
        }
      }

      return { isOutlier: false, reason: null }
    }

    const processRecipes = () => {
      if (!items || items.length === 0) {
        setIsLoading(true)
        return
      }

      if (!cachedVolumes || cachedVolumes.length === 0) {
        setIsLoading(true)
        return
      }

      setIsLoading(true)
      try {
        const potion4items = items.filter(item =>
          item.name.toLowerCase().includes('(4)') &&
          item.high !== null
        )

        const processedRecipes = potion4items.map((item4) => {
          const baseName = item4.name.replace(/\s*\(4\)/i, '')
          const item3 = items.find(i => i.name.toLowerCase() === `${baseName.toLowerCase()}(3)`)
          const item2 = items.find(i => i.name.toLowerCase() === `${baseName.toLowerCase()}(2)`)
          const item1 = items.find(i => i.name.toLowerCase() === `${baseName.toLowerCase()}(1)`)

          const price4 = parsePrice(item4.high)
          const volume4 = getCachedVolume(item4.id, 'hourly') // Hourly trading volume for 4-dose (fallback to daily)
          const outlier4 = detectOutliers(item4.id)

          const combinations = []

          // Apply 2% tax to sell price
          const sellPrice = price4 !== null ? price4 * 0.98 : null

          // (1) dose to (4) dose
          const low1 = parsePrice(item1?.low)
          const volume1 = getCachedVolume(item1?.id, 'hourly') // Hourly trading volume for 1-dose (fallback to daily)
          const outlier1 = detectOutliers(item1?.id)
          if (low1 !== null && sellPrice !== null) {
            const cost = low1 * 4 // Buy 4x (1) dose
            const totalProfit = sellPrice - cost // Profit from 1x (4) dose
            const profitPerPotion = Math.round(totalProfit) // Already per potion, no decimals
            // Apply 0.1x penalty to (1) dose due to very low bulk trading viability
            const score = profitPerPotion * (volume1 + volume4) * 0.1
            combinations.push({ name: '(1) to (4)', cost: low1, profitPerPotion, score, dose: '1', volume: volume1 + volume4 })
          }

          // (2) dose to (4) dose
          const low2 = parsePrice(item2?.low)
          const volume2 = getCachedVolume(item2?.id, 'hourly') // Hourly trading volume for 2-dose (fallback to daily)
          const outlier2 = detectOutliers(item2?.id)
          if (low2 !== null && sellPrice !== null) {
            const cost = low2 * 2 // Buy 2x (2) dose
            const totalProfit = sellPrice - cost // Profit from 1x (4) dose
            const profitPerPotion = Math.round(totalProfit) // Already per potion, no decimals
            // Apply 0.2x penalty to (2) dose due to limited bulk trading viability
            const score = profitPerPotion * (volume2 + volume4) * 0.2
            combinations.push({ name: '(2) to (4)', cost: low2, profitPerPotion, score, dose: '2', volume: volume2 + volume4 })
          }

          // (3) dose to (4) dose
          const low3 = parsePrice(item3?.low)
          const volume3 = getCachedVolume(item3?.id, 'hourly') // Hourly trading volume for 3-dose (fallback to daily)
          const outlier3 = detectOutliers(item3?.id)
          if (low3 !== null && sellPrice !== null) {
            const buyCost = low3 * 4 // Buy 4x (3) dose
            const totalProfit = (sellPrice * 3) - buyCost // Get 3x (4) dose
            const profitPerPotion = Math.round(totalProfit / 3) // Profit per (4) dose made
            // Apply 3.0x bonus to (3) dose due to optimal bulk trading viability
            const score = profitPerPotion * (volume3 + volume4) * 3.0
            combinations.push({ name: '(3) to (4)', cost: low3, profitPerPotion, score, dose: '3', volume: volume3 + volume4 })
          }

          if (combinations.length === 0) {
            return null
          }

          // Find the best method based on volume-weighted score (profit × volume)
          const bestMethod = combinations.reduce((best, current) =>
            (current.score !== null && (best.score === null || current.score > best.score)) ? current : best
          )

          // Debug logging for Attack potion to verify (3) dose dominance with hourly volume
          if (item4.name.toLowerCase().includes('attack potion')) {
            console.log('🧪 Attack Potion Analysis (Hourly Volume + Outlier Detection + Weight Priority):', {
              combinations: combinations.map(c => {
                const hourlyVol = c.dose === '1' ? volume1 : c.dose === '2' ? volume2 : c.dose === '3' ? volume3 : volume4
                const outlier = c.dose === '1' ? outlier1 : c.dose === '2' ? outlier2 : c.dose === '3' ? outlier3 : outlier4
                return {
                  dose: c.dose,
                  profit: c.profitPerPotion,
                  hourlyVolume: hourlyVol,
                  isOutlier: outlier.isOutlier,
                  outlierReason: outlier.reason,
                  weight: c.dose === '1' ? '0.1x' : c.dose === '2' ? '0.2x' : c.dose === '3' ? '3.0x' : '1.0x',
                  finalScore: c.score
                }
              }),
              selectedBest: { dose: bestMethod.dose, score: bestMethod.score },
              message: 'Using HOURLY volume (min 10/hr, fallback daily min 20/day) + outlier detection (4x spike) + 3.0x weight for (3) dose'
            })
          }

          const bestProfitPerPotion = bestMethod.profitPerPotion

          if (bestProfitPerPotion === null) {
            return null
          }

          const profitabilityScore = bestProfitPerPotion // Use profit per potion for scoring

          return {
            name: baseName,
            item4,
            item3, // Pass full item object
            item2, // Pass full item object
            item1, // Pass full item object
            combinations,
            bestProfitPerPotion,
            bestMethodDose: bestMethod.dose,
            profitabilityScore,
            outliers: {
              dose1: outlier1,
              dose2: outlier2,
              dose3: outlier3,
              dose4: outlier4
            }
          }
        }).filter(r => r && r.bestProfitPerPotion !== null)

        let finalRecipes = processedRecipes.map(r => ({ ...r, normalizedScore: 1 }))

        const scores = processedRecipes.map(r => r.profitabilityScore).filter(s => s && s > 0)
        if (scores.length > 0) {
          const minScore = Math.min(...scores)
          const maxScore = Math.max(...scores)

          // Second pass: normalize scores to a 1-10 scale
          finalRecipes = processedRecipes.map(recipe => {
            let normalizedScore = 1
            if (recipe.profitabilityScore > 0 && maxScore > minScore) {
              normalizedScore = 1 + 9 * (recipe.profitabilityScore - minScore) / (maxScore - minScore)
            } else if (recipe.profitabilityScore > 0) {
              normalizedScore = 10 // Only one item has profit, it gets a 10
            }
            return { ...recipe, normalizedScore: parseFloat(normalizedScore.toFixed(1)) }
          })
        } else {
          // If no items have a positive score, they all get a score of 1
          finalRecipes = processedRecipes.map(recipe => ({ ...recipe, normalizedScore: 1 }))
        }

        // Sort by the final normalized score
        finalRecipes.sort((a, b) => (b.normalizedScore || 0) - (a.normalizedScore || 0))

        setRecipes(finalRecipes)
      } catch (e) {
        setError(e)
        console.error('Error processing potion recipes:', e)
      } finally {
        setIsLoading(false)
      }
    }

    processRecipes()
  }, [items, cachedVolumes, cacheStatus])

  return { recipes, isLoading, error }
}
