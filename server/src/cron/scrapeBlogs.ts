/**
 * Daily cron job to scrape Developer Blogs from OSRS Wiki
 * Runs at 2 AM UTC daily
 */

import { updateDeveloperBlogs } from '../services/blogScraperService.js'
import { db } from '../db/index.js'
import { cronJobLogs } from '../db/schema.js'

export async function scrapeBlogsCron() {
  const startTime = new Date()
  let success = false
  let errorMessage: string | null = null
  let inserted = 0
  let skipped = 0

  try {
    console.log('[Cron] Starting Developer Blogs scraping...')
    
    const result = await updateDeveloperBlogs()
    inserted = result.inserted
    skipped = result.skipped
    success = true

    console.log(`[Cron] Developer Blogs scraping completed: ${inserted} inserted, ${skipped} skipped`)
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Cron] Error scraping Developer Blogs:', error)
  } finally {
    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    // Log to cronJobLogs
    try {
      await db.insert(cronJobLogs).values({
        jobName: 'scrape-developer-blogs',
        jobType: 'data-sync',
        status: success ? 'success' : 'failed',
        startedAt: startTime,
        completedAt: endTime,
        duration: duration,
        logs: JSON.stringify({
          inserted,
          skipped,
          error: errorMessage
        })
      })
    } catch (logError) {
      console.error('[Cron] Failed to log cron job execution:', logError)
    }
  }
}

// Export default for cron scheduler
export default scrapeBlogsCron

