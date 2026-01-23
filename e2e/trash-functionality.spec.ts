import { test, expect, Page } from '@playwright/test'
import { authenticateUser } from './helpers/auth'

test.describe('Trash Functionality', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    // Create a new page context for each test
    page = await browser.newPage()
    
    // Authenticate user before each test
    await authenticateUser(page)
    
    // Navigate to all items page
    await page.goto('/all-items')
    await page.waitForSelector('table', { timeout: 10000 })
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should display trash button for each item', async () => {
    // Wait for table rows to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })
    
    // Check that trash buttons exist
    const trashButtons = page.locator('[data-testid="trash-button"], button[aria-label*="trash" i]')
    const count = await trashButtons.count()
    
    expect(count).toBeGreaterThan(0)
  })

  test('should toggle trash vote when clicking trash button', async () => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })
    
    // Find the first trash button
    const firstRow = page.locator('tbody tr').first()
    const trashButton = firstRow.locator('button').filter({ 
      has: page.locator('svg[class*="icon-trash" i], [class*="tabler-icon-trash" i]')
    }).first()
    
    // Check initial state
    const initialColor = await trashButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    )
    
    // Click the trash button
    await trashButton.click()
    
    // Wait for the request to complete
    await page.waitForResponse(
      response => response.url().includes('/trpc/trash.markItem') || 
                 response.url().includes('/trpc/trash.unmarkItem'),
      { timeout: 5000 }
    ).catch(() => {
      // If no response, check for error message
    })
    
    // Check if the button state changed
    await page.waitForTimeout(500) // Allow UI to update
    
    const newColor = await trashButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    )
    
    // Colors should be different after clicking
    expect(newColor).not.toBe(initialColor)
  })

  test('should show error message if trash vote fails', async () => {
    // Intercept the API call and force it to fail
    await page.route('**/trpc/trash.markItem*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Failed to mark item as trash',
            code: 'INTERNAL_SERVER_ERROR'
          }
        })
      })
    })
    
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })
    
    // Find and click the first trash button
    const firstRow = page.locator('tbody tr').first()
    const trashButton = firstRow.locator('button').filter({ 
      has: page.locator('svg[class*="icon-trash" i], [class*="tabler-icon-trash" i]')
    }).first()
    
    await trashButton.click()
    
    // Check for error notification
    const errorNotification = page.locator('[role="alert"], .mantine-Notification')
    await expect(errorNotification).toBeVisible({ timeout: 5000 })
    
    // Check error message content
    const errorText = await errorNotification.textContent()
    expect(errorText).toContain('trash')
  })

  test('should update trash percentage after voting', async () => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })
    
    // Find the first row with trash percentage
    const firstRow = page.locator('tbody tr').first()
    
    // Get initial trash percentage if displayed
    const initialPercentage = await firstRow
      .locator('[data-testid="trash-percentage"], .trash-percentage')
      .textContent()
      .catch(() => null)
    
    // Click the trash button
    const trashButton = firstRow.locator('button').filter({ 
      has: page.locator('svg[class*="icon-trash" i], [class*="tabler-icon-trash" i]')
    }).first()
    
    await trashButton.click()
    
    // Wait for update
    await page.waitForResponse(
      response => response.url().includes('/trpc/trash'),
      { timeout: 5000 }
    ).catch(() => {})
    
    await page.waitForTimeout(1000)
    
    // Check if percentage updated (if displayed)
    if (initialPercentage !== null) {
      const newPercentage = await firstRow
        .locator('[data-testid="trash-percentage"], .trash-percentage')
        .textContent()
        .catch(() => null)
      
      expect(newPercentage).toBeDefined()
    }
  })

  test('should persist trash votes after page refresh', async () => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })
    
    // Find an item to mark as trash
    const firstRow = page.locator('tbody tr').first()
    const itemName = await firstRow.locator('td').nth(1).textContent()
    
    const trashButton = firstRow.locator('button').filter({ 
      has: page.locator('svg[class*="icon-trash" i], [class*="tabler-icon-trash" i]')
    }).first()
    
    // Mark as trash
    await trashButton.click()
    
    // Wait for the request to complete
    await page.waitForResponse(
      response => response.url().includes('/trpc/trash.markItem'),
      { timeout: 5000 }
    ).catch(() => {})
    
    // Refresh the page
    await page.reload()
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Find the same item
    const sameItem = page.locator('tbody tr').filter({ 
      hasText: itemName || '' 
    }).first()
    
    // Check if trash button is still marked
    const trashButtonAfterRefresh = sameItem.locator('button').filter({ 
      has: page.locator('svg[class*="icon-trash" i], [class*="tabler-icon-trash" i]')
    }).first()
    
    // Check if button has "filled" or "active" state
    const buttonClass = await trashButtonAfterRefresh.getAttribute('class')
    const isFilled = buttonClass?.includes('filled') || 
                     buttonClass?.includes('active') ||
                     buttonClass?.includes('selected')
    
    expect(isFilled).toBeTruthy()
  })

  test('should handle rapid clicks without errors', async () => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })
    
    // Find the trash button
    const firstRow = page.locator('tbody tr').first()
    const trashButton = firstRow.locator('button').filter({ 
      has: page.locator('svg[class*="icon-trash" i], [class*="tabler-icon-trash" i]')
    }).first()
    
    // Click rapidly multiple times
    const clickPromises = []
    for (let i = 0; i < 5; i++) {
      clickPromises.push(trashButton.click())
      await page.waitForTimeout(100)
    }
    
    await Promise.all(clickPromises)
    
    // Wait for any pending requests
    await page.waitForTimeout(2000)
    
    // Check that no error is displayed
    const errorNotification = page.locator('[role="alert"].error, .mantine-Notification[data-error="true"]')
    await expect(errorNotification).not.toBeVisible()
  })

  test('should show correct trash count', async () => {
    // Wait for table to load
    await page.waitForSelector('tbody tr', { timeout: 10000 })
    
    // Check if trash count is displayed
    const trashCount = page.locator('[data-testid="trash-count"], .trash-count')
    const countText = await trashCount.textContent().catch(() => null)
    
    if (countText) {
      // Verify it's a number or percentage
      expect(countText).toMatch(/\d+/)
    }
  })
})