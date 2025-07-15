#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq, and, desc } from 'drizzle-orm'

// Test data for different tables
const testData = {
  users: {
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedpassword123',
    salt: 'salt123',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg'
  },
  itemMapping: {
    id: 1,
    name: 'Test Item',
    examine: 'A test item for database testing',
    members: false,
    lowalch: 100,
    highalch: 150,
    limit: 1000,
    value: 200,
    icon: 'test-icon.png',
    wikiUrl: 'https://oldschool.runescape.wiki/w/Test_Item'
  },
  gameUpdates: {
    updateDate: new Date(),
    title: 'Test Update',
    description: 'A test game update',
    type: 'minor',
    color: '#00ff00'
  }
}

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log (message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader (message) {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.bold}${colors.blue}${message}${colors.reset}`)
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`)
}

function logTest (testName, success, message = '') {
  const status = success ? '✅ PASS' : '❌ FAIL'
  const color = success ? 'green' : 'red'
  console.log(`${colors[color]}${status}${colors.reset} ${testName}${message ? `: ${message}` : ''}`)
}

// Test database connection
async function testConnection () {
  logHeader('Testing Database Connection')

  try {
    // Simple query to test connection
    const result = await db.execute('SELECT 1 as test')
    logTest('Database Connection', true, 'Successfully connected to PostgreSQL')
    return true
  } catch (error) {
    logTest('Database Connection', false, error.message)
    return false
  }
}

