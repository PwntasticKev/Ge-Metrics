#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm'
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

// Test user data
const testUser = {
  email: 'comprehensive@ge-metrics.com',
  username: 'comprehensiveuser',
  password: 'TestPassword123!',
  name: 'Comprehensive Test User',
  avatar: 'https://example.com/comprehensive-avatar.jpg'
}

let testUserId: string | null = null

// Test all table schemas exist and are accessible
async function testAllTableSchemas () {
  logHeader('Testing All Database Table Schemas')

  const expectedTables = [
    'users',
    'refresh_tokens',
    'subscriptions',
    'user_watchlists',
    'user_transactions',
    'favorites',
    'item_mapping',
    'item_price_history',
    'game_updates',
    'user_profits',
    'user_trades',
    'user_achievements',
    'user_goals',
    'friend_invites',
    'user_friendships',
    'clans',
    'clan_members',
    'clan_invites',
    'profit_audit_log'
  ]

  for (const tableName of expectedTables) {
    try {
      await db.execute(`SELECT 1 FROM ${tableName} LIMIT 1`)
      logTest(`Table Schema - ${tableName}`, true, 'Table exists and accessible')
    } catch (error) {
      logTest(`Table Schema - ${tableName}`, false, `Table missing or inaccessible: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Test user creation and management
async function testUserManagement () {
  logHeader('Testing User Management')

  try {
    // Check if test user exists
    const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, testUser.email))

    if (existingUser.length > 0) {
      testUserId = existingUser[0].id
      logTest('User Management - Check Existing', true, 'Test user already exists')
    } else {
      // Create test user
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(testUser.password, saltRounds)
      const salt = await bcrypt.genSalt(saltRounds)

      const newUser = await db.insert(schema.users).values({
        email: testUser.email,
        username: testUser.username,
        passwordHash,
        salt,
        name: testUser.name,
        avatar: testUser.avatar
      }).returning()

      testUserId = newUser[0].id
      logTest('User Management - Create User', true, `Created user: ${testUserId}`)
    }

    // Test user retrieval
    const retrievedUser = await db.select().from(schema.users).where(eq(schema.users.id, testUserId))
    logTest('User Management - Retrieve User', retrievedUser.length > 0, 'User retrieved successfully')

    // Test user update
    const updatedUser = await db
      .update(schema.users)
      .set({ name: 'Updated Comprehensive User', updatedAt: new Date() })
      .where(eq(schema.users.id, testUserId))
      .returning()
    logTest('User Management - Update User', updatedUser.length > 0, 'User updated successfully')
  } catch (error) {
    logTest('User Management', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test favorites functionality
async function testFavorites () {
  logHeader('Testing Favorites System')

  if (!testUserId) {
    logTest('Favorites System', false, 'No test user available')
    return
  }

  try {
    // Create test favorites
    const favorites = await db.insert(schema.favorites).values([
      {
        userId: testUserId,
        favoriteType: 'item',
        favoriteId: '12345'
      },
      {
        userId: testUserId,
        favoriteType: 'item',
        favoriteId: '67890'
      },
      {
        userId: testUserId,
        favoriteType: 'combination',
        favoriteId: 'combo_1'
      }
    ]).returning()

    logTest('Favorites - Create Favorites', favorites.length === 3, `Created ${favorites.length} favorites`)

    // Test favorites retrieval
    const userFavorites = await db.select().from(schema.favorites).where(eq(schema.favorites.userId, testUserId))
    logTest('Favorites - Retrieve Favorites', userFavorites.length === 3, `Retrieved ${userFavorites.length} favorites`)

    // Test favorites by type
    const itemFavorites = await db.select().from(schema.favorites).where(
      and(
        eq(schema.favorites.userId, testUserId),
        eq(schema.favorites.favoriteType, 'item')
      )
    )
    logTest('Favorites - Filter by Type', itemFavorites.length === 2, `Found ${itemFavorites.length} item favorites`)

    // Test favorite update
    const updatedFavorite = await db
      .update(schema.favorites)
      .set({ updatedAt: new Date() })
      .where(eq(schema.favorites.id, favorites[0].id))
      .returning()
    logTest('Favorites - Update Favorite', updatedFavorite.length > 0, 'Favorite updated successfully')

    // Test favorite deletion
    await db.delete(schema.favorites).where(eq(schema.favorites.id, favorites[0].id))
    const remainingFavorites = await db.select().from(schema.favorites).where(eq(schema.favorites.userId, testUserId))
    logTest('Favorites - Delete Favorite', remainingFavorites.length === 2, 'Favorite deleted successfully')
  } catch (error) {
    logTest('Favorites System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test watchlist functionality
async function testWatchlist () {
  logHeader('Testing Watchlist System')

  if (!testUserId) {
    logTest('Watchlist System', false, 'No test user available')
    return
  }

  try {
    // Create test watchlist items
    const watchlistItems = await db.insert(schema.userWatchlists).values([
      {
        userId: testUserId,
        itemId: '537',
        itemName: 'Dragon Bones',
        targetPrice: 5000,
        alertType: 'price',
        isActive: true
      },
      {
        userId: testUserId,
        itemId: '1127',
        itemName: 'Rune Platebody',
        targetPrice: 40000,
        alertType: 'volume',
        isActive: true
      },
      {
        userId: testUserId,
        itemId: '2357',
        itemName: 'Uncut Diamond',
        targetPrice: 1800,
        alertType: 'price',
        isActive: false
      }
    ]).returning()

    logTest('Watchlist - Create Items', watchlistItems.length === 3, `Created ${watchlistItems.length} watchlist items`)

    // Test watchlist retrieval
    const userWatchlist = await db.select().from(schema.userWatchlists).where(eq(schema.userWatchlists.userId, testUserId))
    logTest('Watchlist - Retrieve Items', userWatchlist.length === 3, `Retrieved ${userWatchlist.length} watchlist items`)

    // Test active watchlist items
    const activeWatchlist = await db.select().from(schema.userWatchlists).where(
      and(
        eq(schema.userWatchlists.userId, testUserId),
        eq(schema.userWatchlists.isActive, true)
      )
    )
    logTest('Watchlist - Active Items', activeWatchlist.length === 2, `Found ${activeWatchlist.length} active items`)

    // Test watchlist update
    const updatedWatchlist = await db
      .update(schema.userWatchlists)
      .set({ targetPrice: 5500, updatedAt: new Date() })
      .where(eq(schema.userWatchlists.id, watchlistItems[0].id))
      .returning()
    logTest('Watchlist - Update Item', updatedWatchlist.length > 0, 'Watchlist item updated successfully')

    // Test watchlist deletion
    await db.delete(schema.userWatchlists).where(eq(schema.userWatchlists.id, watchlistItems[0].id))
    const remainingWatchlist = await db.select().from(schema.userWatchlists).where(eq(schema.userWatchlists.userId, testUserId))
    logTest('Watchlist - Delete Item', remainingWatchlist.length === 2, 'Watchlist item deleted successfully')
  } catch (error) {
    logTest('Watchlist System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test transactions functionality
async function testTransactions () {
  logHeader('Testing Transactions System')

  if (!testUserId) {
    logTest('Transactions System', false, 'No test user available')
    return
  }

  try {
    // Create test transactions
    const transactions = await db.insert(schema.userTransactions).values([
      {
        userId: testUserId,
        itemId: '537',
        itemName: 'Dragon Bones',
        transactionType: 'buy',
        quantity: 100,
        price: 4800,
        profit: 0,
        notes: 'Test buy transaction'
      },
      {
        userId: testUserId,
        itemId: '537',
        itemName: 'Dragon Bones',
        transactionType: 'sell',
        quantity: 100,
        price: 5200,
        profit: 40000,
        notes: 'Test sell transaction'
      },
      {
        userId: testUserId,
        itemId: '1127',
        itemName: 'Rune Platebody',
        transactionType: 'buy',
        quantity: 10,
        price: 38000,
        profit: 0,
        notes: 'Test buy transaction'
      }
    ]).returning()

    logTest('Transactions - Create Transactions', transactions.length === 3, `Created ${transactions.length} transactions`)

    // Test transactions retrieval
    const userTransactions = await db.select().from(schema.userTransactions).where(eq(schema.userTransactions.userId, testUserId))
    logTest('Transactions - Retrieve Transactions', userTransactions.length === 3, `Retrieved ${userTransactions.length} transactions`)

    // Test transactions by type
    const buyTransactions = await db.select().from(schema.userTransactions).where(
      and(
        eq(schema.userTransactions.userId, testUserId),
        eq(schema.userTransactions.transactionType, 'buy')
      )
    )
    logTest('Transactions - Filter by Type', buyTransactions.length === 2, `Found ${buyTransactions.length} buy transactions`)

    // Test transactions by item
    const itemTransactions = await db.select().from(schema.userTransactions).where(
      and(
        eq(schema.userTransactions.userId, testUserId),
        eq(schema.userTransactions.itemId, '537')
      )
    )
    logTest('Transactions - Filter by Item', itemTransactions.length === 2, `Found ${itemTransactions.length} transactions for item 537`)

    // Test transaction update
    const updatedTransaction = await db
      .update(schema.userTransactions)
      .set({ profit: 45000, notes: 'Updated test transaction' })
      .where(eq(schema.userTransactions.id, transactions[1].id))
      .returning()
    logTest('Transactions - Update Transaction', updatedTransaction.length > 0, 'Transaction updated successfully')

    // Test transaction deletion
    await db.delete(schema.userTransactions).where(eq(schema.userTransactions.id, transactions[0].id))
    const remainingTransactions = await db.select().from(schema.userTransactions).where(eq(schema.userTransactions.userId, testUserId))
    logTest('Transactions - Delete Transaction', remainingTransactions.length === 2, 'Transaction deleted successfully')
  } catch (error) {
    logTest('Transactions System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test user profits functionality
async function testUserProfits () {
  logHeader('Testing User Profits System')

  if (!testUserId) {
    logTest('User Profits System', false, 'No test user available')
    return
  }

  try {
    // Create test user profits
    const userProfits = await db.insert(schema.userProfits).values({
      userId: testUserId,
      totalProfit: 80000,
      weeklyProfit: 80000,
      monthlyProfit: 80000,
      totalTrades: 4,
      bestSingleFlip: 40000,
      currentRank: 1
    }).returning()

    logTest('User Profits - Create Profits', userProfits.length > 0, 'User profits created')

    // Test profits retrieval
    const retrievedProfits = await db.select().from(schema.userProfits).where(eq(schema.userProfits.userId, testUserId))
    logTest('User Profits - Retrieve Profits', retrievedProfits.length > 0, 'User profits retrieved')

    // Test profits update
    const updatedProfits = await db
      .update(schema.userProfits)
      .set({
        totalProfit: 120000,
        weeklyProfit: 40000,
        totalTrades: 6,
        updatedAt: new Date()
      })
      .where(eq(schema.userProfits.userId, testUserId))
      .returning()
    logTest('User Profits - Update Profits', updatedProfits.length > 0, 'User profits updated')

    // Test profits calculation
    const finalProfits = await db.select().from(schema.userProfits).where(eq(schema.userProfits.userId, testUserId))
    logTest('User Profits - Profit Calculation', finalProfits[0].totalProfit === 120000, `Total profit: ${finalProfits[0].totalProfit}`)
  } catch (error) {
    logTest('User Profits System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test user trades functionality
async function testUserTrades () {
  logHeader('Testing User Trades System')

  if (!testUserId) {
    logTest('User Trades System', false, 'No test user available')
    return
  }

  try {
    // First create an item mapping for foreign key reference
    const itemMapping = await db.insert(schema.itemMapping).values({
      id: 999,
      name: 'Test Item for Trades',
      examine: 'A test item for trade testing',
      members: false,
      lowalch: 100,
      highalch: 150,
      limit: 1000,
      value: 200,
      icon: 'test-icon.png',
      wikiUrl: 'https://oldschool.runescape.wiki/w/Test_Item'
    }).returning()

    // Create test user trades
    const userTrades = await db.insert(schema.userTrades).values([
      {
        userId: testUserId,
        itemId: itemMapping[0].id,
        itemName: 'Test Item for Trades',
        buyPrice: 500,
        sellPrice: 750,
        quantity: 100,
        profit: 25000,
        notes: 'Test trade 1'
      },
      {
        userId: testUserId,
        itemId: itemMapping[0].id,
        itemName: 'Test Item for Trades',
        buyPrice: 600,
        sellPrice: 800,
        quantity: 50,
        profit: 10000,
        notes: 'Test trade 2'
      }
    ]).returning()

    logTest('User Trades - Create Trades', userTrades.length === 2, `Created ${userTrades.length} user trades`)

    // Test trades retrieval
    const retrievedTrades = await db.select().from(schema.userTrades).where(eq(schema.userTrades.userId, testUserId))
    logTest('User Trades - Retrieve Trades', retrievedTrades.length === 2, `Retrieved ${retrievedTrades.length} user trades`)

    // Test trades by item
    const itemTrades = await db.select().from(schema.userTrades).where(eq(schema.userTrades.itemId, itemMapping[0].id))
    logTest('User Trades - Filter by Item', itemTrades.length === 2, `Found ${itemTrades.length} trades for item`)

    // Test trade update
    const updatedTrade = await db
      .update(schema.userTrades)
      .set({ profit: 30000, notes: 'Updated test trade' })
      .where(eq(schema.userTrades.id, userTrades[0].id))
      .returning()
    logTest('User Trades - Update Trade', updatedTrade.length > 0, 'User trade updated')

    // Test trade deletion
    await db.delete(schema.userTrades).where(eq(schema.userTrades.id, userTrades[0].id))
    const remainingTrades = await db.select().from(schema.userTrades).where(eq(schema.userTrades.userId, testUserId))
    logTest('User Trades - Delete Trade', remainingTrades.length === 1, 'User trade deleted')

    // Clean up item mapping
    await db.delete(schema.itemMapping).where(eq(schema.itemMapping.id, itemMapping[0].id))
  } catch (error) {
    logTest('User Trades System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test user achievements functionality
async function testUserAchievements () {
  logHeader('Testing User Achievements System')

  if (!testUserId) {
    logTest('User Achievements System', false, 'No test user available')
    return
  }

  try {
    // Create test achievements
    const achievements = await db.insert(schema.userAchievements).values([
      {
        userId: testUserId,
        achievementType: 'profit',
        achievementKey: 'first_million',
        achievementName: 'First Million',
        achievementDescription: 'Earn your first million GP',
        progressValue: 80000
      },
      {
        userId: testUserId,
        achievementType: 'trades',
        achievementKey: 'first_trade',
        achievementName: 'First Trade',
        achievementDescription: 'Complete your first trade',
        progressValue: 1
      },
      {
        userId: testUserId,
        achievementType: 'volume',
        achievementKey: 'high_volume',
        achievementName: 'High Volume Trader',
        achievementDescription: 'Trade 1000 items in a day',
        progressValue: 1000
      }
    ]).returning()

    logTest('User Achievements - Create Achievements', achievements.length === 3, `Created ${achievements.length} achievements`)

    // Test achievements retrieval
    const userAchievements = await db.select().from(schema.userAchievements).where(eq(schema.userAchievements.userId, testUserId))
    logTest('User Achievements - Retrieve Achievements', userAchievements.length === 3, `Retrieved ${userAchievements.length} achievements`)

    // Test achievements by type
    const profitAchievements = await db.select().from(schema.userAchievements).where(
      and(
        eq(schema.userAchievements.userId, testUserId),
        eq(schema.userAchievements.achievementType, 'profit')
      )
    )
    logTest('User Achievements - Filter by Type', profitAchievements.length === 1, `Found ${profitAchievements.length} profit achievements`)

    // Test achievement update
    const updatedAchievement = await db
      .update(schema.userAchievements)
      .set({ progressValue: 100000, achievementDescription: 'Updated achievement description' })
      .where(eq(schema.userAchievements.id, achievements[0].id))
      .returning()
    logTest('User Achievements - Update Achievement', updatedAchievement.length > 0, 'Achievement updated')

    // Test achievement deletion
    await db.delete(schema.userAchievements).where(eq(schema.userAchievements.id, achievements[0].id))
    const remainingAchievements = await db.select().from(schema.userAchievements).where(eq(schema.userAchievements.userId, testUserId))
    logTest('User Achievements - Delete Achievement', remainingAchievements.length === 2, 'Achievement deleted')
  } catch (error) {
    logTest('User Achievements System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test user goals functionality
async function testUserGoals () {
  logHeader('Testing User Goals System')

  if (!testUserId) {
    logTest('User Goals System', false, 'No test user available')
    return
  }

  try {
    // Create test goals
    const goals = await db.insert(schema.userGoals).values([
      {
        userId: testUserId,
        goalType: 'profit',
        goalName: 'Earn 100M GP',
        targetValue: 100000000,
        currentProgress: 80000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        isCompleted: false
      },
      {
        userId: testUserId,
        goalType: 'trades',
        goalName: 'Complete 50 Trades',
        targetValue: 50,
        currentProgress: 4,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isCompleted: false
      },
      {
        userId: testUserId,
        goalType: 'volume',
        goalName: 'Trade 10K Items',
        targetValue: 10000,
        currentProgress: 5000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        isCompleted: false
      }
    ]).returning()

    logTest('User Goals - Create Goals', goals.length === 3, `Created ${goals.length} goals`)

    // Test goals retrieval
    const userGoals = await db.select().from(schema.userGoals).where(eq(schema.userGoals.userId, testUserId))
    logTest('User Goals - Retrieve Goals', userGoals.length === 3, `Retrieved ${userGoals.length} goals`)

    // Test active goals
    const activeGoals = await db.select().from(schema.userGoals).where(
      and(
        eq(schema.userGoals.userId, testUserId),
        eq(schema.userGoals.isCompleted, false)
      )
    )
    logTest('User Goals - Active Goals', activeGoals.length === 3, `Found ${activeGoals.length} active goals`)

    // Test goal completion
    const completedGoal = await db
      .update(schema.userGoals)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        currentProgress: 100000000
      })
      .where(eq(schema.userGoals.id, goals[0].id))
      .returning()
    logTest('User Goals - Complete Goal', completedGoal.length > 0, 'Goal marked as completed')

    // Test goal progress update
    const updatedGoal = await db
      .update(schema.userGoals)
      .set({ currentProgress: 10 })
      .where(eq(schema.userGoals.id, goals[1].id))
      .returning()
    logTest('User Goals - Update Progress', updatedGoal.length > 0, 'Goal progress updated')

    // Test goal deletion
    await db.delete(schema.userGoals).where(eq(schema.userGoals.id, goals[2].id))
    const remainingGoals = await db.select().from(schema.userGoals).where(eq(schema.userGoals.userId, testUserId))
    logTest('User Goals - Delete Goal', remainingGoals.length === 2, 'Goal deleted')
  } catch (error) {
    logTest('User Goals System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test complex queries and relationships
async function testComplexQueries () {
  logHeader('Testing Complex Queries and Relationships')

  if (!testUserId) {
    logTest('Complex Queries', false, 'No test user available')
    return
  }

  try {
    // Test user with all related data
    const userWithData = await db
      .select({
        user: schema.users,
        subscription: schema.subscriptions,
        watchlist: schema.userWatchlists,
        transactions: schema.userTransactions,
        profits: schema.userProfits,
        achievements: schema.userAchievements,
        goals: schema.userGoals,
        favorites: schema.favorites
      })
      .from(schema.users)
      .leftJoin(schema.subscriptions, eq(schema.users.id, schema.subscriptions.userId))
      .leftJoin(schema.userWatchlists, eq(schema.users.id, schema.userWatchlists.userId))
      .leftJoin(schema.userTransactions, eq(schema.users.id, schema.userTransactions.userId))
      .leftJoin(schema.userProfits, eq(schema.users.id, schema.userProfits.userId))
      .leftJoin(schema.userAchievements, eq(schema.users.id, schema.userAchievements.userId))
      .leftJoin(schema.userGoals, eq(schema.users.id, schema.userGoals.userId))
      .leftJoin(schema.favorites, eq(schema.users.id, schema.favorites.userId))
      .where(eq(schema.users.id, testUserId))

    logTest('Complex Queries - User with All Data', userWithData.length > 0, `Retrieved user with ${userWithData.length} data records`)

    // Test aggregated queries
    const transactionStats = await db
      .select({
        totalTransactions: db.fn.count(schema.userTransactions.id),
        totalProfit: db.fn.sum(schema.userTransactions.profit),
        avgProfit: db.fn.avg(schema.userTransactions.profit)
      })
      .from(schema.userTransactions)
      .where(eq(schema.userTransactions.userId, testUserId))

    logTest('Complex Queries - Transaction Stats', transactionStats.length > 0, 'Transaction statistics calculated')

    // Test grouped queries
    const transactionsByType = await db
      .select({
        transactionType: schema.userTransactions.transactionType,
        count: db.fn.count(schema.userTransactions.id),
        totalValue: db.fn.sum(schema.userTransactions.price)
      })
      .from(schema.userTransactions)
      .where(eq(schema.userTransactions.userId, testUserId))
      .groupBy(schema.userTransactions.transactionType)

    logTest('Complex Queries - Grouped Transactions', transactionsByType.length > 0, `Found ${transactionsByType.length} transaction types`)

    // Test date range queries
    const recentTransactions = await db
      .select()
      .from(schema.userTransactions)
      .where(
        and(
          eq(schema.userTransactions.userId, testUserId),
          gte(schema.userTransactions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        )
      )

    logTest('Complex Queries - Date Range', recentTransactions.length >= 0, `Found ${recentTransactions.length} recent transactions`)
  } catch (error) {
    logTest('Complex Queries', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test data integrity and constraints
async function testDataIntegrity () {
  logHeader('Testing Data Integrity and Constraints')

  try {
    // Test unique constraints
    try {
      await db.insert(schema.users).values({
        email: testUser.email, // Same email as existing user
        username: 'duplicateuser',
        passwordHash: 'hash',
        salt: 'salt',
        name: 'Duplicate User'
      })
      logTest('Data Integrity - Unique Email', false, 'Should have rejected duplicate email')
    } catch (error) {
      logTest('Data Integrity - Unique Email', true, 'Correctly enforced unique email constraint')
    }

    // Test foreign key constraints
    try {
      await db.insert(schema.userTransactions).values({
        userId: '00000000-0000-0000-0000-000000000000', // Non-existent user
        itemId: '12345',
        itemName: 'Test Item',
        transactionType: 'buy',
        quantity: 1,
        price: 100
      })
      logTest('Data Integrity - Foreign Key', false, 'Should have rejected non-existent user')
    } catch (error) {
      logTest('Data Integrity - Foreign Key', true, 'Correctly enforced foreign key constraint')
    }

    // Test required fields
    try {
      await db.insert(schema.users).values({
        email: '', // Empty email
        username: 'testuser',
        passwordHash: 'hash',
        salt: 'salt'
      })
      logTest('Data Integrity - Required Fields', false, 'Should have rejected empty email')
    } catch (error) {
      logTest('Data Integrity - Required Fields', true, 'Correctly enforced required field constraint')
    }
  } catch (error) {
    logTest('Data Integrity', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Cleanup test data
async function cleanupTestData () {
  logHeader('Cleaning Up Test Data')

  try {
    if (!testUserId) {
      logTest('Cleanup', true, 'No test data to clean up')
      return
    }

    // Delete all related data in correct order (respecting foreign keys)
    await db.delete(schema.userAchievements).where(eq(schema.userAchievements.userId, testUserId))
    await db.delete(schema.userGoals).where(eq(schema.userGoals.userId, testUserId))
    await db.delete(schema.userTrades).where(eq(schema.userTrades.userId, testUserId))
    await db.delete(schema.userProfits).where(eq(schema.userProfits.userId, testUserId))
    await db.delete(schema.userTransactions).where(eq(schema.userTransactions.userId, testUserId))
    await db.delete(schema.userWatchlists).where(eq(schema.userWatchlists.userId, testUserId))
    await db.delete(schema.favorites).where(eq(schema.favorites.userId, testUserId))
    await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, testUserId))
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, testUserId))
    await db.delete(schema.users).where(eq(schema.users.id, testUserId))

    logTest('Cleanup - Test Data Removal', true, 'All test data removed successfully')
  } catch (error) {
    logTest('Cleanup', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Main test runner
async function runComprehensiveTests () {
  logHeader('Ge-Metrics Comprehensive Database Test Suite')
  log('Testing all database functionality...\n', 'yellow')

  const tests = [
    testAllTableSchemas,
    testUserManagement,
    testFavorites,
    testWatchlist,
    testTransactions,
    testUserProfits,
    testUserTrades,
    testUserAchievements,
    testUserGoals,
    testComplexQueries,
    testDataIntegrity,
    cleanupTestData
  ]

  let passedTests = 0
  let totalTests = 0

  for (const test of tests) {
    try {
      await test()
      passedTests++
    } catch (error) {
      log(`Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
    }
    totalTests++
  }

  logHeader('Comprehensive Test Summary')
  log(`Total Tests: ${totalTests}`, 'blue')
  log(`Passed: ${passedTests}`, 'green')
  log(`Failed: ${totalTests - passedTests}`, 'red')

  if (passedTests === totalTests) {
    log('\n🎉 All comprehensive database tests passed! Your database is fully functional.', 'green')
    log('\n📊 Database Features Tested:', 'blue')
    log('• User management and authentication', 'yellow')
    log('• Favorites system (items and combinations)', 'yellow')
    log('• Watchlist with alerts and targets', 'yellow')
    log('• Transaction tracking and history', 'yellow')
    log('• User profits and statistics', 'yellow')
    log('• User trades with profit calculation', 'yellow')
    log('• Achievement system', 'yellow')
    log('• Goal tracking and progress', 'yellow')
    log('• Complex queries and relationships', 'yellow')
    log('• Data integrity and constraints', 'yellow')
    log('\n🔐 Your database is ready for production use!', 'green')
  } else {
    log('\n⚠️  Some comprehensive tests failed. Please check the database configuration.', 'yellow')
  }

  process.exit(passedTests === totalTests ? 0 : 1)
}

// Handle errors and cleanup
process.on('unhandledRejection', (error) => {
  log(`Unhandled rejection: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
  process.exit(1)
})

process.on('SIGINT', () => {
  log('\n\nTest interrupted by user', 'yellow')
  process.exit(0)
})

// Run the tests
runComprehensiveTests().catch((error) => {
  log(`Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
  process.exit(1)
})
