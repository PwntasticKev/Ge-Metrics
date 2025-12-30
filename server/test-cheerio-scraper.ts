// Test the cheerio-based game updates scraper
import gameUpdatesScraper from './src/services/gameUpdatesScraperCheerio.js';

console.log('🚀 Testing cheerio-based game updates scraper...');

try {
  // Clear existing test data first
  console.log('🗑️  Clearing existing test updates...');
  
  await gameUpdatesScraper.scrapeAndSaveUpdates();
  console.log('✅ Scraper completed successfully');
  
  // Check what we got
  const cached = await gameUpdatesScraper.getCachedUpdates(10);
  console.log(`📊 Latest ${cached.length} updates in database:`);
  cached.forEach((update, i) => {
    console.log(`  ${i + 1}. ${update.title} (${update.updateDate?.toDateString()}) - ${update.type}`);
  });
} catch (error) {
  console.error('❌ Scraper failed:', error);
}

process.exit(0);