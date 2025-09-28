import { useState, useEffect } from 'react'
import { trpc } from '../utils/trpc'
import ItemData from './item-data'

const parsePrice = (price) => {
  if (price === null || price === undefined) return null
  if (typeof price === 'number') return price
  const number = parseInt(price.toString().replace(/,/g, ''), 10)

  return isNaN(number) ? null : number
}

export function usePotionRecipes () {
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { items } = ItemData()

  // Use the new tRPC query to get the latest volume data on demand
  const { data: volumeData, isLoading: isVolumeLoading, error: volumeError } = trpc.volumes.getLatestVolumes.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false // Optional: prevent refetching on window focus
  })

  useEffect(() => {
    // We are not using cachedPotions anymore, but we can use volumeData for more advanced logic later.
    // The main purpose of this query now is to ensure we have up-to-date prices before calculating.
    const processRecipes = () => {
      if (!items || items.length === 0 || isVolumeLoading) {
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
          const combinations = []

          // Apply 2% tax to sell price
          const sellPriceAfterTax = Math.floor(price4 * 0.98)

          // (1) dose combination - buy 4x (1) dose, make 1x (4) dose
          if (item1 && item1.low !== null) {
            const low1 = parsePrice(item1.low)
            const cost = low1 * 4
            const profitPerPotion = sellPriceAfterTax - cost

            combinations.push({
              name: '(1) to (4)',
              cost: low1,
              profitPerPotion,
              dose: '1'
            })
          }

          // (2) dose combination - buy 2x (2) dose, make 1x (4) dose
          if (item2 && item2.low !== null) {
            const low2 = parsePrice(item2.low)
            const cost = low2 * 2
            const profitPerPotion = sellPriceAfterTax - cost

            combinations.push({
              name: '(2) to (4)',
              cost: low2,
              profitPerPotion,
              dose: '2'
            })
          }

          // (3) dose combination - buy 4x (3) dose, make 3x (4) dose
          if (item3 && item3.low !== null) {
            const low3 = parsePrice(item3.low)
            const cost = low3 * 4
            const profitPer4Dose = (sellPriceAfterTax * 3) - cost
            const profitPerPotion = Math.floor(profitPer4Dose / 3)

            combinations.push({
              name: '(3) to (4)',
              cost: low3,
              profitPerPotion,
              dose: '3'
            })
          }

          // Find best profit method (simple profit-based ranking)
          const bestProfit = Math.max(...combinations.map(c => c.profitPerPotion || -Infinity))
          const bestMethod = combinations.find(c => c.profitPerPotion === bestProfit)
          const bestMethodDose = bestMethod ? bestMethod.dose : '3'

          // Simple 1-10 score based on profit (no volume weighting)
          const maxPossibleProfit = 1000 // Reasonable max profit for normalization
          const normalizedScore = bestProfit > 0
            ? Math.min(10, Math.max(1, Math.ceil((bestProfit / maxPossibleProfit) * 10)))
            : 1

          return {
            name: baseName,
            item4,
            item3,
            item2,
            item1,
            combinations,
            bestProfitPerPotion: bestProfit,
            bestMethodDose,
            normalizedScore,
            sellPriceAfterTax
          }
        })

        // Filter out potions with no valid combinations
        const validRecipes = processedRecipes.filter(recipe =>
          recipe.combinations.length > 0
        )

        // Sort by best profit
        validRecipes.sort((a, b) => (b.bestProfitPerPotion || 0) - (a.bestProfitPerPotion || 0))

        setRecipes(validRecipes)
        setError(null)
      } catch (err) {
        console.error('Error processing potion recipes:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    processRecipes()
  }, [items, volumeData, isVolumeLoading])

  return {
    recipes,
    isLoading,
    error
  }
}
