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

console.log('--- VERCEL LOG START ---')
try {
  console.log('Importing child_process...')
  const { exec } = await import('child_process')

  console.log('Importing express...')
  const express = (await import('express')).default

  console.log('Importing cors...')
  const cors = (await import('cors')).default

  console.log('Importing helmet...')
  const helmet = (await import('helmet')).default

  console.log('Importing cookie-parser...')
  const cookieParser = (await import('cookie-parser')).default

  console.log('Importing tRPC adapter...')
  const { createExpressMiddleware } = await import('@trpc/server/adapters/express')

  console.log('Importing tRPC appRouter...')
  const { appRouter } = await import('./trpc/index.js')

  console.log('Importing tRPC createContext...')
  const { createContext } = await import('./trpc/trpc.js')

  console.log('Importing config...')
  const { config } = await import('./config/index.js')
  console.log(`NODE_ENV: ${config.NODE_ENV}`)
  console.log(`FRONTEND_URL loaded: ${config.FRONTEND_URL}`)

  console.log('Importing security middleware...')
  const { csrfProtection, rateLimit } = await import('./middleware/security.js')

  console.log('Importing services...')
  const priceCacheService = (await import('./services/priceCacheService.js')).default
  const gameUpdatesScraper = (await import('./services/gameUpdatesScraper.js')).default

  console.log('Importing routers...')
  const favoritesRouter = (await import('./routes/favorites.js')).default
  const historicalDataRouter = (await import('./routes/historicalData.js')).default

  console.log('Importing tasks...')
  const { scheduleVolumeUpdates } = await import('./tasks/updateVolumes.js')
  const { updateAllItemVolumes } = await import('./services/itemVolumeService.js')

  console.log('--- IMPORTS SUCCEEDED ---')

  const app = express()
  console.log('Express app initialized.')

  // CORS configuration
  const allowedOrigins = [config.FRONTEND_URL]
  if (config.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:8000')
  }
  console.log('Allowed origins:', allowedOrigins)
  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }))
  console.log('CORS middleware configured.')

  // Body parsing and cookies
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cookieParser())
  console.log('Body parsing and cookie parser middleware configured.')

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })
  console.log('Health check configured.')

  // API and tRPC routes
  app.use('/api/favorites', favoritesRouter)
  app.use('/api/historical', historicalDataRouter)
  app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }))
  console.log('API and tRPC routes configured.')

  // Final error handler
  app.use((error, req, res, next) => {
    console.error('--- UNHANDLED ERROR ---')
    console.error(error)
    res.status(500).json({ error: 'A server error occurred.' })
  })
  console.log('Error handler configured.')

  console.log('--- INITIALIZATION COMPLETE ---')

  // Export the app for Vercel
  module.exports = app
} catch (e) {
  console.error('--- FATAL STARTUP ERROR ---')
  console.error(e)
  // Exit gracefully to prevent Vercel from thinking the function is running
  process.exit(1)
}
