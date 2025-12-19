/**
 * Cron Job Executor Service
 * Maps cron job names to actual service functions for manual execution
 */

import { db } from '../db/index.js'
import { cronJobs, cronJobLogs } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { updateDeveloperBlogs } from './blogScraperService.js'
import gameUpdatesScraper from './gameUpdatesScraper.js'
import { PriceCacheService } from './priceCacheService.js'
import { HistoricalDataService } from './historicalDataService.js'
import { updateAllItemVolumes } from './itemVolumeService.js'

interface JobExecutionResult {
  success: boolean
  duration: number
  logs: string
  error?: string
}

/**
 * Job execution mappings
 * Maps cron job command/name to actual service function
 */
const JOB_EXECUTORS: Record<string, () => Promise<any>> = {
  'scrape-developer-blogs': async () => {
    const result = await updateDeveloperBlogs()
    return {
      inserted: result.inserted,
      skipped: result.skipped
    }
  },
  'scrape-game-updates': async () => {
    await gameUpdatesScraper.scrapeAndSaveUpdates()
    return { success: true }
  },
  'fetch-price-data': async () => {
    const service = PriceCacheService.getInstance()
    await service.fetchAndCachePrices()
    return { success: true }
  },
  'collect-historical-data': async () => {
    const service = HistoricalDataService.getInstance()
    // This would need item IDs - for now, return a placeholder
    // In production, you'd want to pass item IDs or fetch all items
    return { message: 'Historical data collection requires item IDs' }
  },
  'update-item-volumes': async () => {
    await updateAllItemVolumes()
    return { success: true }
  }
}

/**
 * Execute a cron job by name
 */
export async function executeJob(jobName: string): Promise<JobExecutionResult> {
  const startTime = Date.now()
  let success = false
  let errorMessage: string | null = null
  let executionLogs: any = {}

  // Find the job in database
  const [job] = await db.select().from(cronJobs).where(eq(cronJobs.name, jobName)).limit(1)

  if (!job) {
    throw new Error(`Job "${jobName}" not found`)
  }

  if (!job.enabled) {
    throw new Error(`Job "${jobName}" is disabled`)
  }

  // Check if job is already running
  if (job.status === 'running') {
    throw new Error(`Job "${jobName}" is already running`)
  }

  try {
    // Update job status to running
    await db
      .update(cronJobs)
      .set({
        status: 'running',
        lastRun: new Date()
      })
      .where(eq(cronJobs.id, job.id))

    // Get executor function
    const executor = JOB_EXECUTORS[job.command] || JOB_EXECUTORS[jobName]

    if (!executor) {
      throw new Error(`No executor found for job "${jobName}" (command: "${job.command}")`)
    }

    // Execute the job
    console.log(`[CronJobExecutor] Executing job: ${jobName}`)
    const result = await executor()
    executionLogs = result
    success = true

    console.log(`[CronJobExecutor] Job "${jobName}" completed successfully`)

    // Update job status to success
    await db
      .update(cronJobs)
      .set({
        status: 'success',
        lastRun: new Date()
      })
      .where(eq(cronJobs.id, job.id))
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error'
    success = false

    console.error(`[CronJobExecutor] Job "${jobName}" failed:`, error)

    // Update job status to failed
    await db
      .update(cronJobs)
      .set({
        status: 'failed',
        lastRun: new Date()
      })
      .where(eq(cronJobs.id, job.id))
  } finally {
    const endTime = Date.now()
    const duration = endTime - startTime

    // Log execution to cronJobLogs
    try {
      await db.insert(cronJobLogs).values({
        jobName: job.name,
        jobType: job.category,
        status: success ? 'success' : 'failed',
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        duration: duration,
        logs: JSON.stringify({
          ...executionLogs,
          error: errorMessage,
          manualTrigger: true
        })
      })
    } catch (logError) {
      console.error('[CronJobExecutor] Failed to log execution:', logError)
    }
  }

  return {
    success,
    duration: Date.now() - startTime,
    logs: JSON.stringify(executionLogs),
    error: errorMessage || undefined
  }
}

/**
 * Get available job executors
 */
export function getAvailableJobs(): string[] {
  return Object.keys(JOB_EXECUTORS)
}

