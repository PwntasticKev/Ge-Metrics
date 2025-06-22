import axios from 'axios'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WIKI_API_BASE = 'https://prices.runescape.wiki/api/v1/osrs'

// Keep the bulk items list for reference, but we'll analyze ALL items
const BULK_ITEMS = [
  // Bones
  'Dragon bones', 'Wyvern bones', 'Superior dragon bones', 'Baby dragon bones', 'Bat bones', 'Big bones', 'Bones', 'Burnt bones', 'Curved bone', 'Dagannoth bones', 'Drake bones', 'Fayrg bones', 'Hydra bones', 'Jogre bones', 'Lava dragon bones', 'Long bone', 'Monkey bones', 'Ourg bones', 'Raurg bones', 'Shaikahan bones', 'Wolf bones', 'Zogre bones',
  // Logs
  'Achey tree logs', 'Arctic pine logs', 'Logs', 'Magic logs', 'Mahogany logs', 'Maple logs', 'Oak logs', 'Teak logs', 'Willow logs', 'Yew logs', 'Redwood logs',
  // Food
  'Anglerfish', 'Cooked karambwan', 'Guthix rest(4)', 'Jug of wine', 'Lobster', 'Manta ray', 'Monkfish', 'Pineapple pizza', 'Raw anglerfish', 'Raw karambwan', 'Raw lobster', 'Raw monkfish', 'Raw shark', 'Raw swordfish', 'Saradomin brew(4)', 'Shark', 'Tuna potato',
  // Herbs
  'Avantoe', 'Cadantine', 'Dwarf weed', 'Grimy avantoe', 'Grimy cadantine', 'Grimy dwarf weed', 'Grimy guam leaf', 'Grimy harralander', 'Grimy irit leaf', 'Grimy kwuarm', 'Grimy lantadyme', 'Grimy marrentill', 'Grimy ranarr weed', 'Grimy snapdragon', 'Grimy tarromin', 'Grimy toadflax', 'Grimy torstol', 'Guam leaf', 'Harralander', 'Irit leaf', 'Kwuarm', 'Lantadyme', 'Marrentill', 'Ranarr weed', 'Snapdragon', 'Tarromin', 'Toadflax', 'Torstol',
  // Runes
  'Astral rune', 'Blood rune', 'Chaos rune', 'Cosmic rune', 'Death rune', 'Law rune', 'Nature rune', 'Soul rune', 'Air rune', 'Body rune', 'Earth rune', 'Fire rune', 'Mind rune', 'Water rune',
  // Metals & Ores
  'Adamantite bar', 'Adamantite ore', 'Bronze bar', 'Coal', 'Copper ore', 'Gold bar', 'Gold ore', 'Iron bar', 'Iron ore', 'Mithril bar', 'Mithril ore', 'Runite bar', 'Runite ore', 'Silver bar', 'Silver ore', 'Steel bar', 'Tin ore',
  // Other High-Volume
  'Air orb', 'Black dragonhide', 'Blue dragon scale', 'Blue dragonhide', 'Bow string', 'Cannonball', 'Chinchompa', 'Flax', 'Green dragonhide', 'Pure essence', 'Red chinchompa', 'Rune essence', 'White berries', 'Wine of zamorak',
  // Common Gear
  'Abyssal whip', 'Air battlestaff', 'Amulet of glory', 'Black dhide chaps', 'Black dhide body', 'Dragon dagger', 'Dragon scimitar', 'Rune platebody', 'Rune platelegs', 'Rune scimitar'
]

async function fetchFromApi (endpoint) {
  try {
    const response = await axios.get(`${WIKI_API_BASE}/${endpoint}`)
    return response.data
  } catch (error) {
    console.error(`Error fetching from /${endpoint}:`, error.message)
    return null
  }
}

