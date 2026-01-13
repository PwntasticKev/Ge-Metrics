import { test, expect, Page } from '@playwright/test'

const testEmail = `test${Date.now()}@example.com`
const testPassword = 'TestPassword123!'

test.describe('Authentication Flow', () => {
  test('should register a new user', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Sign Up')
    
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/verify-email', { timeout: 10000 })
    await expect(page.locator('text=verify your email')).toBeVisible()
  })

  test('should login with existing user', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Login')
    
    await page.fill('input[name="email"]', 'demo@example.com')
    await page.fill('input[name="password"]', 'DemoPassword123')
    
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/profile', { timeout: 10000 })
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/')
    
    await page.click('text=Login')
    
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    
    await page.click('button[type="submit"]')
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    await loginAsTestUser(page)
    
    await page.click('button[aria-label="User menu"]')
    await page.click('text=Logout')
    
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Login')).toBeVisible()
  })
})

async function loginAsTestUser(page: Page) {
  await page.goto('/')
  await page.click('text=Login')
  await page.fill('input[name="email"]', 'demo@example.com')
  await page.fill('input[name="password"]', 'DemoPassword123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/profile')
}