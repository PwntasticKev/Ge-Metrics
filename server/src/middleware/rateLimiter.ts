import { Request, Response, NextFunction } from 'express'
import { Redis } from 'ioredis'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 3 * 60 * 1000 // 3 minutes in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 1000
const REDIS_KEY_PREFIX = 'rate_limit'

// Redis client for rate limiting storage
let redis: Redis | null = null

// Initialize Redis connection
function initRedis() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      // Fallback to memory storage if Redis unavailable
      enableOfflineQueue: false
    })
  }
  return redis
}

// Fallback in-memory storage when Redis is unavailable
const memoryStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitInfo {
  count: number
  resetTime: number
  remaining: number
  exceeded: boolean
}

interface RateLimitKey {
  ip: string
  userId?: string
  sessionId?: string
}

/**
 * Generate unique rate limiting key combining IP, user ID, and session
 */
function generateRateLimitKey(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  const userId = (req as any).user?.id || 'anonymous'
  const sessionId = req.sessionID || req.headers['x-session-id'] || 'no-session'
  
  return `${REDIS_KEY_PREFIX}:${ip}:${userId}:${sessionId}`
}

/**
 * Get current rate limit status from Redis or memory
 */
async function getRateLimitInfo(key: string): Promise<RateLimitInfo> {
  const now = Date.now()
  const resetTime = now + RATE_LIMIT_WINDOW
  
  try {
    const redis = initRedis()
    
    if (redis && redis.status === 'ready') {
      // Use Redis for distributed rate limiting
      const result = await redis.multi()
        .incr(key)
        .expire(key, Math.ceil(RATE_LIMIT_WINDOW / 1000))
        .ttl(key)
        .exec()
      
      if (result && result[0] && result[2]) {
        const count = result[0][1] as number
        const ttl = result[2][1] as number
        const actualResetTime = ttl > 0 ? now + (ttl * 1000) : resetTime
        
        return {
          count,
          resetTime: actualResetTime,
          remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - count),
          exceeded: count > RATE_LIMIT_MAX_REQUESTS
        }
      }
    }
  } catch (error) {
    console.warn('Redis rate limiting failed, falling back to memory:', error)
  }
  
  // Fallback to in-memory storage
  const existing = memoryStore.get(key)
  
  if (!existing || now >= existing.resetTime) {
    // Reset window
    const newInfo = {
      count: 1,
      resetTime,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      exceeded: false
    }
    memoryStore.set(key, { count: 1, resetTime })
    return newInfo
  }
  
  // Increment existing count
  existing.count++
  memoryStore.set(key, existing)
  
  return {
    count: existing.count,
    resetTime: existing.resetTime,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - existing.count),
    exceeded: existing.count > RATE_LIMIT_MAX_REQUESTS
  }
}

/**
 * Send admin notification when rate limit is exceeded
 */
async function notifyAdminRateLimit(req: Request, rateLimitInfo: RateLimitInfo) {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    const userId = (req as any).user?.id
    const userAgent = req.headers['user-agent']
    const endpoint = req.originalUrl
    
    // Log to console for immediate visibility
    console.warn(`Rate limit exceeded:`, {
      ip,
      userId,
      userAgent,
      endpoint,
      count: rateLimitInfo.count,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      timestamp: new Date().toISOString()
    })
    
    // TODO: Implement WebSocket notification to admin dashboard
    // TODO: Store in database for admin analytics
    // For now, we'll implement basic logging
    
  } catch (error) {
    console.error('Failed to notify admin of rate limit:', error)
  }
}

/**
 * Rate limiting middleware for API endpoints
 * Tracks requests by combination of IP, user ID, and session
 * Limits to 1000 requests per 3 minutes
 */
export const createRateLimitMiddleware = (options: {
  skipIf?: (req: Request) => boolean
  message?: string
} = {}) => {
  const {
    skipIf,
    message = 'Too many requests. Please wait 2 minutes before making more requests.'
  } = options
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting for certain conditions
      if (skipIf && skipIf(req)) {
        return next()
      }
      
      // Skip for admin users in development
      if (process.env.NODE_ENV === 'development' && (req as any).user?.role === 'admin') {
        return next()
      }
      
      const key = generateRateLimitKey(req)
      const rateLimitInfo = await getRateLimitInfo(key)
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS)
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining)
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000))
      
      if (rateLimitInfo.exceeded) {
        // Notify admin of rate limit violation
        await notifyAdminRateLimit(req, rateLimitInfo)
        
        const resetInSeconds = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)
        const resetInMinutes = Math.ceil(resetInSeconds / 60)
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: message.replace('2 minutes', `${resetInMinutes} minute${resetInMinutes !== 1 ? 's' : ''}`),
          retryAfter: resetInSeconds,
          limit: RATE_LIMIT_MAX_REQUESTS,
          remaining: rateLimitInfo.remaining,
          reset: rateLimitInfo.resetTime
        })
      }
      
      next()
      
    } catch (error) {
      // If rate limiting fails, allow request but log error
      console.error('Rate limiting middleware error:', error)
      next()
    }
  }
}

/**
 * Rate limiter specifically for RS Wiki API endpoints
 * More restrictive limits for external API calls
 */
export const rsWikiRateLimit = createRateLimitMiddleware({
  message: 'Too many API requests. Please wait before making more requests to avoid overloading the RS Wiki API.'
})

/**
 * Standard rate limiter for general API endpoints
 */
export const standardRateLimit = createRateLimitMiddleware()

/**
 * Cleanup memory store periodically (for fallback storage)
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, info] of memoryStore.entries()) {
    if (now >= info.resetTime) {
      memoryStore.delete(key)
    }
  }
}, 60000) // Cleanup every minute