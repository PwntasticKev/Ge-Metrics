const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app = express()

// Configuration
const config = {
  JWT_ACCESS_SECRET: 'your-super-secret-access-token-key-for-development-only',
  JWT_REFRESH_SECRET: 'your-super-secret-refresh-token-key-for-development-only',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  PORT: 4000,
  FRONTEND_URL: 'http://localhost:5173'
}

// In-memory storage
const users = []
const refreshTokens = []

// Helper functions
function generateId () {
  return Math.random().toString(36).substr(2, 9)
}

function generateTokens (userId, email) {
  const accessToken = jwt.sign(
    { userId, email, type: 'access' },
    config.JWT_ACCESS_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRES_IN }
  )

  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
  )

  return { accessToken, refreshToken }
}

function verifyAccessToken (token) {
  return jwt.verify(token, config.JWT_ACCESS_SECRET)
}

function verifyRefreshToken (token) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET)
}

// Master user for testing - Use environment variables in production
const masterUser = {
  id: 'master-user-id',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  passwordHash: process.env.ADMIN_PASSWORD_HASH || '$2a$12$placeholder.hash.for.testing.only',
  name: process.env.ADMIN_NAME || 'Admin User',
  createdAt: new Date()
}

users.push(masterUser)

// Middleware
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}))

app.use(express.json())

// Auth middleware
function authenticateToken (req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  try {
    const user = verifyAccessToken(token)
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Authentication server is running',
    masterCredentials: {
      email: 'admin@test.com',
      password: 'admin123'
    }
  })
})

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' })
    }

    // Check if user exists
    const existingUser = users.find(u => u.email === email)
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = {
      id: generateId(),
      email,
      passwordHash,
      name,
      createdAt: new Date()
    }

    users.push(user)

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email)

    // Store refresh token
    refreshTokens.push({
      id: generateId(),
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user
    const user = users.find(u => u.email === email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email)

    // Store refresh token
    refreshTokens.push({
      id: generateId(),
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Refresh token
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' })
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)

    // Check if refresh token exists in storage
    const tokenRecord = refreshTokens.find(rt => rt.token === refreshToken)
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' })
    }

    // Get user
    const user = users.find(u => u.id === payload.userId)
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.email)

    // Remove old refresh token
    const tokenIndex = refreshTokens.findIndex(rt => rt.token === refreshToken)
    if (tokenIndex !== -1) {
      refreshTokens.splice(tokenIndex, 1)
    }

    // Store new refresh token
    refreshTokens.push({
      id: generateId(),
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      accessToken,
      refreshToken: newRefreshToken
    })
  } catch (error) {
    console.error('Refresh error:', error)
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

// Logout
app.post('/auth/logout', (req, res) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      const tokenIndex = refreshTokens.findIndex(rt => rt.token === refreshToken)
      if (tokenIndex !== -1) {
        refreshTokens.splice(tokenIndex, 1)
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get current user
app.get('/auth/me', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    })
  } catch (error) {
    console.error('Me error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Start server
app.listen(config.PORT, () => {
  console.log(`🚀 Auth server running on http://localhost:${config.PORT}`)
  console.log(`📋 Health check: http://localhost:${config.PORT}/health`)
  console.log(`🔐 Auth endpoints: http://localhost:${config.PORT}/auth/*`)
  console.log('')
  console.log('🔑 MASTER LOGIN CREDENTIALS:')
  console.log('   Email: admin@test.com')
  console.log('   Password: admin123')
  console.log('')
  console.log('📝 Available endpoints:')
  console.log('   POST /auth/register - Register new user')
  console.log('   POST /auth/login - Login user')
  console.log('   POST /auth/refresh - Refresh tokens')
  console.log('   POST /auth/logout - Logout user')
  console.log('   GET /auth/me - Get current user (requires Authorization header)')
  console.log('')
  console.log('✅ Ready for testing without database setup!')
})
