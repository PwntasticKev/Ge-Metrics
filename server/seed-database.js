import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  users,
  itemMapping,
  gameUpdates,
  favorites,
  userProfits,
  userAchievements,
  userGoals,
  clans
} from './src/db/schema.js'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://kevinlee@localhost:5432/auth_db'
const client = postgres(connectionString)
const db = drizzle(client)

async function seedDatabase () {
  console.log('🌱 Starting database seeding...')

  try {
    // 1. Seed Item Mapping (OSRS items)
    console.log('📦 Seeding item mapping...')
    const itemMappingData = [
      { id: 1, name: 'Dragon Bones', examine: 'The bones of a dragon.', members: false, value: 2850, icon: 'dragon_bones.png' },
      { id: 2, name: 'Ranarr Weed', examine: 'A herb used in potions.', members: false, value: 7200, icon: 'ranarr_weed.png' },
      { id: 3, name: 'Magic Logs', examine: 'Logs cut from a magic tree.', members: false, value: 1250, icon: 'magic_logs.png' },
      { id: 4, name: 'Rune Ore', examine: 'A rock containing runite.', members: false, value: 11500, icon: 'rune_ore.png' },
      { id: 5, name: 'Shark', examine: 'I\'d better be careful eating this.', members: false, value: 890, icon: 'shark.png' },
      { id: 6, name: 'Abyssal Whip', examine: 'A weapon from the abyss.', members: true, value: 2000000, icon: 'abyssal_whip.png' },
      { id: 7, name: 'Dragon Scimitar', examine: 'A vicious, curved sword.', members: true, value: 60000, icon: 'dragon_scimitar.png' },
      { id: 8, name: 'Rune Platebody', examine: 'Provides excellent protection.', members: false, value: 39000, icon: 'rune_platebody.png' },
      { id: 9, name: 'Amulet of Glory', examine: 'A very powerful dragonstone amulet.', members: false, value: 12000, icon: 'amulet_of_glory.png' },
      { id: 10, name: 'Ring of Wealth', examine: 'A valuable ring.', members: false, value: 9000, icon: 'ring_of_wealth.png' }
    ]

    for (const item of itemMappingData) {
      await db.insert(itemMapping).values(item).onConflictDoNothing()
    }
    console.log(`✅ Seeded ${itemMappingData.length} items`)

    // 2. Seed Game Updates
    console.log('🎮 Seeding game updates...')
    const gameUpdatesData = [
      {
        updateDate: new Date('2024-01-15'),
        title: 'Mining & Smithing Rework',
        description: 'Major update affecting metal prices and mining mechanics',
        type: 'major',
        color: '#ff6b6b'
      },
      {
        updateDate: new Date('2024-01-20'),
        title: 'Double XP Weekend',
        description: 'Increased demand for training items and resources',
        type: 'event',
        color: '#4ecdc4'
      },
      {
        updateDate: new Date('2024-01-25'),
        title: 'Boss Drop Rate Changes',
        description: 'Adjusted rare drop rates for various bosses',
        type: 'minor',
        color: '#45b7d1'
      },
      {
        updateDate: new Date('2024-02-01'),
        title: 'Herblore Update',
        description: 'New potions and herb mechanics introduced',
        type: 'major',
        color: '#51cf66'
      },
      {
        updateDate: new Date('2024-02-10'),
        title: 'PvP World Changes',
        description: 'Updates to PvP mechanics and rewards',
        type: 'minor',
        color: '#ffd43b'
      }
    ]

    for (const update of gameUpdatesData) {
      await db.insert(gameUpdates).values(update).onConflictDoNothing()
    }
    console.log(`✅ Seeded ${gameUpdatesData.length} game updates`)

    // 3. Create sample users
    console.log('👥 Creating sample users...')
    const sampleUsers = [
      {
        id: uuidv4(),
        email: 'admin@test.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        salt: 'admin_salt',
        name: 'Admin User',
        avatar: 'https://example.com/admin-avatar.jpg'
      },
      {
        id: uuidv4(),
        email: 'trader@test.com',
        passwordHash: await bcrypt.hash('trader123', 10),
        salt: 'trader_salt',
        name: 'Pro Trader',
        avatar: 'https://example.com/trader-avatar.jpg'
      },
      {
        id: uuidv4(),
        email: 'newbie@test.com',
        passwordHash: await bcrypt.hash('newbie123', 10),
        salt: 'newbie_salt',
        name: 'New Player',
        avatar: 'https://example.com/newbie-avatar.jpg'
      }
    ]

    const createdUsers = []
    for (const user of sampleUsers) {
      const result = await db.insert(users).values(user).onConflictDoNothing().returning()
      if (result.length > 0) {
        createdUsers.push(result[0])
      }
    }
    console.log(`✅ Created ${createdUsers.length} sample users`)

    // 4. Create sample user profits
    console.log('💰 Creating sample user profits...')
    for (const user of createdUsers) {
      await db.insert(userProfits).values({
        userId: user.id,
        totalProfit: Math.floor(Math.random() * 10000000),
        weeklyProfit: Math.floor(Math.random() * 1000000),
        monthlyProfit: Math.floor(Math.random() * 5000000),
        totalTrades: Math.floor(Math.random() * 1000),
        bestSingleFlip: Math.floor(Math.random() * 500000),
        currentRank: Math.floor(Math.random() * 1000)
      }).onConflictDoNothing()
    }
    console.log(`✅ Created profit records for ${createdUsers.length} users`)

    // 5. Create sample achievements
    console.log('🏆 Creating sample achievements...')
    const achievements = [
      { type: 'rank_tier', key: 'bronze_rank', name: 'Bronze Rank', description: 'Reached bronze rank in trading' },
      { type: 'trade_milestone', key: 'first_million', name: 'First Million', description: 'Earned your first million GP' },
      { type: 'trade_milestone', key: 'hundred_trades', name: 'Century Trader', description: 'Completed 100 trades' },
      { type: 'profit_milestone', key: 'ten_million', name: 'Ten Millionaire', description: 'Earned 10 million GP profit' }
    ]

    for (const user of createdUsers) {
      for (const achievement of achievements) {
        if (Math.random() > 0.5) { // 50% chance to have each achievement
          await db.insert(userAchievements).values({
            userId: user.id,
            ...achievement
          }).onConflictDoNothing()
        }
      }
    }
    console.log('✅ Created sample achievements')

    // 6. Create sample goals
    console.log('🎯 Creating sample goals...')
    const goals = [
      { type: 'daily_profit', name: 'Daily 1M Profit', targetValue: 1000000 },
      { type: 'weekly_profit', name: 'Weekly 5M Profit', targetValue: 5000000 },
      { type: 'rank_target', name: 'Reach Top 100', targetValue: 100 }
    ]

    for (const user of createdUsers) {
      for (const goal of goals) {
        if (Math.random() > 0.3) { // 70% chance to have each goal
          await db.insert(userGoals).values({
            userId: user.id,
            ...goal,
            currentProgress: Math.floor(Math.random() * goal.targetValue)
          }).onConflictDoNothing()
        }
      }
    }
    console.log('✅ Created sample goals')

    // 7. Create sample favorites
    console.log('❤️ Creating sample favorites...')
    for (const user of createdUsers) {
      const favoriteItems = [1, 3, 5, 7, 9] // Random item IDs
      for (const itemId of favoriteItems) {
        if (Math.random() > 0.5) {
          await db.insert(favorites).values({
            userId: user.id,
            favoriteType: 'item',
            favoriteId: itemId.toString()
          }).onConflictDoNothing()
        }
      }
    }
    console.log('✅ Created sample favorites')

    // 8. Create sample clans
    console.log('🏰 Creating sample clans...')
    const clanData = [
      { name: 'Elite Traders', description: 'Top-tier trading clan' },
      { name: 'Merchant Guild', description: 'Professional merchants' },
      { name: 'Flipping Masters', description: 'Grand Exchange experts' }
    ]

    for (const clan of clanData) {
      if (createdUsers.length > 0) {
        await db.insert(clans).values({
          ...clan,
          ownerId: createdUsers[0].id
        }).onConflictDoNothing()
      }
    }
    console.log('✅ Created sample clans')

    console.log('🎉 Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`- ${itemMappingData.length} items mapped`)
    console.log(`- ${gameUpdatesData.length} game updates`)
    console.log(`- ${createdUsers.length} sample users`)
    console.log('- Sample profits, achievements, goals, favorites, and clans created')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Run seeding
seedDatabase().catch(console.error)
