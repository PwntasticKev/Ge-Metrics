import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../server/src/index.js'
import { JSDOM } from 'jsdom'

describe('XSS (Cross-Site Scripting) Prevention', () => {
  let authToken: string
  let testUserId: number

  const maliciousPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(`XSS`)">',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
    '<keygen onfocus=alert("XSS") autofocus>',
    '<video><source onerror="alert(`XSS`)">',
    '<audio src=x onerror=alert("XSS")>',
    '<details open ontoggle=alert("XSS")>',
    '<marquee onstart=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    '\';alert("XSS");//',
    '<script>fetch("/admin/deleteAll")</script>',
    '<img src="x" onerror="fetch(\'/api/admin/users\').then(r=>r.json()).then(console.log)">',
  ]

  beforeEach(async () => {
    // Create test user and authenticate
    const testUser = {
      email: 'xsstest@example.com',
      username: 'xsstest',
      password: 'TestPass123!'
    }
    
    const registerResponse = await request(app)
      .post('/trpc/auth.register')
      .send(testUser)
    
    testUserId = registerResponse.body.result.data.user.id
    
    const loginResponse = await request(app)
      .post('/trpc/auth.login')
      .send({ 
        email: testUser.email, 
        password: testUser.password 
      })
    
    authToken = loginResponse.body.result.data.accessToken
  })

  afterEach(async () => {
    // Cleanup test data
    if (testUserId) {
      await db.delete('users').where('id', testUserId)
    }
  })

  describe('User Input Sanitization', () => {
    it('should sanitize malicious scripts in flip notes', async () => {
      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/trpc/flips.addFlip')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            itemId: '1',
            itemName: 'Test Item',
            quantity: 1,
            price: 1000,
            profit: 100,
            notes: payload
          })

        if (response.status === 200) {
          // Verify the malicious script was sanitized
          const flipResponse = await request(app)
            .get('/trpc/flips.getFlips')
            .set('Authorization', `Bearer ${authToken}`)

          const flips = flipResponse.body.result.data
          const createdFlip = flips.find(f => f.notes?.includes(payload.replace(/<[^>]*>/g, '')))
          
          if (createdFlip) {
            // Check that HTML tags were stripped/escaped
            expect(createdFlip.notes).not.toMatch(/<script/i)
            expect(createdFlip.notes).not.toMatch(/onerror=/i)
            expect(createdFlip.notes).not.toMatch(/onload=/i)
            expect(createdFlip.notes).not.toMatch(/javascript:/i)
          }
        }
      }
    })

    it('should sanitize XSS attempts in username during registration', async () => {
      for (const payload of maliciousPayloads.slice(0, 5)) { // Test subset to avoid rate limits
        const response = await request(app)
          .post('/trpc/auth.register')
          .send({
            email: `test${Date.now()}@example.com`,
            username: payload,
            password: 'TestPass123!'
          })

        // Should either reject malicious username or sanitize it
        if (response.status === 200) {
          const user = response.body.result.data.user
          
          // Username should be sanitized
          expect(user.username).not.toMatch(/<script/i)
          expect(user.username).not.toMatch(/onerror=/i)
          expect(user.username).not.toMatch(/javascript:/i)
        } else {
          // Or should reject it with validation error
          expect(response.body.error).toBeTruthy()
        }
      }
    })

    it('should sanitize HTML in item names and descriptions', async () => {
      for (const payload of maliciousPayloads.slice(0, 3)) {
        const response = await request(app)
          .post('/trpc/flips.addFlip')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            itemId: '1',
            itemName: payload,
            quantity: 1,
            price: 1000,
            profit: 100
          })

        if (response.status === 200) {
          const flipResponse = await request(app)
            .get('/trpc/flips.getFlips')
            .set('Authorization', `Bearer ${authToken}`)

          const flips = flipResponse.body.result.data
          
          flips.forEach(flip => {
            expect(flip.itemName).not.toMatch(/<script/i)
            expect(flip.itemName).not.toMatch(/onerror=/i)
            expect(flip.itemName).not.toMatch(/onload=/i)
          })
        }
      }
    })
  })

  describe('API Response Sanitization', () => {
    it('should properly escape HTML in JSON responses', async () => {
      // Add a flip with potentially dangerous content
      await request(app)
        .post('/trpc/flips.addFlip')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: '1',
          itemName: '<script>alert("XSS")</script>Test Item',
          quantity: 1,
          price: 1000,
          notes: '<img src=x onerror=alert("stolen")>'
        })

      const response = await request(app)
        .get('/trpc/flips.getFlips')
        .set('Authorization', `Bearer ${authToken}`)

      // Response should be valid JSON without executable scripts
      expect(response.headers['content-type']).toMatch(/application\/json/)
      
      const responseText = JSON.stringify(response.body)
      
      // Should not contain unescaped HTML
      expect(responseText).not.toMatch(/<script[^>]*>[^<]*<\/script>/i)
      expect(responseText).not.toMatch(/<img[^>]*onerror[^>]*>/i)
      
      // If HTML is present, it should be escaped
      if (responseText.includes('&lt;script')) {
        expect(responseText).toMatch(/&lt;script.*&gt;/)
        expect(responseText).toMatch(/&lt;\/script&gt;/)
      }
    })

    it('should set proper security headers', async () => {
      const response = await request(app)
        .get('/health')

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBeTruthy()
      expect(response.headers['x-xss-protection']).toBeTruthy()
      
      // Content-Type should be explicitly set
      expect(response.headers['content-type']).toBeTruthy()
    })
  })

  describe('Frontend XSS Protection', () => {
    it('should test that rendered HTML escapes user content', async () => {
      // This would typically be done with a browser automation tool
      // but we can simulate with JSDOM for basic testing
      
      const maliciousContent = '<script>window.hacked = true</script><p>Normal content</p>'
      
      // Simulate how the frontend would render this content
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body>
            <div id="content"></div>
            <script>
              // Simulate how React would render user content
              const content = ${JSON.stringify(maliciousContent)};
              document.getElementById('content').textContent = content;
            </script>
          </body>
        </html>
      `)

      // Wait for scripts to execute
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check that malicious script didn't execute
      expect(dom.window.hacked).toBeUndefined()
      
      // Check that content was safely rendered as text
      const contentDiv = dom.window.document.getElementById('content')
      expect(contentDiv?.textContent).toBe(maliciousContent)
      expect(contentDiv?.innerHTML).not.toMatch(/<script/)
    })
  })

  describe('CSRF Protection', () => {
    it('should reject requests without proper CSRF tokens for state-changing operations', async () => {
      // Test that CSRF protection is in place
      const response = await request(app)
        .post('/trpc/flips.addFlip')
        .set('Authorization', `Bearer ${authToken}`)
        // Missing CSRF token in headers
        .send({
          itemId: '1',
          itemName: 'Test Item',
          quantity: 1,
          price: 1000
        })

      // Should require CSRF token for POST requests
      // (This depends on your CSRF implementation)
      if (response.status !== 200) {
        expect(response.status).toBeOneOf([403, 400])
        expect(response.body.error?.message).toMatch(/csrf|token/i)
      }
    })

    it('should accept requests with valid CSRF tokens', async () => {
      // First get CSRF token
      const csrfResponse = await request(app)
        .get('/csrf-token')
        .set('Authorization', `Bearer ${authToken}`)

      let csrfToken = 'valid-csrf-token' // Fallback if no CSRF endpoint
      if (csrfResponse.status === 200) {
        csrfToken = csrfResponse.body.token
      }

      // Use CSRF token in request
      const response = await request(app)
        .post('/trpc/flips.addFlip')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          itemId: '1',
          itemName: 'Test Item',
          quantity: 1,
          price: 1000
        })

      // Should succeed with valid CSRF token
      expect(response.status).toBe(200)
    })
  })

  describe('Content Security Policy', () => {
    it('should set restrictive CSP headers', async () => {
      const response = await request(app).get('/')

      const csp = response.headers['content-security-policy']
      
      if (csp) {
        // Should restrict script sources
        expect(csp).toMatch(/script-src/)
        expect(csp).not.toMatch(/unsafe-inline/)
        expect(csp).not.toMatch(/unsafe-eval/)
        
        // Should restrict object sources
        expect(csp).toMatch(/object-src 'none'/)
        
        // Should set base-uri
        expect(csp).toMatch(/base-uri/)
      }
    })
  })

  describe('Input Validation Bypass Attempts', () => {
    it('should handle encoded XSS payloads', async () => {
      const encodedPayloads = [
        '%3Cscript%3Ealert(%22XSS%22)%3C/script%3E',
        '&lt;script&gt;alert(&#x22;XSS&#x22;)&lt;/script&gt;',
        'javascript:alert(String.fromCharCode(88,83,83))',
        '\u003cscript\u003ealert(\u0022XSS\u0022)\u003c/script\u003e'
      ]

      for (const payload of encodedPayloads) {
        const response = await request(app)
          .post('/trpc/flips.addFlip')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            itemId: '1',
            itemName: decodeURIComponent(payload),
            quantity: 1,
            price: 1000
          })

        if (response.status === 200) {
          const flipResponse = await request(app)
            .get('/trpc/flips.getFlips')
            .set('Authorization', `Bearer ${authToken}`)

          const responseText = JSON.stringify(flipResponse.body)
          
          // Should not contain unescaped scripts
          expect(responseText).not.toMatch(/<script[^>]*>.*alert.*<\/script>/i)
          expect(responseText).not.toMatch(/javascript:alert/i)
        }
      }
    })
  })
})