import { TRPCError } from '@trpc/server'
import { t } from '../trpc/trpc.js'
import { Redis } from 'ioredis'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 3 * 60 * 1000 // 3 minutes in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 1000
const REDIS_KEY_PREFIX = 'trpc_rate_limit'

// RS Wiki API specific limits (more restrictive)
const RS_WIKI_RATE_LIMIT_MAX = 500 // Lower limit for external API calls
const RS_WIKI_WINDOW = 5 * 60 * 1000 // 5 minutes for RS Wiki

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

/**
 * Generate unique rate limiting key combining IP, user ID, and session
 */
function generateRateLimitKey(ctx: any, prefix: string): string {
  const ip = ctx.req.ip || ctx.req.connection.remoteAddress || 'unknown'
  const userId = ctx.user?.id || 'anonymous'
  const sessionId = ctx.req.sessionID || ctx.req.headers['x-session-id'] || 'no-session'
  
  return `${prefix}:${ip}:${userId}:${sessionId}`
}

/**
 * Get current rate limit status from Redis or memory
 */
async function getRateLimitInfo(
  key: string, 
  maxRequests: number, 
  windowMs: number
): Promise<RateLimitInfo> {
  const now = Date.now()
  const resetTime = now + windowMs
  
  try {
    const redis = initRedis()
    
    if (redis && redis.status === 'ready') {
      // Use Redis for distributed rate limiting
      const result = await redis.multi()
        .incr(key)
        .expire(key, Math.ceil(windowMs / 1000))
        .ttl(key)
        .exec()
      
      if (result && result[0] && result[2]) {
        const count = result[0][1] as number
        const ttl = result[2][1] as number
        const actualResetTime = ttl > 0 ? now + (ttl * 1000) : resetTime
        
        return {
          count,
          resetTime: actualResetTime,
          remaining: Math.max(0, maxRequests - count),
          exceeded: count > maxRequests
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
      remaining: maxRequests - 1,
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
    remaining: Math.max(0, maxRequests - existing.count),
    exceeded: existing.count > maxRequests
  }
}

/**
 * Send admin notification when rate limit is exceeded
 */
async function notifyAdminRateLimit(ctx: any, rateLimitInfo: RateLimitInfo, procedure: string) {
  try {
    const ip = ctx.req.ip || ctx.req.connection.remoteAddress || 'unknown'
    const userId = ctx.user?.id
    const userAgent = ctx.req.headers['user-agent']
    
    // Log to console for immediate visibility
    console.warn(`TRPC Rate limit exceeded:`, {
      ip,
      userId,
      userAgent,
      procedure,
      count: rateLimitInfo.count,
      timestamp: new Date().toISOString()
    })
    
    // TODO: Implement WebSocket notification to admin dashboard
    // TODO: Store in database for admin analytics
    // This will be implemented when we build the analytics dashboard
    
  } catch (error) {
    console.error('Failed to notify admin of rate limit:', error)
  }
}

/**
 * Standard rate limiting middleware for TRPC procedures
 */
export const rateLimitMiddleware = t.middleware(async ({ ctx, next, path }) => {
  try {
    // Skip rate limiting for admin users in development
    if (process.env.NODE_ENV === 'development' && ctx.user?.role === 'admin') {
      return next()
    }
    
    const key = generateRateLimitKey(ctx, REDIS_KEY_PREFIX)
    const rateLimitInfo = await getRateLimitInfo(key, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW)
    
    if (rateLimitInfo.exceeded) {
      // Notify admin of rate limit violation
      await notifyAdminRateLimit(ctx, rateLimitInfo, path || 'unknown')
      
      const resetInSeconds = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)
      const resetInMinutes = Math.ceil(resetInSeconds / 60)
      
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Too many requests. Please wait ${resetInMinutes} minute${resetInMinutes !== 1 ? 's' : ''} before making more requests.`,
        cause: {
          retryAfter: resetInSeconds,
          limit: RATE_LIMIT_MAX_REQUESTS,
          remaining: rateLimitInfo.remaining,
          reset: rateLimitInfo.resetTime
        }
      })
    }
    
    // Add rate limit info to response headers (if we need them for debugging)
    if (ctx.res) {
      ctx.res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS)
      ctx.res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining)
      ctx.res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000))
    }
    
    return next()
    
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }
    // If rate limiting fails, allow request but log error
    console.error('Rate limiting middleware error:', error)
    return next()
  }
})

/**
 * Stricter rate limiting for RS Wiki API endpoints
 */
export const rsWikiRateLimitMiddleware = t.middleware(async ({ ctx, next, path }) => {
  try {
    // Skip rate limiting for admin users in development
    if (process.env.NODE_ENV === 'development' && ctx.user?.role === 'admin') {
      return next()
    }
    
    const key = generateRateLimitKey(ctx, `${REDIS_KEY_PREFIX}:rswiki`)
    const rateLimitInfo = await getRateLimitInfo(key, RS_WIKI_RATE_LIMIT_MAX, RS_WIKI_WINDOW)
    
    if (rateLimitInfo.exceeded) {
      // Notify admin of rate limit violation
      await notifyAdminRateLimit(ctx, rateLimitInfo, `RS_WIKI:${path || 'unknown'}`)
      
      const resetInSeconds = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)
      const resetInMinutes = Math.ceil(resetInSeconds / 60)
      
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Too many API requests. Please wait ${resetInMinutes} minute${resetInMinutes !== 1 ? 's' : ''} before making more requests to avoid overloading the RS Wiki API.`,
        cause: {
          retryAfter: resetInSeconds,
          limit: RS_WIKI_RATE_LIMIT_MAX,
          remaining: rateLimitInfo.remaining,
          reset: rateLimitInfo.resetTime
        }
      })
    }
    
    return next()
    
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }
    // If rate limiting fails, allow request but log error
    console.error('RS Wiki rate limiting middleware error:', error)
    return next()
  }
})

