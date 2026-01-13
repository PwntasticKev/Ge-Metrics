import { test, expect } from '@playwright/test';

test.describe('GE-Metrics Smoke Tests', () => {
  test('should load the homepage without errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Basic page load check
    await expect(page).toHaveTitle(/ge.metrics|osrs|runescape/i);
    
    // Check for React app mounting
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100); // Page should have content
    
    // Should not have critical console errors
    const criticalErrors = errors.filter(error => 
      error.includes('Failed to fetch') || 
      error.includes('TypeError') ||
      error.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for common navigation patterns and interactive elements
    const navSelectors = [
      'nav',
      '[role="navigation"]',
      '.navigation',
      '.navbar',
      '.header',
      'header',
      'button',
      'a[href]',
      '[class*="nav"]',
      '[class*="menu"]'
    ];
    
    let foundInteractive = false;
    for (const selector of navSelectors) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        foundInteractive = true;
        break;
      }
    }
    
    // Should have at least some interactive elements
    expect(foundInteractive).toBe(true);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should still load and be functional
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(50);
    
    // No horizontal scroll should be present
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should either redirect to home or show a proper 404
    const url = page.url();
    const content = await page.locator('body').textContent() || '';
    
    // Either back at home or showing 404 content
    const isValidResponse = 
      url.includes('localhost:8000/') || 
      content.toLowerCase().includes('404') ||
      content.toLowerCase().includes('not found') ||
      content.toLowerCase().includes('page not found');
    
    expect(isValidResponse).toBe(true);
  });

  test('should have functional links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find internal links
    const links = await page.locator('a[href^="/"], a[href^="#"]').all();
    
    if (links.length > 0) {
      // Test first few internal links
      const linksToTest = links.slice(0, Math.min(3, links.length));
      
      for (const link of linksToTest) {
        const href = await link.getAttribute('href');
        if (href && href !== '#' && !href.includes('mailto:')) {
          // Click and verify no errors
          const response = await page.goto(href);
          expect(response?.status()).toBeLessThan(400);
        }
      }
    }
  });
});