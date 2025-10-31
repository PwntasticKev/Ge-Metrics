// This utility processes raw item mapping, price, and volume data to identify potion families
// and calculate their combination profits.

const POTION_DOSES = ['(1)', '(2)', '(3)', '(4)']

export function processPotionData (itemMapping, allItems, itemVolumes) {
  // Check if we have actual data (not just empty objects)
  if (!itemMapping || Object.keys(itemMapping).length === 0) {
    console.warn('[processPotionData] itemMapping is empty or missing')
    return []
  }
  
  if (!allItems || Object.keys(allItems).length === 0) {
    console.warn('[processPotionData] allItems is empty or missing')
    return []
  }
  
  // itemVolumes can be empty object, that's OK - we'll use defaults
  if (!itemVolumes) {
    itemVolumes = {}
  }

  console.log('[processPotionData] Starting processing:', {
    itemMappingCount: Object.keys(itemMapping).length,
    allItemsCount: Object.keys(allItems).length,
    itemVolumesCount: Object.keys(itemVolumes).length
  })

  const potionFamilies = {}
  let potionCount = 0
  let potionsWithDose = 0

  // First, group all potions by their base name
  Object.values(itemMapping).forEach(item => {
    if (item.name && item.name.toLowerCase().includes('potion')) {
      potionCount++
      const doseMatch = item.name.match(/\((\d)\)/)
      if (doseMatch) {
        potionsWithDose++
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
        const hourlyTotalVolume = (volumeInfo.hourlyHighPriceVolume || 0) + (volumeInfo.hourlyLowPriceVolume || 0)

        const priceInfo = allItems[item.id] || { high: null, low: null }

        potionFamilies[baseName].doses[dose] = {
          ...item,
          high: priceInfo.high,
          low: priceInfo.low,
          totalVolume, // Merge volume data
          hourlyTotalVolume, // Merge hourly volume data
          // Construct the correct image URL, replacing spaces with underscores
          wikiImageUrl: `https://oldschool.runescape.wiki/images/${item.name.replace(/\s+/g, '_')}.png`
        }
      }
    }
  })

  console.log('[processPotionData] Found potions:', {
    totalPotionsFound: potionCount,
    potionsWithDoseFormat: potionsWithDose,
    uniquePotionFamilies: Object.keys(potionFamilies).length,
    families: Object.keys(potionFamilies).slice(0, 10) // First 10 for debugging
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
          combinations.push({ 
            dose: '3', 
            cost, 
            profitPerPotion, 
            itemId: item3.id,
            // Include actual API prices to match All Items page
            low: item3.low,
            high: item3.high
          })
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
          combinations.push({ 
            dose: '2', 
            cost, 
            profitPerPotion, 
            itemId: item2.id,
            // Include actual API prices to match All Items page
            low: item2.low,
            high: item2.high
          })
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
          combinations.push({ 
            dose: '1', 
            cost, 
            profitPerPotion, 
            itemId: item1.id,
            // Include actual API prices to match All Items page
            low: item1.low,
            high: item1.high
          })
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

  console.log('[processPotionData] After profit calculation:', {
    familiesWithStats: familiesWithStats.length,
    familiesWithoutValidCombinations: Object.keys(potionFamilies).length - familiesWithStats.length
  })

  // Finally, calculate the normalized scores based on the results
  const maxProfit = Math.max(...familiesWithStats.map(f => f.bestProfitPerPotion), 0)
  const maxVolume24h = Math.max(...familiesWithStats.map(f => f.item4.totalVolume || 0), 1)
  const maxVolume1h = Math.max(...familiesWithStats.map(f => {
    const bestDose = f.combinations.find(c => c.dose === f.bestMethodDose)
    return bestDose ? (f.doses[bestDose.dose]?.hourlyTotalVolume || 0) : 0
  }), 1)

  return familiesWithStats.map(family => {
    const profitScore = maxProfit > 0 ? (family.bestProfitPerPotion / maxProfit) : 0
    const bestDose = family.combinations.find(c => c.dose === family.bestMethodDose)
    const doseInfo = bestDose ? family.doses[bestDose.dose] : null

    const volumeScore24h = maxVolume24h > 0 ? (family.item4.totalVolume / maxVolume24h) : 0
    const volumeScore1h = maxVolume1h > 0 && doseInfo ? (doseInfo.hourlyTotalVolume / maxVolume1h) : 0

    // Combine scores (e.g., 60% profit, 40% volume)
    const combinedScore24h = 0.6 * profitScore + 0.4 * volumeScore24h
    const combinedScore1h = 0.6 * profitScore + 0.4 * volumeScore1h

    return {
      ...family,
      normalizedScore: Math.max(1, Math.round(combinedScore24h * 10)), // Keep original for default
      normalizedScore24h: Math.max(1, Math.round(combinedScore24h * 10)),
      normalizedScore1h: Math.max(1, Math.round(combinedScore1h * 10))
    }
  })
}
