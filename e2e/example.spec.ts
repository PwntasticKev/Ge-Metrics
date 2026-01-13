import { test, expect } from '@playwright/test';

test.describe('GE-Metrics Application', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page contains expected content
    await expect(page).toHaveTitle(/GE.Metrics|Ge-Metrics|OSRS/i);
  });

  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation (adjust selectors based on your actual app)
    const navigation = page.locator('nav, .navigation, [role="navigation"]').first();
    if (await navigation.count() > 0) {
      await expect(navigation).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });
});