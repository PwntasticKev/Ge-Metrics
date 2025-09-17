import { useState, useEffect } from 'react'
import ItemData from './item-data'

const parsePrice = (price) => {
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

  useEffect(() => {
    if (items && items.length > 0) {
      try {
        const potion4items = items.filter(item =>
          item.name.toLowerCase().includes('(4)') &&
          item.high !== null
        )
        const potionLog = {}

        const generatedRecipes = potion4items.map(item4 => {
          const baseName = item4.name.replace(/\s*\(4\)/i, '')

          const item3 = items.find(i => i.name.toLowerCase() === `${baseName.toLowerCase()}(3)`)
          const item2 = items.find(i => i.name.toLowerCase() === `${baseName.toLowerCase()}(2)`)
          const item1 = items.find(i => i.name.toLowerCase() === `${baseName.toLowerCase()}(1)`)

          const price4 = parsePrice(item4.high)
          const combinations = []
          const equivalentCosts = []

          // (1) dose
          const low1 = parsePrice(item1?.low)
          if (low1 !== null) {
            const cost = low1 * 4
            const profit = price4 !== null ? price4 - cost : null
            equivalentCosts.push({ dose: '1', costPer4Dose: cost, profit })
            combinations.push({ name: '(1) to (4)', cost, profit })
          }

          // (2) dose
          const low2 = parsePrice(item2?.low)
          if (low2 !== null) {
            const cost = low2 * 2
            const profit = price4 !== null ? price4 - cost : null
            equivalentCosts.push({ dose: '2', costPer4Dose: cost, profit })
            combinations.push({ name: '(2) to (4)', cost, profit })
          }

          // (3) dose
          const low3 = parsePrice(item3?.low)
          if (low3 !== null) {
            const cost = Math.round((low3 * 4) / 3)
            const profit = price4 !== null ? price4 - cost : null
            equivalentCosts.push({ dose: '3', costPer4Dose: cost, profit })
            combinations.push({ name: '(3) to (4)', cost, profit })
          }

          if (combinations.length === 0) {
            return null
          }

          const validProfits = combinations
            .map(c => c.profit)
            .filter(p => typeof p === 'number')

          const maxProfit = validProfits.length > 0 ? Math.max(...validProfits) : null
          const volume = parsePrice(item4.volume) || 0
          const profitabilityScore = maxProfit !== null ? maxProfit * volume : null

          if (maxProfit === null) {
            return null
          }

          return {
            name: baseName,
            item4,
            combinations,
            maxProfit,
            equivalentCosts,
            volume,
            profitabilityScore
          }
        }).filter(Boolean)

        generatedRecipes.sort((a, b) => b.profitabilityScore - a.profitabilityScore)

        setRecipes(generatedRecipes)
      } catch (e) {
        setError(e)
      } finally {
        setIsLoading(false)
      }
    }
  }, [items])

  return { recipes, isLoading, error }
}