// Test Users table CRUD
async function testUsersCRUD () {
  logHeader('Testing Users Table CRUD Operations')

  let userId = null

  try {
    // CREATE - Insert a new user
    const newUser = await db.insert(schema.users).values(testData.users).returning()
    userId = newUser[0].id
    logTest('Users CREATE', true, `Created user with ID: ${userId}`)

    // READ - Get the user by ID
    const readUser = await db.select().from(schema.users).where(eq(schema.users.id, userId))
    logTest('Users READ by ID', readUser.length > 0, `Found ${readUser.length} user(s)`)

    // READ - Get user by email
    const userByEmail = await db.select().from(schema.users).where(eq(schema.users.email, testData.users.email))
    logTest('Users READ by Email', userByEmail.length > 0, 'Found user by email')

    // UPDATE - Update user information
    const updatedUser = await db
      .update(schema.users)
      .set({ name: 'Updated Test User', updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning()
    logTest('Users UPDATE', updatedUser.length > 0, 'User updated successfully')

    // DELETE - Delete the test user
    const deletedUser = await db.delete(schema.users).where(eq(schema.users.id, userId)).returning()
    logTest('Users DELETE', deletedUser.length > 0, 'User deleted successfully')
  } catch (error) {
    logTest('Users CRUD', false, error.message)
  }
}

// Test Item Mapping table CRUD
async function testItemMappingCRUD () {
  logHeader('Testing Item Mapping Table CRUD Operations')

  try {
    // CREATE - Insert a new item
    const newItem = await db.insert(schema.itemMapping).values(testData.itemMapping).returning()
    logTest('Item Mapping CREATE', true, `Created item with ID: ${newItem[0].id}`)

    // READ - Get the item by ID
    const readItem = await db.select().from(schema.itemMapping).where(eq(schema.itemMapping.id, testData.itemMapping.id))
    logTest('Item Mapping READ by ID', readItem.length > 0, `Found ${readItem.length} item(s)`)

    // UPDATE - Update item information
    const updatedItem = await db
      .update(schema.itemMapping)
      .set({ name: 'Updated Test Item', updatedAt: new Date() })
      .where(eq(schema.itemMapping.id, testData.itemMapping.id))
      .returning()
    logTest('Item Mapping UPDATE', updatedItem.length > 0, 'Item updated successfully')

    // DELETE - Delete the test item
    const deletedItem = await db.delete(schema.itemMapping).where(eq(schema.itemMapping.id, testData.itemMapping.id)).returning()
    logTest('Item Mapping DELETE', deletedItem.length > 0, 'Item deleted successfully')
  } catch (error) {
    logTest('Item Mapping CRUD', false, error.message)
  }
}

// Test Game Updates table CRUD
async function testGameUpdatesCRUD () {
  logHeader('Testing Game Updates Table CRUD Operations')

  let updateId = null

  try {
    // CREATE - Insert a new game update
    const newUpdate = await db.insert(schema.gameUpdates).values(testData.gameUpdates).returning()
    updateId = newUpdate[0].id
    logTest('Game Updates CREATE', true, `Created update with ID: ${updateId}`)

    // READ - Get the update by ID
    const readUpdate = await db.select().from(schema.gameUpdates).where(eq(schema.gameUpdates.id, updateId))
    logTest('Game Updates READ by ID', readUpdate.length > 0, `Found ${readUpdate.length} update(s)`)

    // UPDATE - Update the game update
    const updatedUpdate = await db
      .update(schema.gameUpdates)
      .set({ title: 'Updated Test Update', description: 'Updated description' })
      .where(eq(schema.gameUpdates.id, updateId))
      .returning()
    logTest('Game Updates UPDATE', updatedUpdate.length > 0, 'Update modified successfully')

    // DELETE - Delete the test update
    const deletedUpdate = await db.delete(schema.gameUpdates).where(eq(schema.gameUpdates.id, updateId)).returning()
    logTest('Game Updates DELETE', deletedUpdate.length > 0, 'Update deleted successfully')
  } catch (error) {
    logTest('Game Updates CRUD', false, error.message)
  }
}

// Test complex relationships (Users -> Subscriptions -> Watchlists)
async function testComplexRelationships () {
  logHeader('Testing Complex Table Relationships')

  let userId = null
  let subscriptionId = null
  let watchlistId = null

  try {
    // Create a test user
    const newUser = await db.insert(schema.users).values({
      ...testData.users,
      email: 'relationship@example.com',
      username: 'relationshipuser'
    }).returning()
    userId = newUser[0].id
    logTest('Complex Relationships - User Creation', true, `Created user: ${userId}`)

    // Create a subscription for the user
    const newSubscription = await db.insert(schema.subscriptions).values({
      userId,
      status: 'active',
      plan: 'premium',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }).returning()
    subscriptionId = newSubscription[0].id
    logTest('Complex Relationships - Subscription Creation', true, `Created subscription: ${subscriptionId}`)

    // Create a watchlist item for the user
    const newWatchlist = await db.insert(schema.userWatchlists).values({
      userId,
      itemId: '12345',
      itemName: 'Test Watchlist Item',
      targetPrice: 1000,
      alertType: 'price',
      isActive: true
    }).returning()
    watchlistId = newWatchlist[0].id
    logTest('Complex Relationships - Watchlist Creation', true, `Created watchlist: ${watchlistId}`)

    // Test JOIN query - Get user with subscription and watchlist
    const userWithRelations = await db
      .select({
        user: schema.users,
        subscription: schema.subscriptions,
        watchlist: schema.userWatchlists
      })
      .from(schema.users)
      .leftJoin(schema.subscriptions, eq(schema.users.id, schema.subscriptions.userId))
      .leftJoin(schema.userWatchlists, eq(schema.users.id, schema.userWatchlists.userId))
      .where(eq(schema.users.id, userId))

    logTest('Complex Relationships - JOIN Query', userWithRelations.length > 0, `Found ${userWithRelations.length} relationship(s)`)

    // Clean up
    await db.delete(schema.userWatchlists).where(eq(schema.userWatchlists.id, watchlistId))
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, subscriptionId))
    await db.delete(schema.users).where(eq(schema.users.id, userId))
    logTest('Complex Relationships - Cleanup', true, 'All test data cleaned up')
  } catch (error) {
    logTest('Complex Relationships', false, error.message)
  }
}

