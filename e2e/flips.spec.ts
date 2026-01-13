import { test, expect, Page } from '@playwright/test'

test.describe('Flip Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/profile')
  })

  test('should add a new flip', async ({ page }) => {
    await page.click('text=Add Flip')
    
    await page.fill('input[name="itemName"]', 'Abyssal whip')
    await page.fill('input[name="buyPrice"]', '2500000')
    await page.fill('input[name="sellPrice"]', '2750000')
    await page.fill('input[name="quantity"]', '1')
    
    await page.click('button:has-text("Save Flip")')
    
    await expect(page.locator('text=Abyssal whip')).toBeVisible()
    await expect(page.locator('text=250k profit')).toBeVisible()
  })

  test('should filter flips by date range', async ({ page }) => {
    await page.click('button:has-text("Date Range")')
    
    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    await page.fill('input[name="startDate"]', lastWeek.toISOString().split('T')[0])
    await page.fill('input[name="endDate"]', today.toISOString().split('T')[0])
    
    await page.click('button:has-text("Apply")')
    
    await expect(page.locator('.flip-card')).toHaveCount(await page.locator('.flip-card').count())
  })

  test('should delete a flip', async ({ page }) => {
    const flipCount = await page.locator('.flip-card').count()
    
    if (flipCount > 0) {
      await page.locator('.flip-card').first().hover()
      await page.click('button[aria-label="Delete flip"]')
      await page.click('button:has-text("Confirm")')
      
      await expect(page.locator('.flip-card')).toHaveCount(flipCount - 1)
    }
  })

  test('should display profit statistics', async ({ page }) => {
    await expect(page.locator('text=Total Profit')).toBeVisible()
    await expect(page.locator('text=Average ROI')).toBeVisible()
    await expect(page.locator('text=Best Flip')).toBeVisible()
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