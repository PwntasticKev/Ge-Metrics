#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import HistoricalDataService from '../src/services/historicalDataService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class HistoricalDataCollector {
  constructor () {
    this.dataService = new HistoricalDataService()
    this.outputDir = path.join(__dirname, '../data/historical')
    this.sqlOutputDir = path.join(__dirname, '../data/sql')
  }

  async ensureDirectories () {
    try {
      await fs.mkdir(this.outputDir, { recursive: true })
      await fs.mkdir(this.sqlOutputDir, { recursive: true })
    } catch (error) {
      console.error('Error creating directories:', error)
    }
  }

  async collectAndSaveAllData () {
    console.log('🚀 Starting comprehensive historical data collection...')
    console.log('This may take several hours to complete due to API rate limiting.')

    try {
      await this.ensureDirectories()

      // Step 1: Get item mapping
      console.log('\n📋 Step 1: Fetching item mapping...')
      const itemMapping = await this.dataService.fetchItemMapping()
      await this.saveToFile('item_mapping.json', itemMapping)
      console.log(`✅ Saved mapping for ${itemMapping.length} items`)

      // Step 2: Get current prices
      console.log('\n💰 Step 2: Fetching current prices...')
      const currentPrices = await this.dataService.fetchLatestPrices()
      await this.saveToFile('current_prices.json', currentPrices)
      console.log(`✅ Saved current prices for ${Object.keys(currentPrices).length} items`)

      // Step 3: Collect historical data for all timesteps
      const timesteps = ['5m', '1h', '6h', '24h']
      const allItemIds = itemMapping.map(item => item.id)

      console.log(`\n📈 Step 3: Collecting historical data for ${allItemIds.length} items...`)
      console.log(`Timesteps: ${timesteps.join(', ')}`)

      const historicalResults = {
        metadata: {
          collectionDate: new Date().toISOString(),
          totalItems: allItemIds.length,
          timesteps,
          apiEndpoint: this.dataService.baseUrl
        },
        data: {}
      }

      for (const timestep of timesteps) {
        console.log(`\n⏱️  Collecting ${timestep} data...`)

        const timestepData = await this.collectTimestepData(allItemIds, timestep)
        historicalResults.data[timestep] = timestepData

        // Save individual timestep data
        await this.saveToFile(`historical_${timestep}.json`, timestepData)

        const stats = this.calculateTimestepStats(timestepData)
        console.log(`✅ ${timestep} complete: ${stats.successful}/${stats.total} items, ${stats.totalRecords} records`)
      }

      // Step 4: Save complete results
      await this.saveToFile('complete_historical_data.json', historicalResults)

      // Step 5: Generate SQL insert files
      console.log('\n🗄️  Step 5: Generating SQL insert files...')
      await this.generateSQLInserts(historicalResults)

      // Step 6: Generate summary report
      console.log('\n📊 Step 6: Generating summary report...')
      const summary = this.generateSummaryReport(historicalResults)
      await this.saveToFile('collection_summary.json', summary)

      console.log('\n🎉 Historical data collection completed!')
      console.log('📁 Check the /data/historical and /data/sql directories for output files')

      return historicalResults
    } catch (error) {
      console.error('❌ Error during data collection:', error)
      throw error
    }
  }

  async collectTimestepData (itemIds, timestep) {
    const results = []
    const batchSize = 50 // Process in batches to manage memory

    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(itemIds.length / batchSize)} (${batch.length} items)`)

      for (const itemId of batch) {
        try {
          const timeSeriesData = await this.dataService.fetchTimeSeries(itemId, timestep)

          if (timeSeriesData.data && timeSeriesData.data.length > 0) {
            results.push({
              itemId: parseInt(itemId),
              timestep,
              dataPoints: timeSeriesData.data.length,
              data: timeSeriesData.data
            })
          } else {
            results.push({
              itemId: parseInt(itemId),
              timestep,
              dataPoints: 0,
              data: [],
              note: 'No data available'
            })
          }

          // Rate limiting
          await this.dataService.delay(this.dataService.requestDelay)
        } catch (error) {
          console.error(`Error collecting ${timestep} data for item ${itemId}:`, error.message)
          results.push({
            itemId: parseInt(itemId),
            timestep,
            dataPoints: 0,
            data: [],
            error: error.message
          })
        }
      }

      // Save progress periodically
      if (i % (batchSize * 10) === 0) {
        await this.saveToFile(`progress_${timestep}_${i}.json`, results)
        console.log(`💾 Progress saved: ${results.length} items processed`)
      }
    }

    return results
  }

  calculateTimestepStats (timestepData) {
    const stats = {
      total: timestepData.length,
      successful: 0,
      failed: 0,
      totalRecords: 0,
      errors: []
    }

    timestepData.forEach(item => {
      if (item.error) {
        stats.failed++
        stats.errors.push({ itemId: item.itemId, error: item.error })
      } else {
        stats.successful++
        stats.totalRecords += item.dataPoints || 0
      }
    })

    return stats
  }

  async generateSQLInserts (historicalResults) {
    console.log('Generating SQL insert statements...')

    // Generate item_price_history inserts
    const sqlStatements = []
    let recordCount = 0

    for (const [timestep, timestepData] of Object.entries(historicalResults.data)) {
      console.log(`Processing ${timestep} data for SQL generation...`)

      for (const itemData of timestepData) {
        if (itemData.data && itemData.data.length > 0) {
          for (const dataPoint of itemData.data) {
            const timestamp = new Date(dataPoint[0] * 1000).toISOString()
            const price = dataPoint[1] || null
            const volume = dataPoint[2] || null

            sqlStatements.push(
              `INSERT INTO item_price_history (item_id, timestamp, high_price, low_price, volume, created_at) VALUES (${itemData.itemId}, '${timestamp}', ${price}, ${price}, ${volume}, NOW());`
            )
            recordCount++
          }
        }
      }
    }

    // Split into manageable chunks (10k statements per file)
    const chunkSize = 10000
    for (let i = 0; i < sqlStatements.length; i += chunkSize) {
      const chunk = sqlStatements.slice(i, i + chunkSize)
      const chunkNumber = Math.floor(i / chunkSize) + 1
      const filename = `insert_historical_data_part_${chunkNumber}.sql`

      const sqlContent = [
        '-- Historical price data insert statements',
        `-- Part ${chunkNumber} of ${Math.ceil(sqlStatements.length / chunkSize)}`,
        `-- Generated: ${new Date().toISOString()}`,
        '-- Use: mysql -u username -p database_name < this_file.sql',
        '',
        'START TRANSACTION;',
        '',
        ...chunk,
        '',
        'COMMIT;'
      ].join('\n')

      await this.saveToFile(`../sql/${filename}`, sqlContent, false)
    }

    console.log(`✅ Generated ${Math.ceil(sqlStatements.length / chunkSize)} SQL files with ${recordCount} total records`)

    // Generate summary SQL file
    const summarySQL = [
      '-- Historical Data Collection Summary',
      `-- Generated: ${new Date().toISOString()}`,
      `-- Total Records: ${recordCount}`,
      `-- Total Items: ${historicalResults.metadata.totalItems}`,
      `-- Timesteps: ${historicalResults.metadata.timesteps.join(', ')}`,
      '',
      '-- To import all data, run:',
      '-- for f in insert_historical_data_part_*.sql; do mysql -u username -p database_name < "$f"; done',
      '',
      `SELECT 'Historical data collection completed: ${recordCount} records imported' as status;`
    ].join('\n')

    await this.saveToFile('../sql/import_summary.sql', summarySQL, false)
  }

  generateSummaryReport (historicalResults) {
    const summary = {
      collectionDate: new Date().toISOString(),
      metadata: historicalResults.metadata,
      statistics: {
        totalItems: historicalResults.metadata.totalItems,
        timesteps: {}
      },
      recommendations: [],
      nextSteps: []
    }

    // Calculate statistics for each timestep
    for (const [timestep, timestepData] of Object.entries(historicalResults.data)) {
      const stats = this.calculateTimestepStats(timestepData)
      summary.statistics.timesteps[timestep] = stats
    }

    // Generate recommendations
    const totalRecords = Object.values(summary.statistics.timesteps)
      .reduce((sum, stats) => sum + stats.totalRecords, 0)

    summary.recommendations = [
      `Total of ${totalRecords} historical price records collected`,
      'Import SQL files in order using the provided scripts',
      'Set up automated daily collection for ongoing data',
      'Consider creating indexes on item_id and timestamp columns',
      'Monitor database size and implement data retention policies'
    ]

    summary.nextSteps = [
      'Run database migrations to create tables',
      'Import historical data using SQL files',
      'Set up cron job for daily price collection',
      'Implement data validation and cleanup routines',
      'Create backup and recovery procedures'
    ]

    return summary
  }

  async saveToFile (filename, data, isJson = true) {
    const filePath = path.join(this.outputDir, filename)

    try {
      if (isJson) {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      } else {
        await fs.writeFile(filePath, data)
      }
    } catch (error) {
      console.error(`Error saving file ${filename}:`, error)
      throw error
    }
  }
}

// Main execution
async function main () {
  const collector = new HistoricalDataCollector()

  try {
    const results = await collector.collectAndSaveAllData()

    console.log('\n📋 Collection Summary:')
    console.log(`Total Items: ${results.metadata.totalItems}`)
    console.log(`Timesteps: ${results.metadata.timesteps.join(', ')}`)

    const totalRecords = Object.values(results.data)
      .reduce((sum, timestepData) => {
        return sum + timestepData.reduce((timestepSum, item) => {
          return timestepSum + (item.dataPoints || 0)
        }, 0)
      }, 0)

    console.log(`Total Records: ${totalRecords.toLocaleString()}`)
    console.log('\n✅ All data collected and saved successfully!')
  } catch (error) {
    console.error('\n❌ Collection failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default HistoricalDataCollector
