const { Client } = require('pg')

async function populateProduction() {
  const client = new Client({
    connectionString: "postgres://neondb_owner:npg_iQY84EglFCPR@ep-summer-term-afp8o014-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"
  })

  try {
    await client.connect()
    console.log('Connected to production database')

    // Fetch data from OSRS Wiki API
    console.log('Fetching item mapping from OSRS Wiki API...')
    const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', {
      headers: {
        'User-Agent': 'GE-Metrics/1.0 (https://ge-metrics.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Fetched ${data.length} item definitions.`)

    // Insert data with only the columns that exist in production
    console.log('Inserting data into production database...')
    
    const chunkSize = 100
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize)
      
      const values = []
      const placeholders = []
      let paramCount = 0
      
      chunk.forEach(item => {
        paramCount++
        const offset = (paramCount - 1) * 4
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`)
        values.push(
          item.id,
          item.name,
          item.examine || '',
          item.members || false
        )
      })
      
      const query = `
        INSERT INTO item_mapping (id, name, examine, members) 
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          examine = EXCLUDED.examine,
          members = EXCLUDED.members
      `
      
      await client.query(query, values)
      console.log(`Inserted chunk ${Math.floor(i / chunkSize) + 1}`)
    }

    console.log('✅ Production database population complete!')
    
  } catch (error) {
    console.error('❌ Error populating production database:', error)
  } finally {
    await client.end()
  }
}

populateProduction()