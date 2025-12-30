// Quick test script to run the game updates scraper manually
import { executeJob } from './server/src/services/cronJobExecutor.ts';

console.log('🚀 Starting manual execution of game updates scraper...');

try {
  const result = await executeJob('scrape-game-updates');
  console.log('✅ Job completed:', result);
} catch (error) {
  console.error('❌ Job failed:', error);
}

process.exit(0);