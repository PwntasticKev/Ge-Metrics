import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  users,
  refreshTokens,
  subscriptions,
  userWatchlists,
  userTransactions
} from './src/db/schema.js'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Import eq for where clauses
import { eq } from 'drizzle-orm'

// Database connection - Use environment variables in production
const connectionString = process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/auth_db'
const client = postgres(connectionString)
const db = drizzle(client)

async function testDatabaseConnection () {
  console.log('🔍 Testing database connection...')

  try {
    // Test basic connection
    const result = await client`SELECT version()`
    console.log('✅ Database connection successful')
    console.log('📊 PostgreSQL version:', result[0].version)
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

async function testTableCreation () {
  console.log('\n📋 Testing table creation...')

  try {
    // Test if tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    console.log('✅ Tables found:', tables.map(t => t.table_name))
    return tables.length > 0
  } catch (error) {
    console.error('❌ Table check failed:', error.message)
    return false
  }
}

async function testUserOperations () {
  console.log('\n👤 Testing user operations...')

  try {
    // Create test user
    const testUser = {
      id: uuidv4(),
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('testpassword', 10),
      salt: 'testsalt',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    }

    // Insert user
    await db.insert(users).values(testUser)
    console.log('✅ User created successfully')

    // Query user
    const foundUser = await db.select().from(users).where(eq(users.email, 'test@example.com'))
    console.log('✅ User retrieved successfully:', foundUser[0].email)

    // Clean up
    await db.delete(users).where(eq(users.email, 'test@example.com'))
    console.log('✅ User deleted successfully')

    return true
  } catch (error) {
    console.error('❌ User operations failed:', error.message)
    return false
  }
}

async function testWatchlistOperations () {
  console.log('\n📊 Testing watchlist operations...')

  try {
    // Create test user first
    const testUser = {
      id: uuidv4(),
      email: 'watchlist@example.com',
      passwordHash: await bcrypt.hash('testpassword', 10),
      salt: 'testsalt',
      name: 'Watchlist User'
    }

    await db.insert(users).values(testUser)

    // Create watchlist item
    const watchlistItem = {
      id: uuidv4(),
      userId: testUser.id,
      itemId: '12345',
      itemName: 'Test Item',
      targetPrice: 1000,
      alertType: 'price',
      isActive: true
    }

    await db.insert(userWatchlists).values(watchlistItem)
    console.log('✅ Watchlist item created successfully')

    // Query watchlist
    const foundItems = await db.select().from(userWatchlists).where(eq(userWatchlists.userId, testUser.id))
    console.log('✅ Watchlist items retrieved:', foundItems.length)

    // Clean up
    await db.delete(userWatchlists).where(eq(userWatchlists.userId, testUser.id))
    await db.delete(users).where(eq(users.id, testUser.id))
    console.log('✅ Watchlist test data cleaned up')

    return true
  } catch (error) {
    console.error('❌ Watchlist operations failed:', error.message)
    return false
  }
}

async function testTransactionOperations () {
  console.log('\n💰 Testing transaction operations...')

  try {
    // Create test user first
    const testUser = {
      id: uuidv4(),
      email: 'transaction@example.com',
      passwordHash: await bcrypt.hash('testpassword', 10),
      salt: 'testsalt',
      name: 'Transaction User'
    }

    await db.insert(users).values(testUser)

    // Create transaction
    const transaction = {
      id: uuidv4(),
      userId: testUser.id,
      itemId: '67890',
      itemName: 'Test Item',
      transactionType: 'buy',
      quantity: 100,
      price: 500,
      profit: 0,
      notes: 'Test transaction'
    }

    await db.insert(userTransactions).values(transaction)
    console.log('✅ Transaction created successfully')

    // Query transactions
    const foundTransactions = await db.select().from(userTransactions).where(eq(userTransactions.userId, testUser.id))
    console.log('✅ Transactions retrieved:', foundTransactions.length)

    // Clean up
    await db.delete(userTransactions).where(eq(userTransactions.userId, testUser.id))
    await db.delete(users).where(eq(users.id, testUser.id))
    console.log('✅ Transaction test data cleaned up')

    return true
  } catch (error) {
    console.error('❌ Transaction operations failed:', error.message)
    return false
  }
}

async function runAllTests () {
  console.log('🧪 Running comprehensive database tests...\n')

  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Table Creation', fn: testTableCreation },
    { name: 'User Operations', fn: testUserOperations },
    { name: 'Watchlist Operations', fn: testWatchlistOperations },
    { name: 'Transaction Operations', fn: testTransactionOperations }
  ]

  let passed = 0
  const total = tests.length

  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) passed++
    } catch (error) {
      console.error(`❌ ${test.name} failed with error:`, error.message)
    }
  }

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`)

  if (passed === total) {
    console.log('🎉 All tests passed! Your database is ready for Postico 2.')
  } else {
    console.log('⚠️  Some tests failed. Please check your database setup.')
  }

  await client.end()
}

// Run tests
runAllTests().catch(console.error)
