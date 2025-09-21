// tests/e2e/auth.spec.js
import { test, expect } from '@playwright/test'

const adminUser = {
  email: 'admin@ge-metrics-test.com',
  password: 'Noob1234'
}

const normalUser = {
  email: 'user@ge-metrics-test.com',
  password: 'Noob1234'
}

const expiredUser = {
  email: 'expired@ge-metrics-test.com',
  password: 'Noob1234'
}

test.describe('Authentication and Authorization', () => {
  test('should allow a normal user to log in and see the dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', normalUser.email)
    await page.fill('input[name="password"]', normalUser.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('should allow an admin user to log in and see the admin panel', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', adminUser.email)
    await page.fill('input[name="password"]', adminUser.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
    await page.click('a[href="/admin"]')
    await expect(page).toHaveURL('/admin')
    await expect(page.locator('text=Admin Panel')).toBeVisible()
  })

  test('should not allow a normal user to access the admin panel', async ({ page }) => {
    // Log in as normal user first
    await page.goto('/login')
    await page.fill('input[name="email"]', normalUser.email)
    await page.fill('input[name="password"]', normalUser.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')

    // Attempt to access admin panel
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
    await expect(page.locator('text=Access Denied')).toBeVisible()
  })

  test('should show an error for invalid login credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'wrong@email.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.locator('.notification-error')).toBeVisible()
  })

  test('should block a user with an expired trial from logging in', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', expiredUser.email)
    await page.fill('input[name="password"]', expiredUser.password)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Your trial has expired')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })
})
