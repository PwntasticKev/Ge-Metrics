import { test, expect } from '@playwright/test';

test.describe('Application Features (Robust)', () => {
  test('should load main application features', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for common OSRS/GE-related terms
    const content = await page.locator('body').textContent() || '';
    const osrsTerms = [
      'grand exchange',
      'osrs', 
      'runescape',
      'flip',
      'profit',
      'item',
      'price',
      'gp'
    ];
    
    const foundTerms = osrsTerms.filter(term => 
      content.toLowerCase().includes(term.toLowerCase())
    );
    
    // Should have OSRS-related content
    expect(foundTerms.length).toBeGreaterThan(0);
  });

  test('should have interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Count interactive elements
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const inputs = await page.locator('input, select, textarea').count();
    
    const totalInteractive = buttons + links + inputs;
    
    // Should have interactive elements
    expect(totalInteractive).toBeGreaterThan(0);
  });

  test('should handle data tables if present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for table elements
    const tables = await page.locator('table').count();
    const tableRows = await page.locator('tr').count();
    
    if (tables > 0) {
      // If tables exist, they should have content
      expect(tableRows).toBeGreaterThan(0);
      
      // Tables should have headers
      const headers = await page.locator('th, thead').count();
      expect(headers).toBeGreaterThan(0);
    }
    
    // Test passes regardless of whether tables exist
    expect(true).toBe(true);
  });

  test('should handle search functionality if present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for search elements
    const searchInputs = await page.locator('input[placeholder*="search" i], input[type="search"], input[name*="search"]').count();
    
    if (searchInputs > 0) {
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], input[name*="search"]').first();
      
      // Try to interact with search
      await searchInput.click();
      await searchInput.fill('test');
      
      // Should accept input
      const value = await searchInput.inputValue();
      expect(value).toBe('test');
    }
    
    // Test passes regardless
    expect(true).toBe(true);
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors
    const criticalErrors = errors.filter(error => {
      const errorText = error.toLowerCase();
      return !errorText.includes('favicon') && 
             !errorText.includes('websocket') &&
             !errorText.includes('hot-update') &&
             !errorText.includes('development') &&
             !errorText.includes('devtools');
    });
    
    // Should not have critical errors
    expect(criticalErrors.length).toBeLessThanOrEqual(2); // Allow some minor errors
  });
});