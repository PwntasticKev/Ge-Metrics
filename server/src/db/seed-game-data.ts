
import { db } from './index.js'
import { blogs, gameUpdates } from './schema.js'

async function seedGameData() {
  console.log('Seeding game data...')

  const now = new Date()
  
  // Create some sample blogs
  const sampleBlogs = [
    {
      title: 'Dev Blog: Sailing Progress',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      url: 'https://secure.runescape.com/m=news/sailing-progress?oldschool=1',
      category: 'Game updates',
      content: 'We are making great progress on the new Sailing skill!',
      year: 2026,
      month: 1,
      day: 5
    },
    {
      title: 'Community Showcase',
      date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      url: 'https://secure.runescape.com/m=news/community-showcase?oldschool=1',
      category: 'Community updates',
      content: 'Look at this amazing art!',
      year: 2025,
      month: 12,
      day: 28
    },
    {
      title: 'Winter Summit 2025 Summary',
      date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      url: 'https://secure.runescape.com/m=news/winter-summit-summary?oldschool=1',
      category: 'Game updates',
      content: 'Here is what we announced at the Winter Summit.',
      year: 2025,
      month: 11,
      day: 22
    }
  ]

  // Create some sample game updates
  const sampleUpdates = [
    {
      updateDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      title: 'Weekly Game Update: Bug Fixes',
      description: 'Various bug fixes and improvements.',
      type: 'minor',
      category: 'minor',
      color: '#45b7d1',
      url: 'https://secure.runescape.com/m=news/weekly-update?oldschool=1',
      year: 2026,
      month: 1,
      day: 2
    },
    {
      updateDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      title: 'Valamore: Part 2 Release',
      description: 'The second part of the Varlamore expansion is now live!',
      type: 'major',
      category: 'major',
      color: '#ff6b6b',
      url: 'https://secure.runescape.com/m=news/varlamore-part-2?oldschool=1',
      year: 2025,
      month: 12,
      day: 18
    },
    {
      updateDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      title: 'Leagues V: Raging Echoes',
      description: 'The new League has begun!',
      type: 'event',
      category: 'event',
      color: '#4ecdc4',
      url: 'https://secure.runescape.com/m=news/leagues-v?oldschool=1',
      year: 2025,
      month: 10,
      day: 8
    }
  ]

  try {
    console.log('Inserting blogs...')
    await db.insert(blogs).values(sampleBlogs).onConflictDoNothing()
    
    console.log('Inserting game updates...')
    await db.insert(gameUpdates).values(sampleUpdates).onConflictDoNothing()
    
    console.log('Seeding complete!')
  } catch (error) {
    console.error('Error seeding data:', error)
  }
}

seedGameData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

