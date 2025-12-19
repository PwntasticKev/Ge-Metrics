/**
 * Seed script to add missing cron jobs for scraping blogs and game updates
 * Run this script to ensure the cron jobs exist in the database
 */

import { db } from '../db/index.js'
import { cronJobs } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const JOBS_TO_SEED = [
  {
    name: 'scrape-developer-blogs',
    description: 'Scrapes Developer Blogs from OSRS Wiki daily',
    schedule: '0 2 * * *', // 2 AM UTC daily
    scheduleDescription: 'Daily at 2:00 AM UTC',
    command: 'scrape-developer-blogs',
    category: 'data-sync',
    enabled: true
  },
  {
    name: 'scrape-game-updates',
    description: 'Scrapes Game Updates from OSRS Wiki daily',
    schedule: '0 2:30 * * *', // 2:30 AM UTC daily
    scheduleDescription: 'Daily at 2:30 AM UTC',
    command: 'scrape-game-updates',
    category: 'data-sync',
    enabled: true
  }
]

export async function seedCronJobs() {
  console.log('[SeedCronJobs] Starting cron jobs seeding...')

  let inserted = 0
  let skipped = 0

  for (const jobData of JOBS_TO_SEED) {
    try {
      // Check if job already exists
      const existing = await db
        .select()
        .from(cronJobs)
        .where(eq(cronJobs.name, jobData.name))
        .limit(1)

      if (existing.length > 0) {
        console.log(`[SeedCronJobs] Job "${jobData.name}" already exists, skipping`)
        skipped++
        continue
      }

      // Insert new job
      await db.insert(cronJobs).values({
        name: jobData.name,
        description: jobData.description,
        schedule: jobData.schedule,
        scheduleDescription: jobData.scheduleDescription,
        command: jobData.command,
        category: jobData.category,
        enabled: jobData.enabled,
        status: 'idle'
      })

      console.log(`[SeedCronJobs] Successfully inserted job: "${jobData.name}"`)
      inserted++
    } catch (error) {
      console.error(`[SeedCronJobs] Error seeding job "${jobData.name}":`, error)
    }
  }

  console.log(`[SeedCronJobs] Completed. Inserted: ${inserted}, Skipped: ${skipped}`)
  return { inserted, skipped }
}

// Run if called directly (for manual execution)
// This check works when running via tsx or ts-node
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  seedCronJobs()
    .then(() => {
      console.log('[SeedCronJobs] Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[SeedCronJobs] Script failed:', error)
      process.exit(1)
    })
}

