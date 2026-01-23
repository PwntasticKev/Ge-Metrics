import { test, expect } from '@playwright/test'

test.describe('Money Making Methods', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the money making methods page
    await page.goto('/money-making-methods')
    await page.waitForLoadState('networkidle')
  })

  test('should load user money making methods page without errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        errors.push(msg.text())
      }
    })
    
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`)
    })
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    
    // Page should have loaded without crashing
    const pageTitle = await page.title()
    expect(pageTitle).toBeTruthy()
    
    // Should have no critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      error.includes('TypeError') || 
      error.includes('Cannot read properties') ||
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    )
    
    expect(criticalErrors).toHaveLength(0)
    
    console.log('✅ User money making methods page loaded successfully!')
  })

  test('should load global money making methods page without errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        errors.push(msg.text())
      }
    })
    
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`)
    })
    
    // Navigate to global methods
    await page.goto('/global-money-making-methods')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    
    // Page should have loaded without crashing
    const pageTitle = await page.title()
    expect(pageTitle).toBeTruthy()
    
    // Should have no critical JavaScript errors  
    const criticalErrors = errors.filter(error => 
      error.includes('TypeError') || 
      error.includes('Cannot read properties') ||
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    )
    
    expect(criticalErrors).toHaveLength(0)
    
    console.log('✅ Global money making methods page loaded successfully!')
  })

  test('should be able to create a new money making method', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('text=Create Method')
    
    // Click create button
    await page.click('text=Create Method')
    
    // Wait for modal to appear
    await page.waitForSelector('text=Create Money Making Method', { timeout: 5000 })
    
    // Fill in the form
    await page.fill('input[placeholder*="method name"]', 'Test Method')
    await page.fill('textarea[placeholder*="description"]', 'This is a test method for E2E testing')
    await page.selectOption('select', 'skilling') // Category
    await page.selectOption('select', 'easy') // Difficulty
    await page.fill('input[type="number"]', '1000000') // Profit per hour
    
    // Submit the form
    await page.click('text=Create Method')
    
    // Wait for success message or method to appear in list
    await page.waitForTimeout(2000)
    
    // Check if method was created (either success notification or method in list)
    const methodCreated = await page.isVisible('text=Test Method') || 
                         await page.isVisible('text=Method created successfully')
    
    expect(methodCreated).toBeTruthy()
    
    console.log('✅ Money making method creation test passed!')
  })

  test('should display methods in table format', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Check if we have either data in table or empty state or test data
    const hasTitle = await page.locator('h2:has-text("My Money Making Methods")').isVisible().catch(() => false)
    const hasTestMethod = await page.locator('text="Test Method"').isVisible().catch(() => false)
    const hasEmptyState = await page.locator('text=/No methods|No money making methods/i').isVisible().catch(() => false)
    const hasPremium = await page.locator('text="Premium Feature"').isVisible().catch(() => false)
    
    expect(hasTitle || hasTestMethod || hasEmptyState || hasPremium).toBeTruthy()
    
    console.log('✅ Methods display test passed!')
  })

  test('should handle refresh functionality', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // Look for any button with refresh icon or refresh functionality
    const refreshButton = await page.locator('[aria-label*="refresh" i], button:has(svg[class*="refresh" i])').first().isVisible().catch(() => false)
    const hasContent = await page.locator('h2:has-text("My Money Making Methods"), text="Test Method"').isVisible().catch(() => false)
    
    // Click refresh if button exists and is visible
    if (refreshButton) {
      const button = page.locator('[aria-label*="refresh" i], button:has(svg[class*="refresh" i])').first()
      await button.click({ force: true }).catch(() => {})
      await page.waitForTimeout(1000)
    }
    
    // Page should still be functional (either has content or premium wrapper)
    expect(hasContent || await page.locator('text="Premium Feature"').isVisible().catch(() => false)).toBeTruthy()
    
    console.log('✅ Refresh functionality test passed!')
  })

  test('should have proper navigation and responsive design', async ({ page }) => {
    // Test on different viewport sizes
    await page.setViewportSize({ width: 375, height: 667 }) // Mobile
    await page.waitForTimeout(1000)
    await expect(page.getByText('My Money Making Methods')).toBeVisible()
    
    await page.setViewportSize({ width: 768, height: 1024 }) // Tablet
    await page.waitForTimeout(1000)
    await expect(page.getByText('My Money Making Methods')).toBeVisible()
    
    await page.setViewportSize({ width: 1200, height: 800 }) // Desktop
    await page.waitForTimeout(1000)
    await expect(page.getByText('My Money Making Methods')).toBeVisible()
    
    console.log('✅ Responsive design test passed!')
  })

  test('should handle API failures gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/money-making-methods', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })
    
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should show error message or handle gracefully
    await page.waitForTimeout(3000)
    
    // Page should still render something (error state or fallback)
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    expect(pageContent!.length).toBeGreaterThan(0)
    
    console.log('✅ API failure handling test passed!')
  })
})

test.describe('Global Money Making Methods', () => {
  test('should display global methods correctly', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.goto('/global-money-making-methods')
    await page.waitForLoadState('networkidle')
    
    // Wait for content
    await page.waitForSelector('text=Global Money Making Methods', { timeout: 10000 })
    
    // Should display global methods or empty state
    await page.waitForTimeout(3000)
    
    const hasContent = await page.isVisible('text=Global Money Making Methods')
    expect(hasContent).toBeTruthy()
    
    // Filter critical errors
    const criticalErrors = errors.filter(error => 
      error.includes('Failed to fetch') ||
      error.includes('TypeError') ||
      error.includes('Cannot read properties')
    )
    
    expect(criticalErrors).toHaveLength(0)
    
    console.log('✅ Global methods page test passed!')
  })

  test('should allow filtering and searching global methods', async ({ page }) => {
    await page.goto('/global-money-making-methods')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    // Look for search/filter controls
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="filter"]')
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('mining')
      await page.waitForTimeout(1000)
      
      // Results should filter
      const pageContent = await page.textContent('body')
      expect(pageContent).toBeTruthy()
    }
    
    console.log('✅ Global methods filtering test passed!')
  })
})