// This utility processes raw item mapping, price, and volume data to identify potion families
// and calculate their combination profits.

const POTION_DOSES = ['(1)', '(2)', '(3)', '(4)']

export function processPotionData (itemMapping, allItems, itemVolumes) {
  if (!itemMapping || !allItems || !itemVolumes) {
    return []
  }

  const potionFamilies = {}

  // First, group all potions by their base name
  Object.values(itemMapping).forEach(item => {
    if (item.name.includes('potion')) {
      const doseMatch = item.name.match(/\((\d)\)/)
      if (doseMatch) {
        const dose = doseMatch[1]
        const baseName = item.name.replace(`(${dose})`, '').trim()

        if (!potionFamilies[baseName]) {
          potionFamilies[baseName] = {
            name: baseName,
            doses: {}
          }
        }

        const volumeInfo = itemVolumes[item.id] || { highPriceVolume: 0, lowPriceVolume: 0 }
        const totalVolume = volumeInfo.highPriceVolume + volumeInfo.lowPriceVolume

        const priceInfo = allItems[item.id] || { high: null, low: null }

        potionFamilies[baseName].doses[dose] = {
          ...item,
          high: priceInfo.high,
          low: priceInfo.low,
          totalVolume, // Merge volume data
          // Construct the correct image URL, replacing spaces with underscores
          wikiImageUrl: `https://oldschool.runescape.wiki/images/${item.name.replace(/\s+/g, '_')}.png`
        }
      }
    }
  })

  // Then, calculate profits for each family
  const familiesWithStats = Object.values(potionFamilies)
    .map(family => {
      const { doses } = family
      const item1 = doses['1']
      const item2 = doses['2']
      const item3 = doses['3']
      const item4 = doses['4']

      if (!item4 || !item4.high) {
        return { ...family, combinations: [], bestProfitPerPotion: -Infinity, bestMethodDose: null }
      }

      const sellPrice = parseFloat(item4.high.toString().replace(/,/g, '')) * 0.98 // Apply 2% tax
      const combinations = []
      let bestProfitPerPotion = -Infinity
      let bestMethodDose = null

      // Decanting (3) -> (4)
      if (item3 && item3.low) {
        const cost = parseFloat(item3.low.toString().replace(/,/g, '')) * (4 / 3)
        const profitPerPotion = sellPrice - cost
        if (!isNaN(profitPerPotion)) {
          combinations.push({ dose: '3', cost, profitPerPotion, itemId: item3.id })
          if (profitPerPotion > bestProfitPerPotion) {
            bestProfitPerPotion = profitPerPotion
            bestMethodDose = '3'
          }
        }
      }

      // Combining (2) + (2) -> (4)
      if (item2 && item2.low) {
        const cost = parseFloat(item2.low.toString().replace(/,/g, '')) * 2
        const profitPerPotion = sellPrice - cost
        if (!isNaN(profitPerPotion)) {
          combinations.push({ dose: '2', cost, profitPerPotion, itemId: item2.id })
          if (profitPerPotion > bestProfitPerPotion) {
            bestProfitPerPotion = profitPerPotion
            bestMethodDose = '2'
          }
        }
      }

      // Combining (1) + (1) + (1) + (1) -> (4) -- simplified to 4x cost
      if (item1 && item1.low) {
        const cost = parseFloat(item1.low.toString().replace(/,/g, '')) * 4
        const profitPerPotion = sellPrice - cost
        if (!isNaN(profitPerPotion)) {
          combinations.push({ dose: '1', cost, profitPerPotion, itemId: item1.id })
          if (profitPerPotion > bestProfitPerPotion) {
            bestProfitPerPotion = profitPerPotion
            bestMethodDose = '1'
          }
        }
      }

      return {
        ...family,
        item4,
        combinations,
        bestProfitPerPotion,
        bestMethodDose
      }
    })
    .filter(family => family.combinations.length > 0)

  // Finally, calculate the normalized score based on the results
  const maxProfit = Math.max(...familiesWithStats.map(f => f.bestProfitPerPotion), 0)

  return familiesWithStats.map(family => {
    const score = maxProfit > 0 ? Math.max(1, Math.round((family.bestProfitPerPotion / maxProfit) * 10)) : 1
    return {
      ...family,
      normalizedScore: score
    }
  })
}
