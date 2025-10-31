import { Router, Request, Response } from 'express'
import { updateDeveloperBlogs } from '../services/blogScraperService.js'

const router = Router()

// Vercel Cron Job endpoint - runs daily at 8am UTC
router.get('/update', async (req: Request, res: Response) => {
  try {
    console.log('[BlogCron] Starting scheduled blog update...')
    
    // Verify this is called by Vercel Cron (optional security check)
    const authHeader = req.headers.authorization
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[BlogCron] Unauthorized cron request')
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const result = await updateDeveloperBlogs()
    
    if (result.success) {
      console.log(`[BlogCron] Successfully updated blogs: ${result.inserted} inserted, ${result.skipped} skipped`)
      return res.status(200).json({
        success: true,
        inserted: result.inserted,
        skipped: result.skipped,
        timestamp: new Date().toISOString()
      })
    } else {
      console.error(`[BlogCron] Failed to update blogs: ${result.error}`)
      return res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('[BlogCron] Unexpected error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

export default router

