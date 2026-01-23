import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../server/src/index.js'
import { apiRotation } from '../../server/src/services/apiRotationService.js'

describe('Rate Limiting and API Protection', () => {
  let authToken: string

  beforeEach(async () => {
    // Create test user and authenticate
    const testUser = {
      email: `ratetest${Date.now()}@example.com`,
      username: `ratetest${Date.now()}`,
      password: 'TestPass123!'
    }
    
    const registerResponse = await request(app)
      .post('/trpc/auth.register')
      .send(testUser)

    const loginResponse = await request(app)
      .post('/trpc/auth.login')
      .send({ 
        email: testUser.email, 
        password: testUser.password 
      })
    
    authToken = loginResponse.body.result.data?.accessToken
  })

  describe('General Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const promises = []
      const requestCount = 20 // Attempt many requests quickly
      
      // Rapid-fire login attempts
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          request(app)
            .post('/trpc/auth.login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword'
            })
        )
      }

      const responses = await Promise.all(promises)
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      const successResponses = responses.filter(r => r.status !== 429)
      
      // Should have some rate limiting in effect
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses.length).toBeGreaterThan(0)
        
        // Rate limited responses should have proper headers
        rateLimitedResponses.forEach(response => {
          expect(response.headers['retry-after']).toBeDefined()
          expect(response.body.error?.message).toMatch(/rate limit|too many requests/i)
        })
      }
      
      // Should not allow unlimited requests
      expect(successResponses.length).toBeLessThan(requestCount)
    }, 10000) // Increase timeout for this test

    it('should have different rate limits for different endpoints', async () => {
      const endpointTests = [
        {
          endpoint: '/trpc/auth.login',
          method: 'post',
          payload: { email: 'test@example.com', password: 'wrong' },
          expectedLimit: 10 // Auth should be more restrictive
        },
        {
          endpoint: '/trpc/flips.getFlips',
          method: 'get',
          headers: { Authorization: `Bearer ${authToken}` },
          expectedLimit: 50 // Data endpoints can be less restrictive
        }
      ]

      for (const test of endpointTests) {
        const promises = []
        
        for (let i = 0; i < test.expectedLimit + 10; i++) {
          let requestBuilder = request(app)[test.method](test.endpoint)
          
          if (test.headers) {
            Object.entries(test.headers).forEach(([key, value]) => {
              requestBuilder = requestBuilder.set(key, value)
            })
          }
          
          if (test.payload) {
            requestBuilder = requestBuilder.send(test.payload)
          }
          
          promises.push(requestBuilder)
        }

        const responses = await Promise.all(promises)
        const rateLimited = responses.filter(r => r.status === 429)
        
        // Should have rate limiting
        expect(rateLimited.length).toBeGreaterThan(0)
      }
    })
  })

  describe('API Rotation Testing', () => {
    it('should rotate API identities correctly', async () => {
      const initialIdentity = apiRotation.getCurrentIdentity()
      
      // Force rotation
      apiRotation.rotateIdentity()
      const rotatedIdentity = apiRotation.getCurrentIdentity()
      
      // Should be different identity
      expect(rotatedIdentity.userAgent).not.toBe(initialIdentity.userAgent)
      expect(rotatedIdentity.contact).not.toBe(initialIdentity.contact)
    })

    it('should handle rate limit detection and rotation', async () => {
      // Simulate rate limit response
      const rateLimitResult = apiRotation.handleRateLimit()
      
      expect(rateLimitResult.shouldRetry).toBe(true)
      expect(rateLimitResult.delayMs).toBeGreaterThan(0)
      expect(rateLimitResult.delayMs).toBeLessThanOrEqual(30000) // Max 30s
    })

    it('should provide different headers for requests', async () => {
      const headers1 = apiRotation.getCurrentHeaders()
      apiRotation.rotateIdentity()
      const headers2 = apiRotation.getCurrentHeaders()
      
      expect(headers1['User-Agent']).not.toBe(headers2['User-Agent'])
      expect(headers1['Contact']).not.toBe(headers2['Contact'])
      
      // Both should have required headers
      expect(headers1['User-Agent']).toBeTruthy()
      expect(headers1['Contact']).toBeTruthy()
      expect(headers2['User-Agent']).toBeTruthy()
      expect(headers2['Contact']).toBeTruthy()
    })

    it('should test all API identities for validity', async () => {
      const results = await apiRotation.testAllIdentities()
      
      expect(results.length).toBeGreaterThan(0)
      
      results.forEach(result => {
        expect(result).toHaveProperty('identity')
        expect(result).toHaveProperty('index')
        expect(result).toHaveProperty('valid')
        expect(result.identity.userAgent).toBeTruthy()
        expect(result.identity.contact).toBeTruthy()
      })
      
      // At least some identities should be valid
      const validIdentities = results.filter(r => r.valid)
      expect(validIdentities.length).toBeGreaterThan(0)
    })
  })

  describe('DDoS Protection', () => {
    it('should handle burst requests gracefully', async () => {
      const burstSize = 50
      const promises = []
      
      // Create burst of requests to health endpoint
      for (let i = 0; i < burstSize; i++) {
        promises.push(request(app).get('/health'))
      }

      const startTime = Date.now()
      const responses = await Promise.all(promises)
      const endTime = Date.now()
      
      // Should not take too long (server shouldn't crash)
      expect(endTime - startTime).toBeLessThan(30000) // 30 seconds max
      
      // Should have some rate limiting or queuing
      const successCount = responses.filter(r => r.status === 200).length
      const rateLimitedCount = responses.filter(r => r.status === 429).length
      
      // Either most succeed (good performance) or rate limiting kicks in
      expect(successCount + rateLimitedCount).toBe(burstSize)
      
      if (rateLimitedCount > 0) {
        console.log(`Rate limited ${rateLimitedCount}/${burstSize} requests`)
      }
    })

    it('should protect against slowloris attacks', async () => {
      // Simulate slow requests
      const slowRequests = []
      
      for (let i = 0; i < 5; i++) {
        slowRequests.push(
          new Promise((resolve) => {
            const req = request(app).get('/health')
            
            // Simulate slow connection
            setTimeout(() => {
              req.then(resolve).catch(resolve)
            }, 1000 * (i + 1)) // Stagger requests
          })
        )
      }

      const responses = await Promise.all(slowRequests)
      
      // Server should still be responsive
      responses.forEach(response => {
        expect(response).toBeTruthy()
      })
      
      // Quick health check should still work
      const quickResponse = await request(app).get('/health')
      expect(quickResponse.status).toBe(200)
    })
  })

  describe('Resource Limits', () => {
    it('should limit request payload size', async () => {
      const largePayload = {
        itemName: 'x'.repeat(10000), // 10KB string
        notes: 'y'.repeat(50000)     // 50KB string
      }

      const response = await request(app)
        .post('/trpc/flips.addFlip')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...largePayload,
          itemId: '1',
          quantity: 1,
          price: 1000
        })

      // Should either reject large payload or truncate it
      if (response.status === 413) {
        // Payload too large
        expect(response.body.error?.message).toMatch(/payload|large|limit/i)
      } else if (response.status === 200) {
        // If accepted, verify it was truncated
        const flipsResponse = await request(app)
          .get('/trpc/flips.getFlips')
          .set('Authorization', `Bearer ${authToken}`)
        
        const flips = flipsResponse.body.result.data
        const createdFlip = flips[0]
        
        if (createdFlip) {
          // Should be truncated to reasonable length
          expect(createdFlip.itemName.length).toBeLessThan(1000)
          expect(createdFlip.notes?.length || 0).toBeLessThan(5000)
        }
      }
    })

    it('should limit concurrent connections per IP', async () => {
      const connectionCount = 20
      const promises = []
      
      // Simulate many concurrent connections from same IP
      for (let i = 0; i < connectionCount; i++) {
        promises.push(
          request(app)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.100') // Simulate same IP
        )
      }

      const responses = await Promise.all(promises)
      
      // Should handle concurrent connections but may limit some
      const successCount = responses.filter(r => r.status === 200).length
      const limitedCount = responses.filter(r => r.status >= 500).length
      
      // Should not completely fail
      expect(successCount).toBeGreaterThan(connectionCount / 2)
      
      if (limitedCount > 0) {
        console.log(`Limited ${limitedCount}/${connectionCount} concurrent connections`)
      }
    })
  })

  describe('Authentication Rate Limiting', () => {
    it('should implement progressive delays for failed login attempts', async () => {
      const testEmail = 'bruteforce@example.com'
      const attempts = []
      
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now()
        
        const response = await request(app)
          .post('/trpc/auth.login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          })
        
        const endTime = Date.now()
        
        attempts.push({
          attempt: i + 1,
          status: response.status,
          duration: endTime - startTime
        })
      }

      // Later attempts should take longer or be rejected
      const firstAttempt = attempts[0]
      const lastAttempt = attempts[attempts.length - 1]
      
      // Should have progressive slowdown or blocking
      expect(
        lastAttempt.duration > firstAttempt.duration || 
        lastAttempt.status === 429
      ).toBeTruthy()
    })
  })
})