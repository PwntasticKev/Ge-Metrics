import express from 'express'
import cors from 'cors'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './trpc/index-simple.js'
import { createContext } from './trpc/trpc.js'
import { config } from './config/simple.js'

const app = express()

// Master user for testing - Use environment variables in production
const masterUser = {
  id: 'master-user-id',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'CHANGE_THIS_PASSWORD',
  name: process.env.ADMIN_NAME || 'Admin User',
  createdAt: new Date()
}

// Basic CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Authentication server is running',
    masterCredentials: masterUser
  })
})

// tRPC middleware
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: ({ error, path, input }) => {
    console.error(`❌ tRPC Error on ${path}:`, error)
    console.error('Input:', input)
  }
}))

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
  console.log('')
  console.log('🔑 MASTER LOGIN CREDENTIALS:')
  console.log('   Email: admin@test.com')
  console.log('   Password: admin123')
  console.log('')
  console.log('✅ Ready for testing without database setup!')
})

export { app }
