import { exec } from 'child_process'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './trpc/index.js'
import { createContext } from './trpc/trpc.js'
import { runMigrations } from './db/migrate.js'
import { config } from './config/index.js'
import { csrfProtection, rateLimit } from './middleware/security.js'
import priceCacheService from './services/priceCacheService.js'
import gameUpdatesScraper from './services/gameUpdatesScraper.js'
import blogCronRoutes from './routes/blogCron.js'
import stripeRoutes from './routes/stripe.js'
// import { scheduleVolumeUpdates } from './tasks/updateVolumes.js' - This is no longer needed
import { updateAllItemVolumes } from './services/itemVolumeService.js'
import { db, itemMapping, itemVolumes } from './db/index.js'

const app = express()

// Mount Stripe webhook BEFORE JSON body parser to preserve raw body
app.use('/api/stripe', stripeRoutes)

// Run migrations on startup
runMigrations().catch((error) => {
  console.error('Migration failed on startup:', error)
  // In production, we'll log the error but continue starting the server
  // This prevents the entire app from crashing due to migration issues
  console.log('Server will continue starting despite migration failure...')
})

// Populate item mapping if empty (after migrations) and verify email connection
setTimeout(async () => {
  try {
    const count = await db.select().from(itemMapping)
    if (count.length === 0) {
      console.log('[Startup] Item mapping table is empty, will populate on first request')
    } else {
      console.log(`[Startup] Item mapping table has ${count.length} items`)
    }
    
    // Also check and populate item_volumes if empty
    const volumeCount = await db.select().from(itemVolumes)
    if (volumeCount.length === 0) {
      console.log('[Startup] Item volumes table is empty, triggering initial population...')
      // Trigger volume update in background (don't await - let it run async)
      updateAllItemVolumes().catch((error) => {
        console.error('[Startup] Failed to populate item volumes:', error)
      })
    } else {
      console.log(`[Startup] Item volumes table has ${volumeCount.length} items`)
    }

    // Verify email connection (temporarily disabled due to missing AWS SDK)
    // const { verifyEmailConnection } = await import('./services/emailService.js')
    // await verifyEmailConnection()

    // Seed cron jobs if they don't exist
    const { seedCronJobs } = await import('./scripts/seedCronJobs.js')
    await seedCronJobs()
  } catch (error) {
    console.error('[Startup] Error checking tables or email connection:', error)
  }
}, 2000) // Wait 2 seconds for migrations to complete

// CORS configuration
const allowedOrigins = [config.FRONTEND_URL]
if (config.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:8000')
}
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  })
})

// API routes
app.use('/api/cron/blogs', blogCronRoutes)

// tRPC middleware
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ [Vercel] Unhandled Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method
  })
  res.status(500).json({
    error: config.NODE_ENV === 'development' ? error.message : 'A server error occurred. Please try again later.'
  })
})

// This block will only run in a local development environment, not on Vercel.
if (!process.env.VERCEL) {
  app.listen(config.PORT, () => {
    console.log(`🚀 Server listening on port ${config.PORT}`)
  })
}

export default app
