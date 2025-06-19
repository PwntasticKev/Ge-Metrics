import { Request, Response, NextFunction } from 'express'
import { config } from '../config/index.js'

// CSRF protection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests and preflight OPTIONS
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next()
  }

  // Check for CSRF token in headers
  const csrfToken = req.headers['x-csrf-token'] as string
  const origin = req.headers.origin

  // Verify origin matches frontend URL
  if (origin !== config.FRONTEND_URL) {
    return res.status(403).json({
      error: 'Invalid origin'
    })
  }

  // For now, we'll use a simple CSRF token check
  // In production, you might want to use a more sophisticated CSRF library
  if (!csrfToken) {
    return res.status(403).json({
      error: 'CSRF token required'
    })
  }

  next()
}

// Rate limiting helper (basic implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'
    const now = Date.now()

    const clientData = requestCounts.get(clientIP)

    if (!clientData || now > clientData.resetTime) {
      // Reset window
      requestCounts.set(clientIP, {
        count: 1,
        resetTime: now + windowMs
      })
      return next()
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      })
    }

    clientData.count++
    next()
  }
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip)
    }
  }
}, 60000) // Clean up every minute
