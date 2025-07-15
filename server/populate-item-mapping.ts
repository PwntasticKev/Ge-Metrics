#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import axios from 'axios'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log (message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader (message: string) {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.bold}${colors.blue}${message}${colors.reset}`)
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`)
}

async function populateItemMapping () {
  logHeader('Populating Item Mapping Table')

  try {
    // Check if we already have items
    const existingItems = await db.select().from(schema.itemMapping)
    log(`Found ${existingItems.length} existing items in database`, 'yellow')

    if (existingItems.length > 100) {
      log('Item mapping table already populated!', 'green')
      return
    }

    // Fetch item mapping from OSRS Wiki API
    log('Fetching item mapping from OSRS Wiki API...', 'yellow')
    const response = await axios.get('https://prices.runescape.wiki/api/v1/osrs/mapping', {
      headers: {
        'User-Agent': 'Ge-Metrics Item Mapping Populator - Contact: admin@ge-metrics.com'
      }
    })

    const items = response.data
    log(`Retrieved ${items.length} items from API`, 'green')

    // Transform items for database
    const dbItems = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      examine: item.examine,
      members: item.members || false,
      lowalch: item.lowalch,
      highalch: item.highalch,
      limit: item.limit,
      value: item.value,
      icon: `https://oldschool.runescape.wiki/images/c/c1/${item.name.replace(/\s+/g, '_')}.png?${item.id}b`,
      wikiUrl: `https://oldschool.runescape.wiki/w/${item.name.replace(/\s+/g, '_')}`
    }))

    // Insert in batches to avoid overwhelming the database
    const batchSize = 100
    let insertedCount = 0

    for (let i = 0; i < dbItems.length; i += batchSize) {
      const batch = dbItems.slice(i, i + batchSize)

      try {
        await db.insert(schema.itemMapping).values(batch)
        insertedCount += batch.length
        log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(dbItems.length / batchSize)} (${batch.length} items)`, 'green')
      } catch (error) {
        // Skip duplicates
        if (error instanceof Error && error.message.includes('duplicate')) {
          log(`Skipped duplicate items in batch ${Math.floor(i / batchSize) + 1}`, 'yellow')
        } else {
          log(`Error inserting batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
        }
      }

      // Small delay to be respectful to the database
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    logHeader('Item Mapping Population Complete')
    log(`Successfully populated item mapping table with ${insertedCount} items`, 'green')
    log('Pricing system can now save price history without foreign key constraint violations', 'green')

    // Verify the population
    const finalCount = await db.select().from(schema.itemMapping)
    log(`Total items in database: ${finalCount.length}`, 'blue')
  } catch (error) {
    log(`Error populating item mapping: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
    throw error
  }
}

// Run the population
populateItemMapping().catch((error) => {
  log(`Population failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
  process.exit(1)
})
