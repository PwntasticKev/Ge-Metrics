import { updateDeveloperBlogs } from '../services/blogScraperService.js'

async function populateBlogs() {
  console.log('🚀 Starting blog population...')
  try {
    const result = await updateDeveloperBlogs()
    
    if (result.success) {
      console.log(`✅ Successfully populated blogs!`)
      console.log(`   - Inserted: ${result.inserted} new blogs`)
      console.log(`   - Skipped: ${result.skipped} existing blogs`)
      process.exit(0)
    } else {
      console.error(`❌ Failed to populate blogs: ${result.error}`)
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

populateBlogs()
