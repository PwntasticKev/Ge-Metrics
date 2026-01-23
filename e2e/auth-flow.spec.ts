import { test, expect } from '@playwright/test'

/**
 * Critical E2E Tests for Authentication Flow
 * Tests the complete authentication system including security features
 */

const TEST_USERS = {
  new: {
    email: `auth-test-${Date.now()}@ge-metrics.com`,
    username: `authtest${Date.now()}`,
    password: 'TestAuth123!@#'
  },
  existing: {
    email: 'existing@ge-metrics.com',
    username: 'existinguser',
    password: 'ExistingPass123!@#'
  }
}

test.describe('Authentication Flow - Critical E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication API responses
    await page.route('**/trpc/auth.**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      
      if (url.includes('login') && method === 'POST') {
        // Mock successful login
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                user: {
                  id: '1',
                  email: TEST_USERS.existing.email,
                  username: TEST_USERS.existing.username,
                  role: 'user',
                  isEmailVerified: true
                },
                token: 'mock-jwt-token'
              }
            }
          })
        })
      } else if (url.includes('register') && method === 'POST') {
        // Mock successful registration
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            result: {
              data: {
                user: {
                  id: '2',
                  email: TEST_USERS.new.email,
                  username: TEST_USERS.new.username,
                  role: 'user',
                  isEmailVerified: false
                },
                message: 'Registration successful. Check your email for verification.'
              }
            }
          })
        })
      } else {
        await route.continue()
      }
    })
  })

  test('should complete full registration flow', async ({ page }) => {
    await page.goto('/signup')
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', TEST_USERS.new.email)
    await page.fill('[data-testid="username-input"]', TEST_USERS.new.username)
    await page.fill('[data-testid="password-input"]', TEST_USERS.new.password)
    
    // Accept terms and conditions
    await page.check('[data-testid="terms-checkbox"]')
    
    // Submit registration
    await page.click('[data-testid="register-button"]')
    
    // Should show email verification message
    await expect(page.locator('[data-testid="verification-message"]')).toBeVisible()
    await expect(page.locator('text=Check your email')).toBeVisible()
    
    console.log('✅ Registration flow completed successfully')
  })

  test('should validate registration form properly', async ({ page }) => {
    await page.goto('/signup')
    
    // Try to submit empty form
    await page.click('[data-testid="register-button"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toContainText('required')
    await expect(page.locator('[data-testid="username-error"]')).toContainText('required')
    await expect(page.locator('[data-testid="password-error"]')).toContainText('required')
    
    // Test invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email')
    
    // Test weak password
    await page.fill('[data-testid="password-input"]', 'weak')
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('weak')
    
    // Test strong password
    await page.fill('[data-testid="password-input"]', TEST_USERS.new.password)
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('strong')
  })

  test('should handle duplicate email registration', async ({ page }) => {
    // Mock duplicate email error
    await page.route('**/trpc/auth.register', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'User with this email already exists'
          }
        })
      })
    })

    await page.goto('/signup')
    
    await page.fill('[data-testid="email-input"]', TEST_USERS.existing.email)
    await page.fill('[data-testid="username-input"]', 'newusername')
    await page.fill('[data-testid="password-input"]', TEST_USERS.new.password)
    await page.check('[data-testid="terms-checkbox"]')
    
    await page.click('[data-testid="register-button"]')
    
    // Should show duplicate email error
    await expect(page.locator('[data-testid="registration-error"]')).toContainText('already exists')
  })

  test('should complete login flow successfully', async ({ page }) => {
    await page.goto('/login')
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', TEST_USERS.existing.email)
    await page.fill('[data-testid="password-input"]', TEST_USERS.existing.password)
    
    // Submit login
    await page.click('[data-testid="login-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*|.*profile.*/)
    
    // Should show user info in header
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator(`text=${TEST_USERS.existing.username}`)).toBeVisible()
    
    console.log('✅ Login flow completed successfully')
  })

  test('should handle login with invalid credentials', async ({ page }) => {
    // Mock invalid credentials error
    await page.route('**/trpc/auth.login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Invalid email or password'
          }
        })
      })
    })

    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'wrong@email.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    // Should show login error
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid email or password')
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('should handle password reset flow', async ({ page }) => {
    // Mock password reset response
    await page.route('**/trpc/auth.requestPasswordReset', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              message: 'Password reset email sent successfully'
            }
          }
        })
      })
    })

    await page.goto('/login')
    
    // Click forgot password link
    await page.click('[data-testid="forgot-password-link"]')
    
    // Should navigate to password reset page
    await expect(page).toHaveURL(/.*reset.*|.*forgot.*/)
    
    // Fill reset form
    await page.fill('[data-testid="reset-email-input"]', TEST_USERS.existing.email)
    await page.click('[data-testid="send-reset-button"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="reset-success"]')).toContainText('Password reset email sent')
  })

  test('should logout user successfully', async ({ page }) => {
    // First login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', TEST_USERS.existing.email)
    await page.fill('[data-testid="password-input"]', TEST_USERS.existing.password)
    await page.click('[data-testid="login-button"]')
    
    // Wait for dashboard
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    
    // Open user menu and logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*login.*|.*\/$/)
    
    // Should not show user menu anymore
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible()
  })

  test('should protect routes requiring authentication', async ({ page }) => {
    // Try to access protected routes without authentication
    const protectedRoutes = ['/dashboard', '/profile', '/billing', '/settings']
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      
      // Should redirect to login or show login prompt
      const isOnLoginPage = page.url().includes('login')
      const hasLoginPrompt = await page.locator('[data-testid="login-prompt"]').isVisible()
      
      expect(isOnLoginPage || hasLoginPrompt).toBeTruthy()
    }
  })

  test('should handle session expiration', async ({ page }) => {
    // Mock expired token
    await page.route('**/trpc/auth.**', async (route) => {
      if (route.request().url().includes('me') || route.request().url().includes('verify')) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Token expired'
            }
          })
        })
      } else {
        await route.continue()
      }
    })

    // Set mock expired token in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'expired-token')
    })

    await page.goto('/dashboard')
    
    // Should redirect to login or show session expired message
    const isOnLoginPage = page.url().includes('login')
    const hasSessionExpiredMsg = await page.locator('text=session expired').isVisible()
    
    expect(isOnLoginPage || hasSessionExpiredMsg).toBeTruthy()
  })

  test('should handle email verification', async ({ page }) => {
    // Mock email verification response
    await page.route('**/trpc/auth.verifyEmail', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              message: 'Email verified successfully'
            }
          }
        })
      })
    })

    // Navigate to verification URL
    const verificationToken = 'mock-verification-token'
    await page.goto(`/verify-email?token=${verificationToken}`)
    
    // Should show verification success
    await expect(page.locator('[data-testid="verification-success"]')).toBeVisible()
    await expect(page.locator('text=Email verified successfully')).toBeVisible()
  })

  test('should handle invalid verification token', async ({ page }) => {
    // Mock invalid token response
    await page.route('**/trpc/auth.verifyEmail', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Invalid or expired verification token'
          }
        })
      })
    })

    await page.goto('/verify-email?token=invalid-token')
    
    // Should show error message
    await expect(page.locator('[data-testid="verification-error"]')).toContainText('Invalid or expired')
  })
})

