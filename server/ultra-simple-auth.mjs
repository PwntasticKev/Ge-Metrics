import http from 'http'
import { URL } from 'url'
import crypto from 'crypto'

// Simple in-memory storage
const users = [
  {
    id: 'master-user-id',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'CHANGE_THIS_PASSWORD', // In real apps, this would be hashed
    name: process.env.ADMIN_NAME || 'Admin User',
    createdAt: new Date()
  }
]

const sessions = new Map() // Simple session storage

// Helper functions
function generateToken () {
  return crypto.randomBytes(32).toString('hex')
}

function parseBody (req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

function setCORSHeaders (res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

function sendJSON (res, statusCode, data) {
  setCORSHeaders(res)
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`)
  const path = parsedUrl.pathname
  const method = req.method

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    setCORSHeaders(res)
    res.writeHead(200)
    res.end()
    return
  }

  try {
    // Health check
    if (path === '/health' && method === 'GET') {
      sendJSON(res, 200, {
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Ultra simple auth server is running',
        masterCredentials: {
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          password: process.env.ADMIN_PASSWORD || 'CHANGE_THIS_PASSWORD'
        },
        endpoints: [
          'GET /health - Health check',
          'POST /auth/login - Login with { email, password }',
          'POST /auth/register - Register with { email, password, name }',
          'GET /auth/me - Get current user (requires Authorization: Bearer <token>)',
          'POST /auth/logout - Logout'
        ]
      })
      return
    }

    // Login
    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = await parseBody(req)

      const user = users.find(u => u.email === email && u.password === password)
      if (!user) {
        sendJSON(res, 401, { error: 'Invalid credentials' })
        return
      }

      const token = generateToken()
      sessions.set(token, { userId: user.id, email: user.email })

      sendJSON(res, 200, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        accessToken: token,
        refreshToken: token // Same for simplicity
      })
      return
    }

    // Register
    if (path === '/auth/register' && method === 'POST') {
      const { email, password, name } = await parseBody(req)

      if (!email || !password || !name) {
        sendJSON(res, 400, { error: 'Email, password, and name are required' })
        return
      }

      if (users.find(u => u.email === email)) {
        sendJSON(res, 409, { error: 'User already exists' })
        return
      }

      const user = {
        id: crypto.randomUUID(),
        email,
        password, // In real apps, hash this
        name,
        createdAt: new Date()
      }

      users.push(user)

      const token = generateToken()
      sessions.set(token, { userId: user.id, email: user.email })

      sendJSON(res, 200, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        accessToken: token,
        refreshToken: token
      })
      return
    }

    // Get current user
    if (path === '/auth/me' && method === 'GET') {
      const authHeader = req.headers.authorization
      const token = authHeader && authHeader.split(' ')[1]

      if (!token || !sessions.has(token)) {
        sendJSON(res, 401, { error: 'Invalid or missing token' })
        return
      }

      const session = sessions.get(token)
      const user = users.find(u => u.id === session.userId)

      if (!user) {
        sendJSON(res, 404, { error: 'User not found' })
        return
      }

      sendJSON(res, 200, {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      })
      return
    }

    // Logout
    if (path === '/auth/logout' && method === 'POST') {
      const { refreshToken } = await parseBody(req)
      if (refreshToken && sessions.has(refreshToken)) {
        sessions.delete(refreshToken)
      }
      sendJSON(res, 200, { success: true })
      return
    }

    // 404
    sendJSON(res, 404, { error: 'Route not found' })
  } catch (error) {
    console.error('Server error:', error)
    sendJSON(res, 500, { error: 'Internal server error' })
  }
})

const PORT = 4000
server.listen(PORT, () => {
  console.log(`🚀 Ultra Simple Auth Server running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  console.log('')
  console.log('🔑 MASTER LOGIN CREDENTIALS:')
  console.log('   Email: admin@test.com')
  console.log('   Password: admin123')
  console.log('')
  console.log('📝 Test with curl:')
  console.log(`   curl http://localhost:${PORT}/health`)
  console.log(`   curl -X POST http://localhost:${PORT}/auth/login \\`)
  console.log('     -H "Content-Type: application/json" \\')
  console.log('     -d \'{"email":"admin@test.com","password":"admin123"}\'')
  console.log('')
  console.log('✅ No dependencies required - uses only Node.js built-ins!')
})