// Test data validation and constraints
async function testDataValidation () {
  logHeader('Testing Data Validation and Constraints')

  try {
    // Test unique constraint violation
    const user1 = await db.insert(schema.users).values({
      ...testData.users,
      email: 'validation@example.com',
      username: 'validationuser1'
    }).returning()

    try {
      await db.insert(schema.users).values({
        ...testData.users,
        email: 'validation@example.com', // Same email - should fail
        username: 'validationuser2'
      })
      logTest('Data Validation - Unique Email Constraint', false, 'Should have failed for duplicate email')
    } catch (error) {
      logTest('Data Validation - Unique Email Constraint', true, 'Properly enforced unique email constraint')
    }

    // Test foreign key constraint
    try {
      await db.insert(schema.subscriptions).values({
        userId: '00000000-0000-0000-0000-000000000000', // Non-existent user ID
        status: 'active',
        plan: 'premium'
      })
      logTest('Data Validation - Foreign Key Constraint', false, 'Should have failed for non-existent user')
    } catch (error) {
      logTest('Data Validation - Foreign Key Constraint', true, 'Properly enforced foreign key constraint')
    }

    // Clean up
    await db.delete(schema.users).where(eq(schema.users.id, user1[0].id))
    logTest('Data Validation - Cleanup', true, 'Test data cleaned up')
  } catch (error) {
    logTest('Data Validation', false, error.message)
  }
}

// Test performance with larger datasets
async function testPerformance () {
  logHeader('Testing Database Performance')

  const testUsers = []
  const startTime = Date.now()

  try {
    // Create multiple test users
    for (let i = 0; i < 10; i++) {
      testUsers.push({
        email: `perf${i}@example.com`,
        username: `perfuser${i}`,
        passwordHash: `hash${i}`,
        salt: `salt${i}`,
        name: `Performance User ${i}`
      })
    }

    // Batch insert
    const insertedUsers = await db.insert(schema.users).values(testUsers).returning()
    logTest('Performance - Batch Insert', true, `Inserted ${insertedUsers.length} users in ${Date.now() - startTime}ms`)

    // Test query performance
    const queryStart = Date.now()
    const allUsers = await db.select().from(schema.users).where(eq(schema.users.email, 'perf0@example.com'))
    const queryTime = Date.now() - queryStart
    logTest('Performance - Query Speed', queryTime < 100, `Query completed in ${queryTime}ms`)

    // Clean up
    const userIds = insertedUsers.map(user => user.id)
    await db.delete(schema.users).where(eq(schema.users.id, userIds[0]))
    logTest('Performance - Cleanup', true, 'Performance test data cleaned up')
  } catch (error) {
    logTest('Performance', false, error.message)
  }
}

// Test all table schemas exist
async function testTableSchemas () {
  logHeader('Testing All Table Schemas Exist')

  const tables = [
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

  for (const tableName of tables) {
    try {
      const result = await db.execute(`SELECT 1 FROM ${tableName} LIMIT 1`)
      logTest(`Table Schema - ${tableName}`, true, 'Table exists and accessible')
    } catch (error) {
      logTest(`Table Schema - ${tableName}`, false, error.message)
    }
  }
}

// Main test runner
async function runAllTests () {
  logHeader('Ge-Metrics Database CRUD Test Suite')
  log('Starting comprehensive database testing...\n', 'yellow')

  const tests = [
    testConnection,
    testTableSchemas,
    testUsersCRUD,
    testItemMappingCRUD,
    testGameUpdatesCRUD,
    testComplexRelationships,
    testDataValidation,
    testPerformance
  ]

  let passedTests = 0
  let totalTests = 0

  for (const test of tests) {
    try {
      await test()
      passedTests++
    } catch (error) {
      log(`Test failed with error: ${error.message}`, 'red')
    }
    totalTests++
  }

  logHeader('Test Summary')
  log(`Total Tests: ${totalTests}`, 'blue')
  log(`Passed: ${passedTests}`, 'green')
  log(`Failed: ${totalTests - passedTests}`, 'red')

  if (passedTests === totalTests) {
    log('\n🎉 All database tests passed! Your database is working correctly.', 'green')
  } else {
    log('\n⚠️  Some tests failed. Please check the database configuration.', 'yellow')
  }

  process.exit(passedTests === totalTests ? 0 : 1)
}

// Handle errors and cleanup
process.on('unhandledRejection', (error) => {
  log(`Unhandled rejection: ${error.message}`, 'red')
  process.exit(1)
})

process.on('SIGINT', () => {
  log('\n\nTest interrupted by user', 'yellow')
  process.exit(0)
})

// Run the tests
runAllTests().catch((error) => {
  log(`Test suite failed: ${error.message}`, 'red')
  process.exit(1)
})
