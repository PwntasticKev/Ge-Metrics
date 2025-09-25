import { exec } from 'child_process'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './trpc/index.js'
import { createContext } from './trpc/trpc.js'
import { config } from './config/index.js'
import { csrfProtection, rateLimit } from './middleware/security.js'
import priceCacheService from './services/priceCacheService.js'
import gameUpdatesScraper from './services/gameUpdatesScraper.js'
import favoritesRouter from './routes/favorites.js'
import historicalDataRouter from './routes/historicalData.js'
import { scheduleVolumeUpdates } from './tasks/updateVolumes.js'
import { updateAllItemVolumes } from './services/itemVolumeService.js'

const app = express()

// Security middleware
// app.use(helmet({
//   crossOriginEmbedderPolicy: false,
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'"],
//       imgSrc: ["'self'", 'data:', 'https:']
//     }
//   }
// }))

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

// Rate limiting (relaxed for development)
app.use(rateLimit(10000, 15 * 60 * 1000)) // 10,000 requests per 15 minutes

// CSRF protection for state-changing operations
// app.use('/trpc', csrfProtection)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  })
})

// API routes
app.use('/api/favorites', favoritesRouter)
app.use('/api/historical', historicalDataRouter)

// tRPC middleware
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))

// Cookie management endpoints
app.post('/auth/set-tokens', (req, res) => {
  const { accessToken, refreshToken } = req.body

  if (!accessToken || !refreshToken) {
    return res.status(400).json({ error: 'Tokens required' })
  }

  // Set HTTP-only cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })

  res.json({ success: true })
})

app.post('/auth/clear-tokens', (req, res) => {
  res.clearCookie('accessToken')
  res.clearCookie('refreshToken')
  res.json({ success: true })
})

// Get CSRF token endpoint
app.get('/csrf-token', (req, res) => {
  // Generate a simple CSRF token (in production, use a more secure method)
  const csrfToken = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64')
  res.json({ csrfToken })
})

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', error)
  res.status(500).json({
    error: config.NODE_ENV === 'development' ? error.message : 'Internal server error'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// This block will only run in a local development environment, not on Vercel.
if (!process.env.VERCEL) {
  // Run the populate item mapping script before starting the server
  // NOTE: In production, this should be a build step or a separate cron job.
  console.log('🚀 Running populate item mapping script...')
  exec('npm run db:populate-mapping', (error, stdout, stderr) => {
    if (error) {
      console.error(`💥 Error running populate script: ${error}`)
      return
    }
    console.log(`✅ Populate script output: ${stdout}`)
    if (stderr) {
      console.error(`💥 Populate script error output: ${stderr}`)
    }
  })

  // Start server
  app.listen(config.PORT, () => {
    console.log(`🚀 Server listening on port ${config.PORT}`)

    // Schedule cron jobs
    // NOTE: In production, cron jobs should be configured in vercel.json.
    scheduleVolumeUpdates()
    startGameUpdatesScheduler()

    // Perform an initial update on server startup
    console.log('🚀 Performing initial item volume update on startup...')
    updateAllItemVolumes().catch(error => {
      console.error('💥 [Startup] Error during initial volume update:', error)
    })
  })
}

/**
 * Start game updates scheduler
 */
function startGameUpdatesScheduler (): void {
  console.log('🎮 Starting game updates scheduler (every 6 hours)...')

  // Run immediately on startup
  gameUpdatesScraper.scrapeAndSaveUpdates()

  // Schedule to run every 6 hours (6 * 60 * 60 * 1000 ms)
  setInterval(() => {
    gameUpdatesScraper.scrapeAndSaveUpdates()
  }, 6 * 60 * 60 * 1000)
}

export default app
