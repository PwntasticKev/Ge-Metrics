import { chromium } from 'playwright';

const testTrashButton = async () => {
  console.log('🚀 Starting trash button test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Listen to console logs from the page
    page.on('console', msg => {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    
    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('trash')) {
        console.log(`[NETWORK] → ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('trash')) {
        console.log(`[NETWORK] ← ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('📖 First login...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    
    // Login
    await page.fill('input[type="email"]', 'user@ge-metrics-test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    console.log('📖 Navigating to all items page...');
    await page.goto('http://localhost:5173/all-items');
    await page.waitForLoadState('networkidle');
    
    // Wait for items to load - look for table rows
    console.log('⏳ Waiting for items to load...');
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    
    // Find the first trash button - it's an ActionIcon with IconTrash
    console.log('🔍 Looking for trash button...');
    const trashButton = await page.locator('button:has(svg[data-icon="trash"])').first();
    
    if (await trashButton.count() === 0) {
      console.log('❌ No trash button found. Looking for any button with trash icon...');
      await page.screenshot({ path: 'no-trash-button.png' });
      
      // Try to find any button that might be a trash button
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons total`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const buttonText = await allButtons[i].textContent();
        const buttonHTML = await allButtons[i].innerHTML();
        console.log(`Button ${i}: "${buttonText}" HTML: ${buttonHTML.slice(0, 100)}...`);
      }
    } else {
      console.log('✅ Found trash button!');
      await page.screenshot({ path: 'before-trash-click.png' });
      
      console.log('🖱️ Clicking trash button...');
      await trashButton.click();
      
      // Wait a bit for the request to complete
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'after-trash-click.png' });
      console.log('✅ Trash button clicked successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    console.log('🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
};

testTrashButton();