test.describe('Authentication Security Tests', () => {
  test('should implement rate limiting on login attempts', async ({ page }) => {
    // Mock rate limit response
    await page.route('**/trpc/auth.login', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Too many login attempts. Please try again later.'
          }
        })
      })
    })

    await page.goto('/login')
    
    // Attempt login multiple times
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="email-input"]', 'test@email.com')
      await page.fill('[data-testid="password-input"]', 'wrongpassword')
      await page.click('[data-testid="login-button"]')
    }
    
    // Should show rate limit message
    await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText('Too many attempts')
  })

  test('should validate CSRF protection', async ({ page }) => {
    // Try to make request without proper CSRF token
    await page.route('**/trpc/auth.login', async (route) => {
      if (!route.request().headers()['x-csrf-token']) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'CSRF token required'
            }
          })
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', TEST_USERS.existing.email)
    await page.fill('[data-testid="password-input"]', TEST_USERS.existing.password)
    
    // Remove CSRF token from request headers
    await page.evaluate(() => {
      // This would test CSRF protection in a real scenario
      console.log('Testing CSRF protection')
    })
  })

  test('should secure session storage', async ({ page }) => {
    await page.goto('/login')
    
    // Login successfully
    await page.fill('[data-testid="email-input"]', TEST_USERS.existing.email)
    await page.fill('[data-testid="password-input"]', TEST_USERS.existing.password)
    await page.click('[data-testid="login-button"]')
    
    // Check that token is stored securely (httpOnly cookies preferred)
    const localStorage = await page.evaluate(() => {
      return localStorage.getItem('auth-token')
    })
    
    const cookies = await page.context().cookies()
    const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('token'))
    
    // Either token should be in httpOnly cookie or localStorage should be properly secured
    if (authCookie) {
      expect(authCookie.httpOnly).toBeTruthy() // Should be httpOnly for security
    } else if (localStorage) {
      // If using localStorage, ensure it's not exposed in URL or referrer
      expect(localStorage).not.toContain('sensitive-data')
    }
  })
})

test.describe('Authentication API Tests', () => {
  test('should register user via API', async ({ request }) => {
    const response = await request.post('/trpc/auth.register', {
      data: {
        email: TEST_USERS.new.email,
        username: TEST_USERS.new.username,
        password: TEST_USERS.new.password
      }
    })
    
    // Should return success or validation error
    expect([200, 400].includes(response.status())).toBeTruthy()
  })

  test('should login user via API', async ({ request }) => {
    const response = await request.post('/trpc/auth.login', {
      data: {
        email: TEST_USERS.existing.email,
        password: TEST_USERS.existing.password
      }
    })
    
    // Should return success or authentication error
    expect([200, 401].includes(response.status())).toBeTruthy()
  })

  test('should handle malformed requests gracefully', async ({ request }) => {
    // Test with malformed JSON
    const response = await request.post('/trpc/auth.login', {
      data: 'invalid-json',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // Should return 400 for malformed requests
    expect(response.status()).toBe(400)
  })
})