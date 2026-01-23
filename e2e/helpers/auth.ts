import { Page } from '@playwright/test'

/**
 * Authenticate a real user for E2E tests
 */
export async function authenticateUser(page: Page) {
  // Go to login page
  await page.goto('/login')
  
  // Fill in login credentials
  await page.fill('input[type="email"]', 'user@ge-metrics-test.com')
  await page.fill('input[type="password"]', 'TestPassword123!')
  
  // Click login button
  await page.click('button[type="submit"]')
  
  // Wait for redirect to authenticated page
  await page.waitForURL(/\/all-items|\/home/, { timeout: 10000 })
  
  // Verify we're logged in by checking for user elements
  await page.waitForSelector('[data-testid="user-menu"], [aria-label*="user" i]', { timeout: 5000 })
}

/**
 * Mock admin authentication for E2E tests
 * Intercepts TRPC auth requests to simulate admin user
 */
export async function mockAdminAuth(page: Page) {
  // Mock the TRPC auth.me endpoint
  await page.route('**/trpc/auth.me*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          data: {
            json: {
              id: 'test-admin-123',
              email: 'admin@test.com',
              role: 'admin',
              name: 'Test Admin',
              isActive: true,
              isApproved: true,
              status: 'active',
              createdAt: new Date().toISOString()
            }
          }
        }
      })
    })
  })
  
  // Mock the billing subscription endpoint
  await page.route('**/trpc/billing.getSubscription*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          data: {
            json: {
              isPremium: false,
              plan: 'free'
            }
          }
        }
      })
    })
  })
  
  // Set auth token in localStorage for initial check
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'mock-admin-token')
  })
}

/**
 * Clear authentication data
 */
export async function clearAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userRole')
  })
}