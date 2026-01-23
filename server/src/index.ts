import { exec } from 'child_process'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './trpc/index.js'
import { createContext } from './trpc/trpc.js'
import { runMigrations } from './db/migrate.js'
import { config } from './config/index.js'
import { csrfProtection, rateLimit, securityHeaders } from './middleware/security.js'
import { validateOrExit, printEnvironmentReport } from './config/validation.js'
import priceCacheService from './services/priceCacheService.js'
import gameUpdatesScraper from './services/gameUpdatesScraper.js'
import blogCronRoutes from './routes/blogCron.js'
import stripeRoutes from './routes/stripe.js'
// import { scheduleVolumeUpdates } from './tasks/updateVolumes.js' - This is no longer needed
import { updateAllItemVolumes } from './services/itemVolumeService.js'
import { db, itemMapping, itemVolumes } from './db/index.js'
import { websocketService } from './services/websocketService.js'

// ============================================================================
// ENVIRONMENT VALIDATION - First thing we do on startup
// ============================================================================
console.log('🚀 Starting GE-Metrics Server...')
validateOrExit() // This will exit the process if critical vars are missing
printEnvironmentReport() // This will show a detailed report of the environment

const app = express()
const httpServer = createServer(app)

// Mount Stripe webhook BEFORE JSON body parser to preserve raw body
app.use('/api/stripe', stripeRoutes)

// ============================================================================
// SECURITY MIDDLEWARE - Apply comprehensive security headers and protection
// ============================================================================
app.use(securityHeaders) // Helmet security headers with production-ready configuration
app.use(csrfProtection)  // CSRF protection for all non-GET requests

// Rate limiting for different endpoint types
app.use('/api/stripe', rateLimit(10, 60 * 1000))    // 10 requests per minute for Stripe
app.use('/trpc/auth', rateLimit(5, 60 * 1000))      // 5 requests per minute for auth endpoints
app.use('/trpc', rateLimit(60, 60 * 1000))          // 60 requests per minute for general API
app.use(rateLimit(100, 60 * 1000))                  // 100 requests per minute global limit

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

// Health check endpoint with caching for CDN
app.get('/health', (req, res) => {
  // Cache for 1 minute in browser, 5 minutes on CDN edge
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300')
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    uptime: process.uptime()
  })
})

// Add cache headers middleware for API responses
app.use((req, res, next) => {
  // Default cache headers for API responses
  if (req.path.startsWith('/trpc/items')) {
    // Cache item data for 5 minutes (frequently changing price data)
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
  } else if (req.path.startsWith('/trpc/blogs') || req.path.startsWith('/trpc/gameEvents')) {
    // Cache blog/game content for 1 hour (less frequently changing)
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200')
  } else if (req.path.startsWith('/trpc/money-making-methods')) {
    // Cache money making methods for 10 minutes 
    res.set('Cache-Control', 'public, max-age=600, s-maxage=1200')
  } else if (req.path.startsWith('/api/') || req.path.startsWith('/trpc/')) {
    // Default short cache for other API endpoints
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300')
  }
  next()
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

// Initialize WebSocket service
websocketService.initialize(httpServer).then(() => {
  console.log('✅ WebSocket Analytics Service ready')
}).catch((error) => {
  console.error('❌ Failed to initialize WebSocket service:', error)
})

// Cleanup on process termination
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, cleaning up...')
  websocketService.cleanup()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, cleaning up...')
  websocketService.cleanup()
  process.exit(0)
})

// This block will only run in a local development environment, not on Vercel.
if (!process.env.VERCEL) {
  httpServer.listen(config.PORT, () => {
    console.log(`🚀 Server listening on port ${config.PORT}`)
    console.log(`📡 WebSocket endpoint: ws://localhost:${config.PORT}/analytics-ws`)
  })
} else {
  // On Vercel, we still need to initialize WebSocket but it won't be available
  console.log('⚠️ Running on Vercel - WebSocket features disabled, using polling fallback')
}

export default app