/**
 * Create rate limited procedures
 */
export const rateLimitedProcedure = t.procedure.use(rateLimitMiddleware)
export const rateLimitedPublicProcedure = t.procedure.use(rateLimitMiddleware)
export const rateLimitedProtectedProcedure = t.procedure.use(rateLimitMiddleware).use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No authorization token provided or token is invalid'
      })
    }
    return next({ ctx })
  })
)

/**
 * RS Wiki specific rate limited procedures
 */
export const rsWikiLimitedProcedure = t.procedure.use(rsWikiRateLimitMiddleware)

/**
 * Rate limited procedure with subscription check for RS Wiki endpoints
 */
export const rsWikiLimitedSubscribedProcedure = t.procedure
  .use(rsWikiRateLimitMiddleware)
  .use(async ({ ctx, next }) => {
    // Check authentication
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'No authorization token provided or token is invalid'
      })
    }

    // Import subscription check (avoiding circular imports)
    const { db, userSettings, subscriptions } = await import('../db/index.js')
    const { eq } = await import('drizzle-orm')
    
    // Check if user is admin or moderator (bypass subscription)
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, ctx.user.id)).limit(1)
    const role = settings?.role || 'user'
    if (role === 'admin' || role === 'moderator') {
      return next({ ctx })
    }

    // Check subscription status
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.user.id)
    })

    const isActive = subscription?.status === 'active'
    const isTrialValid = subscription?.status === 'trialing' && 
                         subscription?.isTrialing && 
                         subscription?.trialEnd && 
                         new Date(subscription.trialEnd) > new Date()

    if (!isActive && !isTrialValid) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Active subscription or trial required.'
      })
    }

    return next({ ctx })
  })

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

/**
 * Get rate limit status for debugging/admin purposes
 */
export async function getRateLimitStatus(ctx: any): Promise<{
  standard: RateLimitInfo
  rsWiki: RateLimitInfo
}> {
  const standardKey = generateRateLimitKey(ctx, REDIS_KEY_PREFIX)
  const rsWikiKey = generateRateLimitKey(ctx, `${REDIS_KEY_PREFIX}:rswiki`)
  
  const [standard, rsWiki] = await Promise.all([
    getRateLimitInfo(standardKey, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW),
    getRateLimitInfo(rsWikiKey, RS_WIKI_RATE_LIMIT_MAX, RS_WIKI_WINDOW)
  ])
  
  return { standard, rsWiki }
}