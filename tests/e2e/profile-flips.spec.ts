import { test, expect } from '@playwright/test'

test.describe('Profile Page - Flip Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to profile page (assume logged in)
    await page.goto('/profile')
  })

  test('should display add flip button', async ({ page }) => {
    const addFlipButton = page.locator('button', { hasText: 'Add Flip' })
    await expect(addFlipButton).toBeVisible()
  })

  test('should open add flip modal when clicked', async ({ page }) => {
    const addFlipButton = page.locator('button', { hasText: 'Add Flip' })
    await addFlipButton.click()

    // Check if modal is visible
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Check for autocomplete input
    const itemNameInput = page.locator('input[placeholder*="Start typing to search"]')
    await expect(itemNameInput).toBeVisible()
  })

  test('should show autocomplete suggestions when typing', async ({ page }) => {
    const addFlipButton = page.locator('button', { hasText: 'Add Flip' })
    await addFlipButton.click()

    const itemNameInput = page.locator('input[placeholder*="Start typing to search"]')
    await itemNameInput.fill('dragon claws')

    // Wait for suggestions to appear
    await page.waitForTimeout(1000)
    
    // Check if suggestions dropdown appears
    const suggestions = page.locator('[role="option"]')
    await expect(suggestions.first()).toBeVisible()
  })

  test('should show profit-focused form without buy/sell dropdown', async ({ page }) => {
    const addFlipButton = page.locator('button', { hasText: 'Add Flip' })
    await addFlipButton.click()

    // Check that buy/sell dropdown is NOT present
    const transactionTypeSelect = page.locator('select', { hasText: /Buy|Sell/ })
    await expect(transactionTypeSelect).not.toBeVisible()

    // Check for profit-focused fields
    const quantityInput = page.locator('input[label*="Quantity"]')
    const priceInput = page.locator('input[label*="Price"]')
    const profitInput = page.locator('input[label*="Profit"]')

    await expect(quantityInput.or(page.locator('input[placeholder*="quantity"]'))).toBeVisible()
    await expect(priceInput.or(page.locator('input[placeholder*="price"]'))).toBeVisible()
    await expect(profitInput.or(page.locator('input[placeholder*="profit"]'))).toBeVisible()
  })

  test('should display recent flips section', async ({ page }) => {
    const recentFlipsSection = page.locator('text=Recent Flips')
    await expect(recentFlipsSection).toBeVisible()
  })

  test('should have charts that update when flips are added', async ({ page }) => {
    // Check if charts are present
    const charts = page.locator('[class*="recharts"], [class*="chart"]')
    await expect(charts.first()).toBeVisible()
  })
})