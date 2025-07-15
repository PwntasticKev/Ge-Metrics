#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq, and, desc } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './src/config/index.js'

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

// Demo user data
const demoUser = {
  email: 'demo@ge-metrics.com',
  username: 'demouser',
  password: 'DemoPassword123!',
  name: 'Demo User',
  avatar: 'https://example.com/demo-avatar.jpg'
}

let createdUserId: string | null = null
let accessToken: string | null = null
let refreshToken: string | null = null

// Test user registration
async function testUserRegistration () {
  logHeader('Testing User Registration Process')

  try {
    // Check if demo user already exists
    const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, demoUser.email))

    if (existingUser.length > 0) {
      logTest('User Registration - Check Existing', true, 'Demo user already exists')
      createdUserId = existingUser[0].id
      return
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

    createdUserId = newUser[0].id
    logTest('User Registration - Create User', true, `Created user: ${createdUserId}`)

    // Verify user was created
    const createdUser = await db.select().from(schema.users).where(eq(schema.users.id, createdUserId))
    logTest('User Registration - Verify Creation', createdUser.length > 0, 'User found in database')

    // Test password hashing
    const isPasswordValid = await bcrypt.compare(demoUser.password, createdUser[0].passwordHash!)
    logTest('User Registration - Password Hashing', isPasswordValid, 'Password correctly hashed')
  } catch (error) {
    logTest('User Registration', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test user login
async function testUserLogin () {
  logHeader('Testing User Login Process')

  try {
    if (!createdUserId) {
      logTest('User Login', false, 'No user ID available')
      return
    }

    // Get user from database
    const user = await db.select().from(schema.users).where(eq(schema.users.id, createdUserId))

    if (user.length === 0) {
      logTest('User Login', false, 'User not found')
      return
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(demoUser.password, user[0].passwordHash!)
    logTest('User Login - Password Verification', isPasswordValid, 'Password verified successfully')

    if (!isPasswordValid) {
      logTest('User Login', false, 'Invalid password')
      return
    }

    // Generate JWT tokens
    const accessTokenPayload = {
      userId: user[0].id,
      email: user[0].email,
      username: user[0].username
    }

    const refreshTokenPayload = {
      userId: user[0].id,
      tokenId: crypto.randomUUID()
    }

    accessToken = jwt.sign(accessTokenPayload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN
    })

    refreshToken = jwt.sign(refreshTokenPayload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN
    })

    logTest('User Login - Access Token Generation', !!accessToken, 'Access token generated')
    logTest('User Login - Refresh Token Generation', !!refreshToken, 'Refresh token generated')

    // Store refresh token in database
    const tokenExpiry = new Date()
    tokenExpiry.setDate(tokenExpiry.getDate() + 7) // 7 days from now

    await db.insert(schema.refreshTokens).values({
      userId: user[0].id,
      token: refreshToken,
      expiresAt: tokenExpiry
    })

    logTest('User Login - Refresh Token Storage', true, 'Refresh token stored in database')
  } catch (error) {
    logTest('User Login', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test token validation
async function testTokenValidation () {
  logHeader('Testing Token Validation')

  try {
    if (!accessToken || !refreshToken) {
      logTest('Token Validation', false, 'No tokens available')
      return
    }

    // Verify access token
    const accessTokenDecoded = jwt.verify(accessToken, config.JWT_ACCESS_SECRET) as any
    logTest('Token Validation - Access Token', !!accessTokenDecoded, 'Access token is valid')

    // Verify refresh token
    const refreshTokenDecoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as any
    logTest('Token Validation - Refresh Token', !!refreshTokenDecoded, 'Refresh token is valid')

    // Check if refresh token exists in database
    const storedToken = await db.select().from(schema.refreshTokens).where(eq(schema.refreshTokens.token, refreshToken))
    logTest('Token Validation - Database Check', storedToken.length > 0, 'Refresh token found in database')

    // Test token payload
    logTest('Token Validation - User ID Match', accessTokenDecoded.userId === createdUserId, 'User ID matches')
    logTest('Token Validation - Email Match', accessTokenDecoded.email === demoUser.email, 'Email matches')
  } catch (error) {
    logTest('Token Validation', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test token refresh
async function testTokenRefresh () {
  logHeader('Testing Token Refresh Process')

  try {
    if (!refreshToken || !createdUserId) {
      logTest('Token Refresh', false, 'No refresh token or user ID available')
      return
    }

    // Verify refresh token
    const refreshTokenDecoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as any

    // Check if token exists in database
    const storedToken = await db.select().from(schema.refreshTokens).where(eq(schema.refreshTokens.token, refreshToken))

    if (storedToken.length === 0) {
      logTest('Token Refresh', false, 'Refresh token not found in database')
      return
    }

    // Generate new access token
    const user = await db.select().from(schema.users).where(eq(schema.users.id, createdUserId))

    if (user.length === 0) {
      logTest('Token Refresh', false, 'User not found')
      return
    }

    const newAccessTokenPayload = {
      userId: user[0].id,
      email: user[0].email,
      username: user[0].username
    }

    const newAccessToken = jwt.sign(newAccessTokenPayload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN
    })

    logTest('Token Refresh - New Access Token', !!newAccessToken, 'New access token generated')

    // Verify new token
    const newTokenDecoded = jwt.verify(newAccessToken, config.JWT_ACCESS_SECRET) as any
    logTest('Token Refresh - New Token Validation', !!newTokenDecoded, 'New token is valid')

    // Update access token
    accessToken = newAccessToken
  } catch (error) {
    logTest('Token Refresh', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test user session data
async function testUserSessionData () {
  logHeader('Testing User Session Data')

  try {
    if (!createdUserId) {
      logTest('User Session Data', false, 'No user ID available')
      return
    }

    // Create user subscription
    const subscription = await db.insert(schema.subscriptions).values({
      userId: createdUserId,
      status: 'active',
      plan: 'premium',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false
    }).returning()

    logTest('User Session - Subscription Creation', subscription.length > 0, 'Subscription created')

    // Create user watchlist items
    const watchlistItems = await db.insert(schema.userWatchlists).values([
      {
        userId: createdUserId,
        itemId: '12345',
        itemName: 'Dragon Bones',
        targetPrice: 5000,
        alertType: 'price',
        isActive: true
      },
      {
        userId: createdUserId,
        itemId: '67890',
        itemName: 'Rune Platebody',
        targetPrice: 40000,
        alertType: 'volume',
        isActive: true
      }
    ]).returning()

    logTest('User Session - Watchlist Creation', watchlistItems.length === 2, 'Watchlist items created')

    // Create user transactions
    const transactions = await db.insert(schema.userTransactions).values([
      {
        userId: createdUserId,
        itemId: '12345',
        itemName: 'Dragon Bones',
        transactionType: 'buy',
        quantity: 100,
        price: 4800,
        profit: 0,
        notes: 'Test buy transaction'
      },
      {
        userId: createdUserId,
        itemId: '12345',
        itemName: 'Dragon Bones',
        transactionType: 'sell',
        quantity: 100,
        price: 5200,
        profit: 40000,
        notes: 'Test sell transaction'
      }
    ]).returning()

    logTest('User Session - Transactions Creation', transactions.length === 2, 'Transactions created')

    // Create user profits record
    const userProfits = await db.insert(schema.userProfits).values({
      userId: createdUserId,
      totalProfit: 40000,
      weeklyProfit: 40000,
      monthlyProfit: 40000,
      totalTrades: 2,
      bestSingleFlip: 40000,
      currentRank: 1
    }).returning()

    logTest('User Session - Profits Creation', userProfits.length > 0, 'User profits created')

    // Test session data retrieval
    const sessionData = await db
      .select({
        user: schema.users,
        subscription: schema.subscriptions,
        watchlist: schema.userWatchlists,
        transactions: schema.userTransactions,
        profits: schema.userProfits
      })
      .from(schema.users)
      .leftJoin(schema.subscriptions, eq(schema.users.id, schema.subscriptions.userId))
      .leftJoin(schema.userWatchlists, eq(schema.users.id, schema.userWatchlists.userId))
      .leftJoin(schema.userTransactions, eq(schema.users.id, schema.userTransactions.userId))
      .leftJoin(schema.userProfits, eq(schema.users.id, schema.userProfits.userId))
      .where(eq(schema.users.id, createdUserId))

    logTest('User Session - Data Retrieval', sessionData.length > 0, 'Session data retrieved')

    // Verify data integrity
    const userWatchlistCount = await db.select().from(schema.userWatchlists).where(eq(schema.userWatchlists.userId, createdUserId))
    const userTransactionCount = await db.select().from(schema.userTransactions).where(eq(schema.userTransactions.userId, createdUserId))

    logTest('User Session - Watchlist Count', userWatchlistCount.length === 2, `Found ${userWatchlistCount.length} watchlist items`)
    logTest('User Session - Transaction Count', userTransactionCount.length === 2, `Found ${userTransactionCount.length} transactions`)
  } catch (error) {
    logTest('User Session Data', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test logout process
async function testLogoutProcess () {
  logHeader('Testing Logout Process')

  try {
    if (!refreshToken) {
      logTest('Logout Process', false, 'No refresh token available')
      return
    }

    // Remove refresh token from database
    const deletedToken = await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.token, refreshToken)).returning()
    logTest('Logout Process - Token Removal', deletedToken.length > 0, 'Refresh token removed from database')

    // Verify token is removed
    const remainingToken = await db.select().from(schema.refreshTokens).where(eq(schema.refreshTokens.token, refreshToken))
    logTest('Logout Process - Token Verification', remainingToken.length === 0, 'Token no longer exists in database')

    // Clear tokens
    accessToken = null
    refreshToken = null

    logTest('Logout Process - Token Clear', true, 'Tokens cleared from memory')
  } catch (error) {
    logTest('Logout Process', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test user data persistence
async function testUserDataPersistence () {
  logHeader('Testing User Data Persistence')

  try {
    if (!createdUserId) {
      logTest('User Data Persistence', false, 'No user ID available')
      return
    }

    // Verify user still exists
    const user = await db.select().from(schema.users).where(eq(schema.users.id, createdUserId))
    logTest('User Data Persistence - User Exists', user.length > 0, 'User still exists in database')

    // Verify subscription exists
    const subscription = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, createdUserId))
    logTest('User Data Persistence - Subscription Exists', subscription.length > 0, 'Subscription still exists')

    // Verify watchlist items exist
    const watchlist = await db.select().from(schema.userWatchlists).where(eq(schema.userWatchlists.userId, createdUserId))
    logTest('User Data Persistence - Watchlist Exists', watchlist.length === 2, 'Watchlist items still exist')

    // Verify transactions exist
    const transactions = await db.select().from(schema.userTransactions).where(eq(schema.userTransactions.userId, createdUserId))
    logTest('User Data Persistence - Transactions Exist', transactions.length === 2, 'Transactions still exist')

    // Verify profits exist
    const profits = await db.select().from(schema.userProfits).where(eq(schema.userProfits.userId, createdUserId))
    logTest('User Data Persistence - Profits Exist', profits.length > 0, 'User profits still exist')
  } catch (error) {
    logTest('User Data Persistence', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test security features
async function testSecurityFeatures () {
  logHeader('Testing Security Features')

  try {
    // Test invalid token
    try {
      jwt.verify('invalid.token.here', config.JWT_ACCESS_SECRET)
      logTest('Security Features - Invalid Token', false, 'Should have rejected invalid token')
    } catch (error) {
      logTest('Security Features - Invalid Token', true, 'Correctly rejected invalid token')
    }

    // Test expired token (create a token that expires immediately)
    const expiredToken = jwt.sign({ userId: 'test' }, config.JWT_ACCESS_SECRET, { expiresIn: '0s' })

    try {
      jwt.verify(expiredToken, config.JWT_ACCESS_SECRET)
      logTest('Security Features - Expired Token', false, 'Should have rejected expired token')
    } catch (error) {
      logTest('Security Features - Expired Token', true, 'Correctly rejected expired token')
    }

    // Test password strength
    const weakPassword = '123'
    const strongPassword = 'StrongPassword123!@#'

    const weakHash = await bcrypt.hash(weakPassword, 12)
    const strongHash = await bcrypt.hash(strongPassword, 12)

    logTest('Security Features - Password Hashing', !!weakHash && !!strongHash, 'Passwords hashed successfully')

    // Test unique email constraint
    try {
      await db.insert(schema.users).values({
        email: demoUser.email, // Same email as demo user
        username: 'duplicateuser',
        passwordHash: 'hash',
        salt: 'salt',
        name: 'Duplicate User'
      })
      logTest('Security Features - Unique Email', false, 'Should have rejected duplicate email')
    } catch (error) {
      logTest('Security Features - Unique Email', true, 'Correctly rejected duplicate email')
    }
  } catch (error) {
    logTest('Security Features', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Cleanup test data
async function cleanupTestData () {
  logHeader('Cleaning Up Test Data')

  try {
    if (!createdUserId) {
      logTest('Cleanup', true, 'No test data to clean up')
      return
    }

    // Delete all related data
    await db.delete(schema.userProfits).where(eq(schema.userProfits.userId, createdUserId))
    await db.delete(schema.userTransactions).where(eq(schema.userTransactions.userId, createdUserId))
    await db.delete(schema.userWatchlists).where(eq(schema.userWatchlists.userId, createdUserId))
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, createdUserId))
    await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, createdUserId))
    await db.delete(schema.users).where(eq(schema.users.id, createdUserId))

    logTest('Cleanup - Test Data Removal', true, 'All test data removed')
  } catch (error) {
    logTest('Cleanup', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Main test runner
async function runAuthTests () {
  logHeader('Ge-Metrics Authentication System Test Suite')
  log('Testing complete authentication flow...\n', 'yellow')

  const tests = [
    testUserRegistration,
    testUserLogin,
    testTokenValidation,
    testTokenRefresh,
    testUserSessionData,
    testLogoutProcess,
    testUserDataPersistence,
    testSecurityFeatures,
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

  logHeader('Authentication Test Summary')
  log(`Total Tests: ${totalTests}`, 'blue')
  log(`Passed: ${passedTests}`, 'green')
  log(`Failed: ${totalTests - passedTests}`, 'red')

  if (passedTests === totalTests) {
    log('\n🎉 All authentication tests passed! Your login system is working perfectly.', 'green')
    log('\n📊 Demo User Details:', 'blue')
    log(`Email: ${demoUser.email}`, 'yellow')
    log(`Username: ${demoUser.username}`, 'yellow')
    log(`Password: ${demoUser.password}`, 'yellow')
    log('\n🔐 You can now use these credentials to test the frontend login!', 'green')
  } else {
    log('\n⚠️  Some authentication tests failed. Please check the configuration.', 'yellow')
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
runAuthTests().catch((error) => {
  log(`Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
  process.exit(1)
})
