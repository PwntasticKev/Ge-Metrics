/**
 * Comprehensive Security Service
 * Handles rate limiting, input validation, authentication, and vulnerability prevention
 */

class SecurityService {
  constructor () {
    this.rateLimits = new Map()
    this.blockedIPs = new Set()
    this.failedAttempts = new Map()
    this.sessionTokens = new Map()

    // Security configuration
    this.config = {
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000,
      maxFailedAttempts: 5,
      blockDurationMs: 15 * 60 * 1000, // 15 minutes
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxInputLength: 10000,
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxFileSize: 5 * 1024 * 1024 // 5MB
    }

    // Start cleanup interval
    this.startCleanupInterval()
  }

  /**
   * Rate Limiting
   */
  checkRateLimit (userId, endpoint = 'general') {
    const key = `${userId}:${endpoint}`
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute window

    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs })
      return { allowed: true, remaining: this.config.maxRequestsPerMinute - 1 }
    }

    const limit = this.rateLimits.get(key)

    if (now > limit.resetTime) {
      // Reset window
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs })
      return { allowed: true, remaining: this.config.maxRequestsPerMinute - 1 }
    }

    if (limit.count >= this.config.maxRequestsPerMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: limit.resetTime,
        error: 'Rate limit exceeded. Please try again later.'
      }
    }

    limit.count++
    return { allowed: true, remaining: this.config.maxRequestsPerMinute - limit.count }
  }

  /**
   * Input Validation & Sanitization
   */
  validateInput (input, type = 'text') {
    if (!input) return { valid: false, error: 'Input is required' }

    // Length check
    if (input.length > this.config.maxInputLength) {
      return { valid: false, error: 'Input too long' }
    }

    switch (type) {
      case 'email':
        return this.validateEmail(input)
      case 'password':
        return this.validatePassword(input)
      case 'username':
        return this.validateUsername(input)
      case 'number':
        return this.validateNumber(input)
      case 'price':
        return this.validatePrice(input)
      default:
        return this.validateText(input)
    }
  }

  validateEmail (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const sanitized = email.trim().toLowerCase()

    if (!emailRegex.test(sanitized)) {
      return { valid: false, error: 'Invalid email format' }
    }

    if (sanitized.length > 254) {
      return { valid: false, error: 'Email too long' }
    }

    return { valid: true, sanitized }
  }

  validatePassword (password) {
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' }
    }

    if (password.length > 128) {
      return { valid: false, error: 'Password too long' }
    }

    // Check for common patterns
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!hasUpper || !hasLower || !hasNumber) {
      return {
        valid: false,
        error: 'Password must contain uppercase, lowercase, and numbers'
      }
    }

    return { valid: true }
  }

  validateUsername (username) {
    const sanitized = username.trim()
    const usernameRegex = /^[a-zA-Z0-9_-]+$/

    if (sanitized.length < 3 || sanitized.length > 20) {
      return { valid: false, error: 'Username must be 3-20 characters' }
    }

    if (!usernameRegex.test(sanitized)) {
      return { valid: false, error: 'Username can only contain letters, numbers, underscore, and dash' }
    }

    return { valid: true, sanitized }
  }

  validateNumber (input) {
    const number = parseFloat(input)
    if (isNaN(number)) {
      return { valid: false, error: 'Invalid number' }
    }

    if (!isFinite(number)) {
      return { valid: false, error: 'Number must be finite' }
    }

    return { valid: true, sanitized: number }
  }

  validatePrice (input) {
    const priceRegex = /^\d+(\.\d{1,2})?$/
    if (!priceRegex.test(input)) {
      return { valid: false, error: 'Invalid price format' }
    }

    const price = parseFloat(input)
    if (price < 0 || price > 999999999999) {
      return { valid: false, error: 'Price out of valid range' }
    }

    return { valid: true, sanitized: price }
  }

  validateText (input) {
    // Remove potential XSS
    const sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|#|\/\*|\*\/)/,
      /('|"|;|\|)/
    ]

    for (const pattern of sqlPatterns) {
      if (pattern.test(sanitized)) {
        return { valid: false, error: 'Invalid characters detected' }
      }
    }

    return { valid: true, sanitized }
  }

  /**
   * Authentication & Session Management
   */
  generateSessionToken () {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  createSession (userId, userData = {}) {
    const token = this.generateSessionToken()
    const session = {
      userId,
      userData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress: this.getCurrentIP(),
      userAgent: navigator.userAgent
    }

    this.sessionTokens.set(token, session)

    // Store in localStorage with expiry
    const sessionData = {
      token,
      expiresAt: Date.now() + this.config.sessionTimeout
    }
    localStorage.setItem('auth_session', JSON.stringify(sessionData))

    return token
  }

  validateSession (token) {
    if (!token) return { valid: false, error: 'No session token' }

    const session = this.sessionTokens.get(token)
    if (!session) return { valid: false, error: 'Invalid session' }

    const now = Date.now()
    if (now - session.createdAt > this.config.sessionTimeout) {
      this.sessionTokens.delete(token)
      return { valid: false, error: 'Session expired' }
    }

    // Update last activity
    session.lastActivity = now
    return { valid: true, session }
  }

  destroySession (token) {
    this.sessionTokens.delete(token)
    localStorage.removeItem('auth_session')
  }

  /**
   * Failed Attempt Tracking
   */
  recordFailedAttempt (identifier) {
    const key = identifier.toLowerCase()
    const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: 0 }

    attempts.count++
    attempts.lastAttempt = Date.now()

    this.failedAttempts.set(key, attempts)

    if (attempts.count >= this.config.maxFailedAttempts) {
      this.blockedIPs.add(key)
      setTimeout(() => {
        this.blockedIPs.delete(key)
        this.failedAttempts.delete(key)
      }, this.config.blockDurationMs)
    }

    return attempts
  }

  isBlocked (identifier) {
    return this.blockedIPs.has(identifier.toLowerCase())
  }

  clearFailedAttempts (identifier) {
    this.failedAttempts.delete(identifier.toLowerCase())
  }

  /**
   * File Upload Security
   */
  validateFileUpload (file) {
    if (!file) return { valid: false, error: 'No file provided' }

    // Size check
    if (file.size > this.config.maxFileSize) {
      return { valid: false, error: 'File too large' }
    }

    // Type check
    if (!this.config.allowedFileTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' }
    }

    // Name validation
    const nameRegex = /^[a-zA-Z0-9._-]+$/
    if (!nameRegex.test(file.name)) {
      return { valid: false, error: 'Invalid file name' }
    }

    return { valid: true }
  }

  /**
   * CSRF Protection
   */
  generateCSRFToken () {
    const token = this.generateSessionToken()
    sessionStorage.setItem('csrf_token', token)
    return token
  }

  validateCSRFToken (token) {
    const storedToken = sessionStorage.getItem('csrf_token')
    return token && storedToken && token === storedToken
  }

  /**
   * Utility Methods
   */
  getCurrentIP () {
    // In a real app, this would come from the server
    return 'client_ip'
  }

  hashPassword (password) {
    // In a real app, use proper password hashing like bcrypt
    // This is a simplified version for demo
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'salt')
    return crypto.subtle.digest('SHA-256', data)
  }

  /**
   * Cleanup expired entries
   */
  startCleanupInterval () {
    setInterval(() => {
      const now = Date.now()
      const oneHour = 60 * 60 * 1000

      // Clean up rate limits
      for (const [key, limit] of this.rateLimits.entries()) {
        if (now > limit.resetTime + oneHour) {
          this.rateLimits.delete(key)
        }
      }

      // Clean up expired sessions
      for (const [token, session] of this.sessionTokens.entries()) {
        if (now - session.createdAt > this.config.sessionTimeout) {
          this.sessionTokens.delete(token)
        }
      }

      // Clean up old failed attempts
      for (const [key, attempts] of this.failedAttempts.entries()) {
        if (now - attempts.lastAttempt > this.config.blockDurationMs) {
          this.failedAttempts.delete(key)
        }
      }
    }, 5 * 60 * 1000) // Run every 5 minutes
  }

  /**
   * Security Headers (for server-side implementation)
   */
  getSecurityHeaders () {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block'
    }
  }

  /**
   * Audit Logging
   */
  logSecurityEvent (event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    console.log('Security Event:', logEntry)

    // In production, send to logging service
    // this.sendToLoggingService(logEntry)
  }
}

// Export singleton instance
export default new SecurityService()
