// Quick test to run game updates scraper directly
import gameUpdatesScraper from './src/services/gameUpdatesScraper.js';

console.log('🚀 Starting manual execution of game updates scraper...');

try {
  await gameUpdatesScraper.scrapeAndSaveUpdates();
  console.log('✅ Scraper completed successfully');
  
  // Check what we got
  const cached = await gameUpdatesScraper.getCachedUpdates(5);
  console.log('📊 Latest updates in database:');
  cached.forEach((update, i) => {
    console.log(`  ${i + 1}. ${update.title} (${update.updateDate})`);
  });
} catch (error) {
  console.error('❌ Scraper failed:', error);
}

process.exit(0);