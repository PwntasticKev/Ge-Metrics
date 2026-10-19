import { Router, Request, Response } from 'express'
import { scrapeAndSaveUpdates } from '../services/gameUpdatesScraper.js'

const router = Router()

router.get('/update', async (req: Request, res: Response) => {
  try {
    console.log('[GameUpdatesCron] Starting scheduled game updates scrape...')

    const authHeader = req.headers.authorization
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[GameUpdatesCron] Unauthorized cron request')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await scrapeAndSaveUpdates()

    if (result.success) {
      console.log(`[GameUpdatesCron] Success: ${result.inserted} inserted, ${result.skipped} skipped`)
      return res.status(200).json({
        success: true,
        inserted: result.inserted,
        skipped: result.skipped,
        timestamp: new Date().toISOString()
      })
    } else {
      console.error(`[GameUpdatesCron] Failed: ${result.error}`)
      return res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('[GameUpdatesCron] Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

export default router
