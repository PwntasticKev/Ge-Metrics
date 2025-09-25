import { db, itemMapping } from '../db/index.js'
import { NewItemMapping } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import 'dotenv/config'

async function populateItemMapping () {
  console.log('🔄 Starting to fetch item mapping from OSRS Wiki API...')
  try {
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping')
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`)
    }
    const data: any[] = await response.json()
    console.log(`✅ Fetched ${data.length} item definitions.`)

    if (data.length === 0) {
      console.log('No data to insert. Exiting.')
      return
    }

    const formattedData: NewItemMapping[] = data.map(item => ({
      id: item.id,
      name: item.name,
      examine: item.examine,
      members: item.members,
      lowalch: item.lowalch,
      highalch: item.highalch,
      limit: item.limit,
      value: item.value,
      icon: item.icon,
      // The mapping API doesn't provide a wiki_url, so we construct it.
      wikiUrl: `https://oldschool.runescape.wiki/w/Special:Lookup?search=${encodeURIComponent(item.name)}`
    }))

    console.log('🔄 Inserting/updating item mappings in the database...')

    // Using chunking to avoid sending a single giant query
    const chunkSize = 500
    for (let i = 0; i < formattedData.length; i += chunkSize) {
      const chunk = formattedData.slice(i, i + chunkSize)
      await db.insert(itemMapping)
        .values(chunk)
        .onConflictDoUpdate({
          target: itemMapping.id,
          set: {
            name: itemMapping.name,
            examine: itemMapping.examine,
            members: itemMapping.members,
            lowalch: itemMapping.lowalch,
            highalch: itemMapping.highalch,
            limit: itemMapping.limit,
            value: itemMapping.value,
            icon: itemMapping.icon,
            wikiUrl: itemMapping.wikiUrl,
            updatedAt: new Date()
          }
        })
      console.log(`... Inserted/updated chunk ${i / chunkSize + 1}`)
    }

    console.log('✅ Database population complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ An error occurred during database population:', error)
    process.exit(1)
  }
}

populateItemMapping()
