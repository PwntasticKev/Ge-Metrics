#!/usr/bin/env node

import historyDataService from '../src/services/historyDataService.js'

async function main () {
  console.log('🚀 Starting price history collection...')

  try {
    // Collect current prices for all items
    console.log('\n📊 Collecting current prices...')
    const currentPricesResult = await historyDataService.collectCurrentPrices()
    console.log(`✅ Collected current prices: ${currentPricesResult.count} records`)

    // Get high volume items
    console.log('\n📈 Getting high volume items...')
    const highVolumeItems = await historyDataService.getHighVolumeItems(10)
    console.log(`✅ Found ${highVolumeItems.length} high volume items:`)

    highVolumeItems.forEach((item, index) => {
      console.log(`${index + 1}. Item ID ${item.itemId}: Volume ${item.volume?.toLocaleString() || 'N/A'}`)
    })

    // Collect historical data for the top high volume item
    if (highVolumeItems.length > 0) {
      const topItem = highVolumeItems[0]
      console.log(`\n📚 Collecting historical data for top volume item (ID: ${topItem.itemId})...`)
      const historyResult = await historyDataService.collectItemHistory(topItem.itemId, '1h')
      console.log(`✅ Collected historical data: ${historyResult.count} records`)
    }

    console.log('\n🎉 Price history collection completed successfully!')
  } catch (error) {
    console.error('❌ Error during price history collection:', error.message)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)
