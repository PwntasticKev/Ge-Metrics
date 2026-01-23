import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../server/src/db/index.js'
import request from 'supertest'
import { app } from '../../server/src/index.js'

describe('SQL Injection Prevention', () => {
  let authToken: string
  let testUserId: number

  beforeEach(async () => {
    // Create test user and get auth token
    const testUser = {
      email: 'sqltest@example.com',
      username: 'sqltest',
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
    // Cleanup test user
    if (testUserId) {
      await db.delete('users').where('id', testUserId)
    }
  })

  describe('Authentication Endpoints', () => {
    it('should prevent SQL injection in login email field', async () => {
      const maliciousInputs = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin' OR 1=1 --",
        "'; INSERT INTO users (email) VALUES ('hacked@example.com'); --"
      ]

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/trpc/auth.login')
          .send({
            email: maliciousInput,
            password: 'anypassword'
          })

        // Should either return error or invalid credentials, not succeed
        expect(response.status).not.toBe(200)
        expect(response.body.error).toBeTruthy()
      }
    })

    it('should prevent SQL injection in registration fields', async () => {
      const maliciousInputs = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "test@example.com'; UPDATE users SET email='hacked@evil.com' WHERE id=1; --"
      ]

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/trpc/auth.register')
          .send({
            email: maliciousInput,
            username: 'testuser',
            password: 'TestPass123!'
          })

        // Should reject malicious input
        expect(response.status).not.toBe(200)
        expect(response.body.error).toBeTruthy()
      }
    })
  })

  describe('User Data Endpoints', () => {
    it('should prevent SQL injection in flip tracking', async () => {
      const maliciousInputs = [
        "'; DROP TABLE user_transactions; --",
        "' UNION SELECT password_hash FROM users --",
        "test'; UPDATE user_transactions SET profit=999999999 WHERE user_id=1; --"
      ]

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/trpc/flips.addFlip')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            itemId: maliciousInput,
            itemName: maliciousInput,
            quantity: 1,
            price: 1000,
            profit: 100
          })

        // Should reject malicious input
        expect(response.status).not.toBe(200)
        if (response.status === 200) {
          // If somehow it succeeds, check that no actual database damage occurred
          const userFlips = await request(app)
            .get('/trpc/flips.getFlips')
            .set('Authorization', `Bearer ${authToken}`)
          
          // Verify no suspicious data was inserted
          expect(userFlips.body.result.data).not.toContain('DROP TABLE')
          expect(userFlips.body.result.data).not.toContain('UNION SELECT')
        }
      }
    })

    it('should prevent SQL injection in search queries', async () => {
      const maliciousSearches = [
        "'; DROP TABLE item_mapping; --",
        "' UNION SELECT password_hash, salt FROM users --",
        "test' OR 1=1 --"
      ]

      for (const maliciousSearch of maliciousSearches) {
        const response = await request(app)
          .get('/trpc/items.getItemMapping')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ search: maliciousSearch })

        // Should handle malicious search safely
        if (response.status === 200) {
          // If search succeeds, verify results are legitimate
          const results = response.body.result.data
          expect(typeof results).toBe('object')
          // Should not contain any suspicious data
          const stringifiedResults = JSON.stringify(results)
          expect(stringifiedResults).not.toContain('password_hash')
          expect(stringifiedResults).not.toContain('salt')
        }
      }
    })
  })

  describe('OSRS API Endpoints', () => {
    it('should prevent SQL injection in item ID parameters', async () => {
      const maliciousIds = [
        "1; DROP TABLE item_price_history; --",
        "1' UNION SELECT * FROM users --",
        "1'; UPDATE items SET price=0; --"
      ]

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get('/trpc/items.getItemById')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ itemId: maliciousId })

        // Should reject non-numeric item IDs or handle safely
        if (response.status === 200) {
          // If somehow succeeds, verify no database damage
          const result = response.body.result.data
          expect(result).toBeDefined()
          // Result should be legitimate item data, not query results
          expect(result).not.toHaveProperty('password_hash')
          expect(result).not.toHaveProperty('salt')
        }
      }
    })
  })

  describe('Database Query Patterns', () => {
    it('should use parameterized queries for all user inputs', async () => {
      // Test that the application properly escapes/parameterizes queries
      // by attempting various SQL injection patterns that would succeed 
      // if queries were not properly parameterized

      const testCases = [
        {
          endpoint: '/trpc/auth.login',
          payload: { email: "test'; SELECT version(); --", password: 'test' },
          method: 'POST'
        },
        {
          endpoint: '/trpc/flips.addFlip', 
          payload: { 
            itemId: "1'; SELECT * FROM users; --",
            itemName: "Test Item",
            quantity: 1,
            price: 1000
          },
          method: 'POST',
          requiresAuth: true
        }
      ]

      for (const testCase of testCases) {
        let requestBuilder = request(app)[testCase.method.toLowerCase()](testCase.endpoint)
        
        if (testCase.requiresAuth) {
          requestBuilder = requestBuilder.set('Authorization', `Bearer ${authToken}`)
        }

        const response = await requestBuilder.send(testCase.payload)

        // The key test: malicious SQL should not execute
        // Either the request should fail with validation error,
        // or if it succeeds, it should not have executed the injected SQL
        
        if (response.status === 200) {
          // If request somehow succeeded, verify no sensitive data leaked
          const responseText = JSON.stringify(response.body)
          expect(responseText).not.toMatch(/version\(\)/)
          expect(responseText).not.toMatch(/pg_|postgres/)
          expect(responseText).not.toMatch(/password_hash|salt/)
        }
        
        // Most importantly: database should still be intact
        const healthCheck = await request(app).get('/health')
        expect(healthCheck.status).toBe(200)
      }
    })
  })

  describe('Error Message Security', () => {
    it('should not expose database schema in error messages', async () => {
      const response = await request(app)
        .post('/trpc/auth.login')
        .send({
          email: "nonexistent'; SELECT table_name FROM information_schema.tables; --",
          password: 'wrongpassword'
        })

      if (response.body.error) {
        const errorMessage = response.body.error.message || ''
        
        // Error message should not contain database schema information
        expect(errorMessage).not.toMatch(/table_name|information_schema/)
        expect(errorMessage).not.toMatch(/column|constraint|relation/)
        expect(errorMessage).not.toMatch(/postgres|pg_/)
        
        // Should not expose internal file paths
        expect(errorMessage).not.toMatch(/\/server\/src\//)
        expect(errorMessage).not.toMatch(/node_modules/)
      }
    })
  })
})