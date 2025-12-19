/**
 * Daily cron job to scrape Game Updates from OSRS Wiki
 * Runs at 2:30 AM UTC daily
 */

import gameUpdatesScraper from '../services/gameUpdatesScraper.js'
import { db } from '../db/index.js'
import { cronJobLogs } from '../db/schema.js'

export async function scrapeGameUpdatesCron() {
  const startTime = new Date()
  let success = false
  let errorMessage: string | null = null
  let inserted = 0

  try {
    console.log('[Cron] Starting Game Updates scraping...')
    
    await gameUpdatesScraper.scrapeAndSaveUpdates()
    success = true
    inserted = 1 // The scraper handles individual insertions

    console.log('[Cron] Game Updates scraping completed successfully')
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Cron] Error scraping Game Updates:', error)
  } finally {
    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    // Log to cronJobLogs
    try {
      await db.insert(cronJobLogs).values({
        jobName: 'scrape-game-updates',
        jobType: 'data-sync',
        status: success ? 'success' : 'failed',
        startedAt: startTime,
        completedAt: endTime,
        duration: duration,
        logs: JSON.stringify({
          inserted,
          error: errorMessage
        })
      })
    } catch (logError) {
      console.error('[Cron] Failed to log cron job execution:', logError)
    }
  }
}

// Export default for cron scheduler
export default scrapeGameUpdatesCron