async function analyzeWhaleActivity () {
  console.log('🐋 Starting dynamic whale activity analysis for ALL items...')

  const [mapping, latest, volumes] = await Promise.all([
    fetchFromApi('mapping'),
    fetchFromApi('latest'),
    fetchFromApi('volumes')
  ])

  if (!mapping || !latest || !volumes) {
    console.error('Failed to fetch essential API data. Aborting.')
    return
  }

  const itemMap = new Map(mapping.map(item => [item.id, { ...item, volume: volumes.data[item.id] || 0 }]))

  // Analyze ALL items, not just bulk items
  const allItemIds = mapping
    .filter(item => {
      // Basic filtering: must have a name and reasonable price
      const price = latest.data[item.id]?.high || 0
      return item.name && price > 10 && !item.name.includes('3rd age')
    })
    .map(item => item.id)

  console.log(`Analyzing ${allItemIds.length} items for whale activity...`)

  const whaleActivity = []

  for (const itemId of allItemIds) {
    const item = itemMap.get(itemId)
    const latestPrice = latest.data[itemId]
    if (!item || !latestPrice || !item.volume) continue

    const historyResponse = await fetchFromApi(`timeseries?timestep=6h&id=${itemId}`)
    if (!historyResponse || !historyResponse.data || historyResponse.data.length < 2) continue

    const history = historyResponse.data
    const last24hHistory = history.slice(-24) // Assuming 6h timestep gives data for past few days, get last 24h

    if (last24hHistory.length === 0) continue

    const avgVolume = last24hHistory.reduce((acc, curr) => acc + (curr.tradingVolume || 0), 0) / last24hHistory.length
    const avgPrice = last24hHistory.reduce((acc, curr) => acc + (curr.avgHighPrice || latestPrice.high), 0) / last24hHistory.length

    const currentVolume = item.volume
    const currentPrice = latestPrice.high

    let score = 0
    const reasons = []

    // 1. Volume Spike Analysis
    if (avgVolume > 50) { // Lowered threshold for all items
      const volumeRatio = currentVolume / avgVolume
      if (volumeRatio > 2.0) {
        score += 35
        reasons.push(`Volume Spike: ${volumeRatio.toFixed(1)}x the 6h average.`)
      }
    }

    // 2. Price Volatility Analysis
    if (avgPrice > 0) {
      const priceRatio = currentPrice / avgPrice
      if (priceRatio > 1.05) { // 5% increase
        score += 25
        reasons.push(`Price Spike: Up ${((priceRatio - 1) * 100).toFixed(0)}% vs 6h average.`)
      } else if (priceRatio < 0.95) { // 5% decrease
        score += 25
        reasons.push(`Price Dump: Down ${((1 - priceRatio) * 100).toFixed(0)}% vs 6h average.`)
      }
    }

    // 3. Market Cap / Trade Value Analysis
    const marketCap = currentPrice * currentVolume
    if (marketCap > 500_000_000) { // Lowered to 500M GP for all items
      score += 20
      reasons.push(`High Daily Value: ${(marketCap / 1_000_000_000).toFixed(1)}B GP traded.`)
    }

    // 4. Bonus for known bulk items (but not required)
    const isBulkItem = BULK_ITEMS.some(bulkName => bulkName.toLowerCase() === item.name.toLowerCase())
    if (isBulkItem) {
      score += 5
      reasons.push('Known bulk trading item.')
    }

    // 5. Large single transaction detection
    if (currentVolume > 100000 && currentPrice > 10000) {
      score += 15
      reasons.push('Large transaction activity detected.')
    }

    if (score >= 25) { // Lowered threshold for all items
      whaleActivity.push({
        id: itemId,
        name: item.name,
        icon: `https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`,
        score: Math.min(100, score),
        reasons,
        currentPrice,
        avgPrice: Math.round(avgPrice),
        currentVolume,
        avgVolume: Math.round(avgVolume),
        isBulkItem
      })
    }
  }

  whaleActivity.sort((a, b) => b.score - a.score)

  const results = {
    lastUpdated: new Date().toISOString(),
    targets: whaleActivity,
    totalItemsAnalyzed: allItemIds.length,
    bulkItemsFound: whaleActivity.filter(item => item.isBulkItem).length,
    otherItemsFound: whaleActivity.filter(item => !item.isBulkItem).length
  }

  const dataDir = path.join(__dirname, '..', 'public', 'data')
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(path.join(dataDir, 'whale-activity.json'), JSON.stringify(results, null, 2))

  console.log(`✅ Whale analysis complete. Found ${whaleActivity.length} potential whale targets.`)
  console.log('📊 Analysis summary:')
  console.log(`   - Total items analyzed: ${allItemIds.length}`)
  console.log(`   - Bulk items found: ${results.bulkItemsFound}`)
  console.log(`   - Other items found: ${results.otherItemsFound}`)
  console.log('Top 10 targets:')
  whaleActivity.slice(0, 10).forEach(item => {
    const type = item.isBulkItem ? '[BULK]' : '[OTHER]'
    console.log(`- ${type} ${item.name} (Score: ${item.score}): ${item.reasons.join(' ')}`)
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeWhaleActivity().catch(error => {
    console.error('❌ Whale monitoring script failed:', error)
    process.exit(1)
  })
}

export { analyzeWhaleActivity }
