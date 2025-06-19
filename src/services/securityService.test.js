import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import securityService from './securityService'

describe('SecurityService', () => {
  beforeEach(() => {
    // Clear any existing state
    securityService.rateLimits.clear()
    securityService.blockedIPs.clear()
    securityService.failedAttempts.clear()
    securityService.sessionTokens.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const result = securityService.checkRateLimit('user123', 'api')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(59)
    })

    it('should block requests exceeding rate limit', () => {
      const userId = 'user123'
      const endpoint = 'api'

      // Make 60 requests to hit the limit
      for (let i = 0; i < 60; i++) {
        securityService.checkRateLimit(userId, endpoint)
      }

      // 61st request should be blocked
      const result = securityService.checkRateLimit(userId, endpoint)
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('Rate limit exceeded')
    })
  })

  describe('Input Validation', () => {
    describe('Email Validation', () => {
      it('should validate correct email addresses', () => {
        const result = securityService.validateInput('test@example.com', 'email')
        expect(result.valid).toBe(true)
        expect(result.sanitized).toBe('test@example.com')
      })

      it('should reject invalid email formats', () => {
        const result = securityService.validateInput('invalid-email', 'email')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid email format')
      })
    })

    describe('Password Validation', () => {
      it('should validate strong passwords', () => {
        const result = securityService.validateInput('StrongPass123!', 'password')
        expect(result.valid).toBe(true)
      })

      it('should reject weak passwords', () => {
        const result = securityService.validateInput('weak', 'password')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('must be at least 8 characters')
      })
    })

    describe('Text Sanitization', () => {
      it('should remove script tags', () => {
        const maliciousInput = '<script>alert("xss")</script>Hello'
        const result = securityService.validateInput(maliciousInput, 'text')
        expect(result.valid).toBe(true)
        expect(result.sanitized).toBe('Hello')
      })

      it('should detect SQL injection patterns', () => {
        const sqlInjection = "'; DROP TABLE users; --"
        const result = securityService.validateInput(sqlInjection, 'text')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid characters detected')
      })
    })
  })

  describe('Session Management', () => {
    it('should create valid sessions', () => {
      const token = securityService.createSession('user123', { name: 'Test User' })
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should validate existing sessions', () => {
      const token = securityService.createSession('user123', { name: 'Test User' })
      const validation = securityService.validateSession(token)
      expect(validation.valid).toBe(true)
      expect(validation.session.userId).toBe('user123')
    })
  })

  describe('Failed Attempt Tracking', () => {
    it('should track failed attempts', () => {
      const attempts = securityService.recordFailedAttempt('user@example.com')
      expect(attempts.count).toBe(1)
      expect(attempts.lastAttempt).toBeDefined()
    })

    it('should block users after max failed attempts', () => {
      const identifier = 'user@example.com'

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        securityService.recordFailedAttempt(identifier)
      }

      expect(securityService.isBlocked(identifier)).toBe(true)
    })
  })

  describe('File Upload Security', () => {
    it('should validate allowed file types', () => {
      const mockFile = {
        name: 'test.jpg',
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg'
      }

      const result = securityService.validateFileUpload(mockFile)
      expect(result.valid).toBe(true)
    })

    it('should reject files that are too large', () => {
      const mockFile = {
        name: 'large.jpg',
        size: 10 * 1024 * 1024, // 10MB
        type: 'image/jpeg'
      }

      const result = securityService.validateFileUpload(mockFile)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('File too large')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null input gracefully', () => {
      const result = securityService.validateInput(null, 'text')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Input is required')
    })

    it('should handle empty input gracefully', () => {
      const result = securityService.validateInput('', 'text')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Input is required')
    })
  })
})
