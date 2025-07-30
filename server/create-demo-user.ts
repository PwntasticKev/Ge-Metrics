#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log (message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader (message: string) {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.bold}${colors.blue}${message}${colors.reset}`)
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`)
}

function logTest (testName: string, success: boolean, message = '') {
  const status = success ? '✅ PASS' : '❌ FAIL'
  const color = success ? 'green' : 'red'
  console.log(`${colors[color]}${status}${colors.reset} ${testName}${message ? `: ${message}` : ''}`)
}

// Demo user data - Use environment variables in production
const demoUser = {
  email: process.env.DEMO_USER_EMAIL || 'demo@example.com',
  username: process.env.DEMO_USERNAME || 'demo_user',
  password: process.env.DEMO_PASSWORD || 'CHANGE_THIS_PASSWORD',
  name: process.env.DEMO_NAME || 'Demo User',
  avatar: process.env.DEMO_AVATAR || 'https://example.com/demo-avatar.jpg'
}

async function createDemoUser () {
  logHeader('Creating Permanent Demo User')

  try {
    // Check if demo user already exists
    const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, demoUser.email))

    if (existingUser.length > 0) {
      logTest('Demo User - Check Existing', true, 'Demo user already exists')
      log('\n📊 Demo User Details:', 'blue')
      log(`Email: ${demoUser.email}`, 'yellow')
      log(`Username: ${demoUser.username}`, 'yellow')
      log(`Password: ${demoUser.password}`, 'yellow')
      log(`User ID: ${existingUser[0].id}`, 'yellow')
      return existingUser[0].id
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(demoUser.password, saltRounds)
    const salt = await bcrypt.genSalt(saltRounds)

    // Create user
    const newUser = await db.insert(schema.users).values({
      email: demoUser.email,
      username: demoUser.username,
      passwordHash,
      salt,
      name: demoUser.name,
      avatar: demoUser.avatar
    }).returning()

    const userId = newUser[0].id
    logTest('Demo User - Create User', true, `Created user: ${userId}`)

    // Create subscription
    const subscription = await db.insert(schema.subscriptions).values({
      userId,
      status: 'active',
      plan: 'premium',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      cancelAtPeriodEnd: false
    }).returning()

    logTest('Demo User - Create Subscription', subscription.length > 0, 'Premium subscription created')

    // Create sample watchlist items
    const watchlistItems = await db.insert(schema.userWatchlists).values([
      {
        userId,
        itemId: '537',
        itemName: 'Dragon Bones',
        targetPrice: 5000,
        alertType: 'price',
        isActive: true
      },
      {
        userId,
        itemId: '1127',
        itemName: 'Rune Platebody',
        targetPrice: 40000,
        alertType: 'volume',
        isActive: true
      },
      {
        userId,
        itemId: '2357',
        itemName: 'Uncut Diamond',
        targetPrice: 1800,
        alertType: 'price',
        isActive: true
      }
    ]).returning()

    logTest('Demo User - Create Watchlist', watchlistItems.length === 3, 'Watchlist items created')

    // Create sample transactions
    const transactions = await db.insert(schema.userTransactions).values([
      {
        userId,
        itemId: '537',
        itemName: 'Dragon Bones',
        transactionType: 'buy',
        quantity: 100,
        price: 4800,
        profit: 0,
        notes: 'Demo buy transaction'
      },
      {
        userId,
        itemId: '537',
        itemName: 'Dragon Bones',
        transactionType: 'sell',
        quantity: 100,
        price: 5200,
        profit: 40000,
        notes: 'Demo sell transaction'
      },
      {
        userId,
        itemId: '1127',
        itemName: 'Rune Platebody',
        transactionType: 'buy',
        quantity: 10,
        price: 38000,
        profit: 0,
        notes: 'Demo buy transaction'
      },
      {
        userId,
        itemId: '1127',
        itemName: 'Rune Platebody',
        transactionType: 'sell',
        quantity: 10,
        price: 42000,
        profit: 40000,
        notes: 'Demo sell transaction'
      }
    ]).returning()

    logTest('Demo User - Create Transactions', transactions.length === 4, 'Sample transactions created')

    // Create user profits record
    const userProfits = await db.insert(schema.userProfits).values({
      userId,
      totalProfit: 80000,
      weeklyProfit: 80000,
      monthlyProfit: 80000,
      totalTrades: 4,
      bestSingleFlip: 40000,
      currentRank: 1
    }).returning()

    logTest('Demo User - Create Profits', userProfits.length > 0, 'User profits created')

    // Create sample achievements
    const achievements = await db.insert(schema.userAchievements).values([
      {
        userId,
        achievementId: 'profit_first_million',
        achievementName: 'First Million',
        description: 'Earn your first million GP',
        icon: null,
        unlockedAt: new Date()
      },
      {
        userId,
        achievementId: 'trades_first_trade',
        achievementName: 'First Trade',
        description: 'Complete your first trade',
        icon: null,
        unlockedAt: new Date()
      }
    ]).returning()

    logTest('Demo User - Create Achievements', achievements.length === 2, 'Sample achievements created')

    // Create sample goals
    const goals = await db.insert(schema.userGoals).values([
      {
        userId,
        goalType: 'profit',
        goalName: 'Earn 100M GP',
        targetValue: 100000000,
        currentProgress: 80000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        isCompleted: false
      },
      {
        userId,
        goalType: 'trades',
        goalName: 'Complete 50 Trades',
        targetValue: 50,
        currentProgress: 4,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isCompleted: false
      }
    ]).returning()

    logTest('Demo User - Create Goals', goals.length === 2, 'Sample goals created')

    log('\n🎉 Demo user created successfully!', 'green')
    log('\n📊 Demo User Details:', 'blue')
    log(`Email: ${demoUser.email}`, 'yellow')
    log(`Username: ${demoUser.username}`, 'yellow')
    log(`Password: ${demoUser.password}`, 'yellow')
    log(`User ID: ${userId}`, 'yellow')

    log('\n📋 Demo Data Created:', 'blue')
    log('• Premium subscription (active for 1 year)', 'yellow')
    log('• 3 watchlist items (Dragon Bones, Rune Platebody, Uncut Diamond)', 'yellow')
    log('• 4 sample transactions (2 buy, 2 sell)', 'yellow')
    log('• User profits: 80,000 GP total', 'yellow')
    log('• 2 achievements unlocked', 'yellow')
    log('• 2 active goals', 'yellow')

    log('\n🔐 You can now use these credentials to test the frontend login!', 'green')
    log('\n💡 This demo user will persist and won\'t be cleaned up by tests.', 'blue')

    return userId
  } catch (error) {
    logTest('Demo User Creation', false, error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

// Main execution
createDemoUser().catch((error) => {
  log(`Demo user creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
  process.exit(1)
})
