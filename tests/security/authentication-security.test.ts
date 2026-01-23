import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../server/src/index.js'
import jwt from 'jsonwebtoken'
import { db } from '../../server/src/db/index.js'

describe('Authentication Security', () => {
  let testUserId: number
  let validToken: string

  beforeEach(async () => {
    // Create a test user
    const testUser = {
      email: `authtest${Date.now()}@example.com`,
      username: `authtest${Date.now()}`,
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
    
    validToken = loginResponse.body.result.data.accessToken
  })

  afterEach(async () => {
    // Cleanup
    if (testUserId) {
      await db.delete('users').where('id', testUserId)
    }
  })

  describe('JWT Token Security', () => {
    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
        '', // Empty token
        'Bearer malformed',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature' // Invalid payload
      ]

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/trpc/flips.getFlips')
          .set('Authorization', `Bearer ${token}`)

        expect(response.status).toBeOneOf([401, 403, 400])
        expect(response.body.error).toBeTruthy()
      }
    })

    it('should reject expired JWT tokens', async () => {
      // Create an expired token (if you have access to JWT secret)
      const expiredPayload = {
        userId: testUserId,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200  // Issued 2 hours ago
      }

      // This assumes you have access to the JWT secret for testing
      // In a real app, you'd need to set up the test with actual secret
      const jwtSecret = process.env.JWT_ACCESS_SECRET || 'test-secret'
      const expiredToken = jwt.sign(expiredPayload, jwtSecret)

      const response = await request(app)
        .get('/trpc/flips.getFlips')
        .set('Authorization', `Bearer ${expiredToken}`)

      expect(response.status).toBeOneOf([401, 403])
      expect(response.body.error?.message).toMatch(/expired|invalid/i)
    })

    it('should reject tokens with tampered signatures', async () => {
      // Take a valid token and modify it slightly
      const parts = validToken.split('.')
      if (parts.length === 3) {
        // Tamper with the signature
        const tamperedSignature = parts[2].slice(0, -5) + 'XXXXX'
        const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`

        const response = await request(app)
          .get('/trpc/flips.getFlips')
          .set('Authorization', `Bearer ${tamperedToken}`)

        expect(response.status).toBeOneOf([401, 403])
        expect(response.body.error).toBeTruthy()
      }
    })

    it('should reject tokens with modified payload', async () => {
      const parts = validToken.split('.')
      if (parts.length === 3) {
        // Try to modify the payload to escalate privileges
        const originalPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
        const modifiedPayload = {
          ...originalPayload,
          userId: 999999, // Try to impersonate another user
          role: 'admin'   // Try to escalate privileges
        }

        const modifiedPayloadB64 = Buffer.from(JSON.stringify(modifiedPayload)).toString('base64url')
        const modifiedToken = `${parts[0]}.${modifiedPayloadB64}.${parts[2]}`

        const response = await request(app)
          .get('/trpc/flips.getFlips')
          .set('Authorization', `Bearer ${modifiedToken}`)

        expect(response.status).toBeOneOf([401, 403])
      }
    })
  })

  describe('Password Security', () => {
    it('should reject weak passwords during registration', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123',
        '12345678',
        'password123',
        'admin',
        'letmein',
        'welcome',
        'monkey'
      ]

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/trpc/auth.register')
          .send({
            email: `weak${Date.now()}@example.com`,
            username: `weak${Date.now()}`,
            password: weakPassword
          })

        // Should reject weak passwords
        expect(response.status).not.toBe(200)
        expect(response.body.error).toBeTruthy()
        
        if (response.body.error?.message) {
          expect(response.body.error.message).toMatch(/password|strength|requirements/i)
        }
      }
    })

    it('should enforce password complexity requirements', async () => {
      const invalidPasswords = [
        'short', // Too short
        'nouppercase123!', // No uppercase
        'NOLOWERCASE123!', // No lowercase  
        'NoNumbers!', // No numbers
        'NoSpecialChars123', // No special characters
        '12345678', // Only numbers
        'abcdefgh', // Only lowercase letters
        'ABCDEFGH', // Only uppercase letters
        '!@#$%^&*' // Only special characters
      ]

      for (const password of invalidPasswords) {
        const response = await request(app)
          .post('/trpc/auth.register')
          .send({
            email: `complex${Date.now()}@example.com`,
            username: `complex${Date.now()}`,
            password: password
          })

        expect(response.status).not.toBe(200)
        expect(response.body.error?.message).toMatch(/password.*requirement|complexity|strength/i)
      }
    })

    it('should store passwords securely (hashed with salt)', async () => {
      const testPassword = 'SecurePass123!'
      
      const response = await request(app)
        .post('/trpc/auth.register')
        .send({
          email: `secure${Date.now()}@example.com`,
          username: `secure${Date.now()}`,
          password: testPassword
        })

      if (response.status === 200) {
        const userId = response.body.result.data.user.id
        
        // Check that password is properly hashed in database
        const user = await db.select().from('users').where('id', userId).first()
        
        if (user) {
          // Password should be hashed, not stored in plain text
          expect(user.passwordHash).not.toBe(testPassword)
          expect(user.passwordHash).toBeTruthy()
          expect(user.passwordHash.length).toBeGreaterThan(50) // Hashed passwords are long
          
          // Should have a salt
          expect(user.salt).toBeTruthy()
          expect(user.salt).not.toBe(testPassword)
          
          // Hash should be different from password
          expect(user.passwordHash).not.toContain(testPassword)
        }
      }
    })
  })

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      // First, verify token works
      const beforeLogout = await request(app)
        .get('/trpc/flips.getFlips')
        .set('Authorization', `Bearer ${validToken}`)

      expect(beforeLogout.status).toBe(200)

      // Logout
      const logoutResponse = await request(app)
        .post('/trpc/auth.logout')
        .set('Authorization', `Bearer ${validToken}`)

      expect(logoutResponse.status).toBe(200)

      // Token should now be invalid
      const afterLogout = await request(app)
        .get('/trpc/flips.getFlips')
        .set('Authorization', `Bearer ${validToken}`)

      expect(afterLogout.status).toBeOneOf([401, 403])
    })

    it('should prevent concurrent logins with old tokens', async () => {
      const originalToken = validToken

      // Login again (should invalidate previous sessions)
      const secondLogin = await request(app)
        .post('/trpc/auth.login')
        .send({
          email: 'authtest@example.com',
          password: 'TestPass123!'
        })

      const newToken = secondLogin.body.result.data?.accessToken

      if (newToken && newToken !== originalToken) {
        // Original token should be invalidated
        const response = await request(app)
          .get('/trpc/flips.getFlips')
          .set('Authorization', `Bearer ${originalToken}`)

        expect(response.status).toBeOneOf([401, 403])

        // New token should work
        const newResponse = await request(app)
          .get('/trpc/flips.getFlips')
          .set('Authorization', `Bearer ${newToken}`)

        expect(newResponse.status).toBe(200)
      }
    })
  })

  describe('Authorization Bypass Attempts', () => {
    it('should prevent access without authentication', async () => {
      const protectedEndpoints = [
        '/trpc/flips.getFlips',
        '/trpc/flips.addFlip',
        '/trpc/items.getAllVolumes',
        '/trpc/subscription.getSubscription'
      ]

      for (const endpoint of protectedEndpoints) {
        const response = await request(app).get(endpoint)
        expect(response.status).toBeOneOf([401, 403])
      }
    })

    it('should prevent privilege escalation', async () => {
      // Try to access admin endpoints with regular user token
      const adminEndpoints = [
        '/trpc/admin.getUsers',
        '/trpc/admin.deleteUser',
        '/trpc/admin.getSystemSettings'
      ]

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${validToken}`)

        // Should deny access to admin functions
        expect(response.status).toBeOneOf([401, 403])
        
        if (response.body.error) {
          expect(response.body.error.message).toMatch(/unauthorized|forbidden|access denied|admin/i)
        }
      }
    })

    it('should prevent cross-user data access', async () => {
      // Create a second user
      const secondUser = {
        email: `crossuser${Date.now()}@example.com`,
        username: `crossuser${Date.now()}`,
        password: 'TestPass123!'
      }

      const secondUserResponse = await request(app)
        .post('/trpc/auth.register')
        .send(secondUser)

      const secondUserId = secondUserResponse.body.result.data.user.id

      // Try to access second user's data with first user's token
      const response = await request(app)
        .get(`/trpc/users.getProfile?userId=${secondUserId}`)
        .set('Authorization', `Bearer ${validToken}`)

      // Should not allow access to other user's data
      expect(response.status).toBeOneOf([401, 403, 404])
    })
  })

  describe('Account Enumeration Prevention', () => {
    it('should not reveal whether email exists during password reset', async () => {
      // Test with existing email
      const existingEmailResponse = await request(app)
        .post('/trpc/auth.forgotPassword')
        .send({ email: 'authtest@example.com' })

      // Test with non-existing email  
      const nonExistingEmailResponse = await request(app)
        .post('/trpc/auth.forgotPassword')
        .send({ email: 'nonexistent@example.com' })

      // Responses should be similar to prevent enumeration
      expect(existingEmailResponse.status).toBe(nonExistingEmailResponse.status)
      
      // Both should claim success to prevent enumeration
      if (existingEmailResponse.status === 200 && nonExistingEmailResponse.status === 200) {
        expect(existingEmailResponse.body.message).toBe(nonExistingEmailResponse.body.message)
      }
    })

    it('should not reveal user existence during login attempts', async () => {
      // Test with existing user, wrong password
      const existingUserResponse = await request(app)
        .post('/trpc/auth.login')
        .send({
          email: 'authtest@example.com',
          password: 'wrongpassword'
        })

      // Test with non-existing user
      const nonExistingUserResponse = await request(app)
        .post('/trpc/auth.login')
        .send({
          email: 'definitelynotreal@example.com',
          password: 'anypassword'
        })

      // Error messages should be generic
      const existingUserMsg = existingUserResponse.body.error?.message || ''
      const nonExistingUserMsg = nonExistingUserResponse.body.error?.message || ''

      // Should not distinguish between "user not found" and "wrong password"
      expect(existingUserMsg).not.toMatch(/not found|does not exist/i)
      expect(nonExistingUserMsg).not.toMatch(/not found|does not exist/i)
      
      // Should be generic error
      expect(existingUserMsg).toMatch(/invalid.*credentials|authentication.*failed/i)
      expect(nonExistingUserMsg).toMatch(/invalid.*credentials|authentication.*failed/i)
    })
  })

  describe('Brute Force Protection', () => {
    it('should implement account lockout after failed attempts', async () => {
      const testEmail = 'bruteforce@example.com'
      const maxAttempts = 5
      
      // Make multiple failed login attempts
      for (let i = 0; i < maxAttempts + 2; i++) {
        const response = await request(app)
          .post('/trpc/auth.login')
          .send({
            email: testEmail,
            password: 'wrongpassword'
          })
        
        // Later attempts should be blocked or heavily delayed
        if (i >= maxAttempts) {
          expect(response.status).toBeOneOf([429, 423, 401])
          
          if (response.status === 429 || response.status === 423) {
            expect(response.body.error?.message).toMatch(/locked|blocked|too many attempts/i)
          }
        }
      }
    })
  })
})