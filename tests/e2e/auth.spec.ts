import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should allow a user to register and log in', async ({ page }) => {
    await page.goto('/signup')

    // Registration
    const email = `test-${Date.now()}@example.com`
    const password = 'password123'
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirmPassword"]', password)
    await page.click('button[type="submit"]')

    // Wait for registration to complete and redirect to login
    await page.waitForURL('/login')
    expect(page.url()).toContain('/login')

    // Login
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // Wait for login to complete and redirect to dashboard
    await page.waitForURL('/dashboard')
    expect(page.url()).toContain('/dashboard')

    // Verify that the user is logged in
    const welcomeMessage = await page.textContent('h1')
    expect(welcomeMessage).toContain('Welcome')
  })
})
