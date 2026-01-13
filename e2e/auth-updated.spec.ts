import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow (Robust)', () => {
  test('should load authentication pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for login/signup elements using multiple selectors
    const authSelectors = [
      'text=Sign Up',
      'text=Login',
      'text=Register',
      'text=Sign In',
      '[href*="login"]',
      '[href*="signup"]',
      '[href*="auth"]',
      'button:has-text("Login")',
      'a:has-text("Sign Up")'
    ];
    
    let foundAuth = false;
    for (const selector of authSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        foundAuth = true;
        break;
      }
    }
    
    // Should have some authentication UI
    expect(foundAuth).toBe(true);
  });

  test('should handle authentication form interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for form elements
    const forms = await page.locator('form').count();
    const inputs = await page.locator('input[type="email"], input[type="password"], input[name*="email"], input[name*="password"]').count();
    
    // Should have forms or input elements if auth is present
    expect(forms + inputs).toBeGreaterThan(0);
  });

  test('should navigate to different sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to common pages
    const commonPages = [
      '/',
      '/profile',
      '/login',
      '/signup'
    ];
    
    for (const pagePath of commonPages) {
      const response = await page.goto(pagePath);
      
      // Page should load without major errors
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
      
      // Wait for page to stabilize
      await page.waitForLoadState('domcontentloaded');
      
      // Page should have content
      const content = await page.locator('body').textContent();
      expect(content?.length || 0).toBeGreaterThan(5);
    }
  });
});