import { Request, Response, NextFunction } from 'express'
import { config } from '../config/index.js'
import helmet from 'helmet'
import crypto from 'crypto'

/**
 * Enhanced CSRF protection middleware for production security
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for:
  // - GET requests (safe methods)
  // - Preflight OPTIONS
  // - Health check endpoints
  // - Stripe webhooks (they have their own signature verification)
  if (req.method === 'GET' || 
      req.method === 'OPTIONS' || 
      req.path === '/health' ||
      req.path.startsWith('/api/stripe/webhook')) {
    return next()
  }

  const origin = req.headers.origin
  const referer = req.headers.referer

  // Allow CORS preflight
  if (req.method === 'OPTIONS') {
    return next()
  }

  // Check origin or referer matches allowed domains
  const allowedOrigins = [config.FRONTEND_URL]
  if (config.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000', 'http://localhost:8000')
  }

  const isValidOrigin = origin && allowedOrigins.includes(origin)
  const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed))

  if (!isValidOrigin && !isValidReferer) {
    console.warn(`🔒 CSRF: Invalid origin/referer - Origin: ${origin}, Referer: ${referer}`)
    return res.status(403).json({
      error: 'Invalid origin or referer',
      code: 'CSRF_INVALID_ORIGIN'
    })
  }

  // For enhanced security, check for CSRF token in headers for mutation operations
  const csrfToken = req.headers['x-csrf-token'] as string
  
  // For TRPC mutations and other POST/PUT/DELETE requests, require CSRF token
  // The token just needs to exist - we're using it as a simple CSRF mitigation
  // In production, you'd want to validate this against a server-generated token
  if ((req.path.startsWith('/trpc') || req.method !== 'GET') && !csrfToken) {
    // In development, be more lenient
    if (config.NODE_ENV === 'development') {
      console.warn('⚠️  CSRF token missing for:', req.method, req.path)
      // Allow request in development but log warning
      return next()
    }
    
    return res.status(403).json({
      error: 'CSRF token required',
      code: 'CSRF_TOKEN_MISSING',
      hint: 'Include x-csrf-token header with any non-empty value'
    })
  }

  next()
}

/**
 * Production-ready security headers configuration
 */
export const productionSecurityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // Required for some React builds
        "'unsafe-eval'", // Required for development
        'https://js.stripe.com',
        'https://checkout.stripe.com',
        'https://vercel.live'
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Required for Mantine and other CSS-in-JS libraries
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      imgSrc: [
        "'self'",
        'data:', 
        'blob:',
        'https://*.stripe.com',
        'https://oldschool.runescape.wiki',
        'https://secure.runescape.com',
        'https://vercel.com'
      ],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'https://checkout.stripe.com',
        'https://oldschool.runescape.wiki',
        'https://prices.runescape.wiki',
        'wss://ws-us3.pusher.com', // If using real-time features
        config.NODE_ENV === 'development' ? 'ws://localhost:*' : '',
        config.NODE_ENV === 'development' ? 'http://localhost:*' : ''
      ].filter(Boolean),
      frameSrc: [
        "'self'",
        'https://js.stripe.com',
        'https://hooks.stripe.com'
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"] // Prevents clickjacking
    }
  },
  
  // HTTP Strict Transport Security (HTTPS enforcement)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Prevent clickjacking
  frameguard: { action: 'deny' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Disable for Stripe compatibility
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Allow Stripe popups
  crossOriginResourcePolicy: { policy: 'cross-origin' }
})

/**
 * Development security headers (more permissive)
 */
export const developmentSecurityHeaders = helmet({
  contentSecurityPolicy: false, // Disable CSP in development for easier debugging
  hsts: false, // No HTTPS in development
  crossOriginEmbedderPolicy: false
})

/**
 * Security headers middleware that adapts to environment
 */
export const securityHeaders = config.NODE_ENV === 'production' 
  ? productionSecurityHeaders 
  : developmentSecurityHeaders

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
