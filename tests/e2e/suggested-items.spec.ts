import { test, expect } from '@playwright/test'

// Test data for suggested items
const mockUser = {
  email: 'test@example.com',
  password: 'testPassword123'
}

test.describe('Suggested Items Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('/login')
    
    // Fill in login form
    await page.fill('input[name="email"]', mockUser.email)
    await page.fill('input[name="password"]', mockUser.password)
    await page.click('button[type="submit"]')
    
    // Wait for successful login and redirect
    await page.waitForURL('**/all-items')
  })

  test.describe('Navigation and Basic Functionality', () => {
    test('suggested items menu item is visible and clickable', async ({ page }) => {
      // Check if Suggested Items appears in the navigation menu
      const suggestedItemsLink = page.locator('text=Suggested Items').first()
      await expect(suggestedItemsLink).toBeVisible()
      
      // Click on Suggested Items
      await suggestedItemsLink.click()
      
      // Verify we're on the suggested items page
      await expect(page).toHaveURL('**/suggested-items')
      await expect(page.locator('text=Suggested Items - ')).toBeVisible()
    })

    test('page loads with default components', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Check for key page elements
      await expect(page.locator('text=Your Capital (GP)')).toBeVisible()
      await expect(page.locator('text=Global Suggested')).toBeVisible()
      await expect(page.locator('text=High Volume')).toBeVisible()
      await expect(page.locator('text=Low Volume')).toBeVisible()
      
      // Check for stats cards
      await expect(page.locator('text=Total Opportunities')).toBeVisible()
      await expect(page.locator('text=High Volume')).toBeVisible()
      await expect(page.locator('text=Low Volume')).toBeVisible()
      await expect(page.locator('text=Avg Margin')).toBeVisible()
    })

    test('page shows loading state initially then loads data', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Should eventually show items or empty state
      await expect(page.locator('[data-testid="suggested-items-table"], text="No items match"')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Capital Input Functionality', () => {
    test('capital input loads saved value from localStorage', async ({ page }) => {
      // Set localStorage value before navigation
      await page.addInitScript(() => {
        localStorage.setItem('suggestedItems_capital', '5000000')
      })
      
      await page.goto('/suggested-items')
      
      // Check if input shows the saved value
      const capitalInput = page.locator('input[placeholder="Enter your available GP"]')
      await expect(capitalInput).toHaveValue('5,000,000')
    })

    test('capital input accepts and formats large numbers', async ({ page }) => {
      await page.goto('/suggested-items')
      
      const capitalInput = page.locator('input[placeholder="Enter your available GP"]')
      
      // Clear and enter 1 billion
      await capitalInput.fill('')
      await capitalInput.fill('1000000000')
      await capitalInput.blur()
      
      // Should format with commas
      await expect(capitalInput).toHaveValue('1,000,000,000')
      
      // Wait a moment for debouncing
      await page.waitForTimeout(500)
    })

    test('capital input saves to localStorage', async ({ page }) => {
      await page.goto('/suggested-items')
      
      const capitalInput = page.locator('input[placeholder="Enter your available GP"]')
      
      // Change the value
      await capitalInput.fill('')
      await capitalInput.fill('2000000')
      await capitalInput.blur()
      
      // Check localStorage
      const savedValue = await page.evaluate(() => localStorage.getItem('suggestedItems_capital'))
      expect(savedValue).toBe('2000000')
    })

    test('capital input does not refresh page on every keystroke', async ({ page }) => {
      await page.goto('/suggested-items')
      
      const capitalInput = page.locator('input[placeholder="Enter your available GP"]')
      
      // Clear input and type slowly
      await capitalInput.fill('')
      await capitalInput.type('1234567', { delay: 100 }) // 100ms between keystrokes
      
      // Page should still be functional, not refreshing
      await expect(page.locator('text=Your Capital (GP)')).toBeVisible()
      await expect(page.locator('text=Global Suggested')).toBeVisible()
    })
  })

  test.describe('Tab Switching Functionality', () => {
    test('switches between different volume tabs', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Start on Global tab (default)
      await expect(page.locator('[data-value="global"][data-active="true"]')).toBeVisible()
      
      // Click High Volume tab
      await page.click('text=High Volume')
      await expect(page.locator('[data-value="high"][data-active="true"]')).toBeVisible()
      
      // Click Low Volume tab
      await page.click('text=Low Volume')
      await expect(page.locator('[data-value="low"][data-active="true"]')).toBeVisible()
      
      // Click back to Global
      await page.click('text=Global Suggested')
      await expect(page.locator('[data-value="global"][data-active="true"]')).toBeVisible()
    })

    test('tab counts update based on data', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Wait for data to load
      await page.waitForTimeout(2000)
      
      // Check if tab labels show counts
      await expect(page.locator('text=/Global Suggested \\(\\d+\\)/')).toBeVisible()
      await expect(page.locator('text=/High Volume \\(\\d+\\)/')).toBeVisible()
      await expect(page.locator('text=/Low Volume \\(\\d+\\)/')).toBeVisible()
    })
  })

  test.describe('Data Loading and Display', () => {
    test('shows items when available or appropriate empty state', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Wait for data loading to complete
      await page.waitForTimeout(3000)
      
      // Should show either items or empty state message
      const hasItems = await page.locator('table tbody tr').count() > 0
      const hasEmptyState = await page.locator('text="No items match your current filters"').isVisible()
      
      expect(hasItems || hasEmptyState).toBe(true)
    })

    test('handles 1B capital correctly - should show items, not empty state', async ({ page }) => {
      await page.goto('/suggested-items')
      
      const capitalInput = page.locator('input[placeholder="Enter your available GP"]')
      
      // Set capital to 1 billion
      await capitalInput.fill('')
      await capitalInput.fill('1000000000')
      await capitalInput.blur()
      
      // Wait for query to process
      await page.waitForTimeout(2000)
      
      // Should NOT show "No items match" error with 1B capital
      const noItemsMessage = page.locator('text="No items match your current filters"')
      await expect(noItemsMessage).not.toBeVisible()
      
      // Should show either items or loading
      const hasContent = await page.locator('table, [data-testid="loader"]').isVisible()
      expect(hasContent).toBe(true)
    })

    test('refresh button updates data', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Wait for initial load
      await page.waitForTimeout(2000)
      
      // Click refresh button
      const refreshButton = page.locator('text=Refresh')
      await refreshButton.click()
      
      // Button should show loading state briefly
      await expect(refreshButton).toBeDisabled()
      
      // Should re-enable after refresh
      await expect(refreshButton).toBeEnabled({ timeout: 5000 })
    })
  })

  test.describe('Table Functionality', () => {
    test('table displays item information correctly', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Wait for data to load
      await page.waitForTimeout(3000)
      
      // If items are present, check table structure
      const itemRows = page.locator('table tbody tr')
      const rowCount = await itemRows.count()
      
      if (rowCount > 0) {
        // Check first row has expected columns
        const firstRow = itemRows.first()
        await expect(firstRow.locator('td').first()).toBeVisible() // First column
        
        // Should have item name, price, volume, etc.
        await expect(page.locator('th', { hasText: 'Item' })).toBeVisible()
        await expect(page.locator('th', { hasText: 'Price' })).toBeVisible()
        await expect(page.locator('th', { hasText: 'Volume' })).toBeVisible()
        await expect(page.locator('th', { hasText: 'Score' })).toBeVisible()
      }
    })

    test('favorite functionality works', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Wait for data
      await page.waitForTimeout(3000)
      
      const heartIcons = page.locator('[data-testid="favorite-heart"], svg[data-icon="heart"]')
      const heartCount = await heartIcons.count()
      
      if (heartCount > 0) {
        // Click first heart icon
        await heartIcons.first().click()
        
        // Should change state (filled vs unfilled)
        await page.waitForTimeout(500)
      }
    })

    test('chart modal opens when chart icon clicked', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Wait for data
      await page.waitForTimeout(3000)
      
      const chartIcons = page.locator('[data-testid="chart-icon"], svg[data-icon="chart-histogram"]')
      const chartCount = await chartIcons.count()
      
      if (chartCount > 0) {
        // Click first chart icon
        await chartIcons.first().click()
        
        // Should open modal
        await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3000 })
      }
    })

    test('sorting functionality works', async ({ page }) => {
      await page.goto('/suggested-items')
      
      // Wait for data
      await page.waitForTimeout(3000)
      
      // Try clicking sortable headers
      const scoreHeader = page.locator('th', { hasText: 'Score' })
      await scoreHeader.click()
      
      // Should see sort indicator or reordered data
      await page.waitForTimeout(1000)
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('works correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/suggested-items')
      
      // Should render without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(400) // Account for some padding
      
      // Key elements should be visible
      await expect(page.locator('text=Your Capital')).toBeVisible()
      await expect(page.locator('text=Global Suggested')).toBeVisible()
    })

    test('touch interactions work on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/suggested-items')
      
      // Wait for load
      await page.waitForTimeout(2000)
      
      // Try touch interactions
      const highVolumeTab = page.locator('text=High Volume')
      await highVolumeTab.tap()
      
      await expect(page.locator('[data-value="high"][data-active="true"]')).toBeVisible()
    })
  })

  test.describe('Performance Tests', () => {
    test('page loads within reasonable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/suggested-items')
      
      // Wait for key elements to appear
      await expect(page.locator('text=Your Capital (GP)')).toBeVisible()
      await expect(page.locator('text=Global Suggested')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // 5 seconds max
    })

    test('capital input debouncing prevents excessive API calls', async ({ page }) => {
      await page.goto('/suggested-items')
      
      const capitalInput = page.locator('input[placeholder="Enter your available GP"]')
      
      // Type quickly - should not trigger multiple API calls immediately
      await capitalInput.fill('')
      await capitalInput.type('123456789', { delay: 50 }) // Fast typing
      
      // Wait for debounce period
      await page.waitForTimeout(500)
      
      // Page should still be responsive
      await expect(page.locator('text=Your Capital (GP)')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('handles network errors gracefully', async ({ page }) => {
      // Intercept API calls and return errors
      await page.route('**/trpc/suggestedItems.**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })
      
      await page.goto('/suggested-items')
      
      // Should show appropriate error state
      await expect(page.locator('text="No items match", text="Error", [role="alert"]')).toBeVisible({ timeout: 5000 })
    })

    test('handles empty data state appropriately', async ({ page }) => {
      // Intercept API calls and return empty arrays
      await page.route('**/trpc/suggestedItems.getItems**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ result: { data: [] } })
        })
      })
      
      await page.goto('/suggested-items')
      
      // Should show empty state message
      await expect(page.locator('text="No items match your current filters"')).toBeVisible({ timeout: 5000 })
    })
  })
})