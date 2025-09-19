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
import potionVolumesRouter from './routes/potionVolumes.js'
import { updateTopPotionVolumes } from './services/potionVolumeService.js'

const app = express()

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
}))

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8000', config.FRONTEND_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Rate limiting (relaxed for development)
app.use(rateLimit(10000, 15 * 60 * 1000)) // 10,000 requests per 15 minutes

// CSRF protection for state-changing operations
app.use('/trpc', csrfProtection)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  })
})

// API routes
app.use('/api/potion-volumes', potionVolumesRouter)

// tRPC middleware
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: ({ error, path, input }) => {
    console.error(`❌ tRPC Error on ${path}:`, error)
    if (config.NODE_ENV === 'development') {
      console.error('Input:', input)
    }
  }
}))

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

// Start server
const port = config.PORT
app.listen(port, () => {
  console.log(`🚀 Auth server running on http://localhost:${port}`)
  console.log(`📋 Health check: http://localhost:${port}/health`)
  console.log(`🔐 tRPC endpoint: http://localhost:${port}/trpc`)
  console.log(`🌍 Environment: ${config.NODE_ENV}`)

  // Start background services
  console.log('🔄 Starting background services...')

  // Start price cache service (fetches prices every 2 minutes)
  priceCacheService.startPeriodicFetching()

  // Start game updates scraper (runs every 6 hours)
  startGameUpdatesScheduler()

  // Start potion volume cache (updates every 2.5 minutes)
  startPotionVolumeScheduler()
})

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

/**
 * Start potion volume cache scheduler
 */
function startPotionVolumeScheduler (): void {
  console.log('🧪 Starting potion volume cache scheduler (every 2.5 minutes)...')

  // Run immediately on startup (with a 10 second delay to let other services start)
  setTimeout(() => {
    updateTopPotionVolumes().catch(error => {
      console.error('Initial potion volume update failed:', error)
    })
  }, 10000)

  // Schedule to run every 2.5 minutes (150 seconds)
  setInterval(() => {
    updateTopPotionVolumes().catch(error => {
      console.error('Scheduled potion volume update failed:', error)
    })
  }, 150 * 1000)
}

export { app }
