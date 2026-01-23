import { test } from '@playwright/test'

test('test trash button functionality', async ({ page }) => {
  // Navigate directly to all items page (assuming already logged in)
  await page.goto('http://localhost:8000/all-items')
  
  // Wait for table to load
  await page.waitForSelector('table', { timeout: 10000 })
  await page.waitForTimeout(2000) // Allow data to load
  
  // Find a trash button and click it
  const trashButtons = page.locator('button').filter({ 
    has: page.locator('svg')
  })
  
  // Get the first trash button that looks like a trash icon
  const firstTrashButton = await trashButtons.first()
  
  // Click the trash button
  console.log('Clicking trash button...')
  await firstTrashButton.click()
  
  // Wait to see if request completes
  await page.waitForTimeout(3000)
  
  // Check console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text())
    }
  })
  
  // Keep browser open for inspection
  await page.waitForTimeout(30000)
})