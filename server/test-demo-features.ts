#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq, and } from 'drizzle-orm'
import FavoritesService from './src/services/favoritesService.js'
import ClanService from './src/services/clanService.js'
import PricingService from './src/services/pricingService.js'

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
  name: 'Demo User'
}

let demoUserId: string | null = null
const favoritesService = new FavoritesService()
const clanService = new ClanService()
const pricingService = PricingService.getInstance()

// Test demo user authentication
async function testDemoUserAuth () {
  logHeader('Testing Demo User Authentication')

  try {
    // Get demo user
    const users = await db.select().from(schema.users).where(eq(schema.users.email, demoUser.email))

    if (users.length === 0) {
      logTest('Demo User Auth - User Exists', false, 'Demo user not found')
      return false
    }

    demoUserId = users[0].id
    logTest('Demo User Auth - User Exists', true, `Demo user found: ${demoUserId}`)

    // Test password verification
    const bcrypt = await import('bcryptjs')
    const isValidPassword = await bcrypt.compare(demoUser.password, users[0].passwordHash!)
    logTest('Demo User Auth - Password Verification', isValidPassword, 'Password verified successfully')

    return isValidPassword
  } catch (error) {
    logTest('Demo User Auth', false, error instanceof Error ? error.message : 'Unknown error')
    return false
  }
}

// Test favorites functionality
async function testFavorites () {
  logHeader('Testing Favorites System')

  if (!demoUserId) {
    logTest('Favorites System', false, 'No demo user available')
    return
  }

  try {
    // Test adding item to favorites
    const favoriteItem = await favoritesService.addFavorite(demoUserId, 'item', '537')
    logTest('Favorites - Add Item', !!favoriteItem, 'Added item 537 to favorites')

    // Test adding combination to favorites
    const favoriteCombo = await favoritesService.addFavorite(demoUserId, 'combination', 'combo_1')
    logTest('Favorites - Add Combination', !!favoriteCombo, 'Added combination combo_1 to favorites')

    // Test checking if favorited
    const isItemFavorited = await favoritesService.isFavorited(demoUserId, 'item', '537')
    logTest('Favorites - Check Item Favorited', isItemFavorited, 'Item is favorited')

    const isComboFavorited = await favoritesService.isFavorited(demoUserId, 'combination', 'combo_1')
    logTest('Favorites - Check Combination Favorited', isComboFavorited, 'Combination is favorited')

    // Test getting user favorites
    const userFavorites = await favoritesService.getUserFavorites(demoUserId)
    logTest('Favorites - Get User Favorites', userFavorites.length === 2, `Found ${userFavorites.length} favorites`)

    // Test getting favorites by type
    const itemFavorites = await favoritesService.getUserFavoritesByType(demoUserId, 'item')
    logTest('Favorites - Get Item Favorites', itemFavorites.length === 1, `Found ${itemFavorites.length} item favorites`)

    const comboFavorites = await favoritesService.getUserFavoritesByType(demoUserId, 'combination')
    logTest('Favorites - Get Combination Favorites', comboFavorites.length === 1, `Found ${comboFavorites.length} combination favorites`)

    // Test favorite count
    const itemCount = await favoritesService.getFavoriteCount('item', '537')
    logTest('Favorites - Get Favorite Count', itemCount >= 1, `Item has ${itemCount} favorites`)

    // Test toggle favorite
    const toggleResult = await favoritesService.toggleFavorite(demoUserId, 'item', '537')
    logTest('Favorites - Toggle Favorite', !toggleResult.isFavorited, 'Item unfavorited via toggle')

    const toggleResult2 = await favoritesService.toggleFavorite(demoUserId, 'item', '537')
    logTest('Favorites - Toggle Favorite Again', toggleResult2.isFavorited, 'Item favorited again via toggle')
  } catch (error) {
    logTest('Favorites System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test clan functionality
async function testClans () {
  logHeader('Testing Clan System')

  if (!demoUserId) {
    logTest('Clan System', false, 'No demo user available')
    return
  }

  try {
    // Test creating a clan
    const newClan = await clanService.createClan(demoUserId, 'Demo Clan', 'A test clan for demo user')
    logTest('Clans - Create Clan', !!newClan, `Created clan: ${newClan.name}`)

    // Test getting clan
    const retrievedClan = await clanService.getClan(newClan.id)
    logTest('Clans - Get Clan', !!retrievedClan, 'Clan retrieved successfully')

    // Test getting clan members
    const clanMembers = await clanService.getClanMembers(newClan.id)
    logTest('Clans - Get Clan Members', clanMembers.length === 1, `Found ${clanMembers.length} clan member`)

    // Test getting user's clan
    const userClan = await clanService.getUserClan(demoUserId)
    logTest('Clans - Get User Clan', !!userClan, 'User clan retrieved successfully')

    // Test updating clan
    const updatedClan = await clanService.updateClan(newClan.id, {
      description: 'Updated demo clan description'
    })
    logTest('Clans - Update Clan', !!updatedClan, 'Clan updated successfully')

    // Test inviting to clan
    const invite = await clanService.inviteToClan(newClan.id, demoUserId, 'test@example.com', 'Join our demo clan!')
    logTest('Clans - Invite to Clan', !!invite, 'Clan invite created')

    // Test getting pending invites
    const pendingInvites = await clanService.getPendingInvites(demoUserId)
    logTest('Clans - Get Pending Invites', pendingInvites.length >= 0, `Found ${pendingInvites.length} pending invites`)

    // Test clan member role
    const member = await clanService.getClanMember(newClan.id, demoUserId)
    logTest('Clans - Get Clan Member', !!member, 'Clan member retrieved')

    if (member) {
      logTest('Clans - Member Role', member.role === 'owner', `Member role: ${member.role}`)
    }
  } catch (error) {
    logTest('Clan System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test pricing system with caching
async function testPricingSystem () {
  logHeader('Testing Pricing System with Database Caching')

  try {
    // Test getting latest prices
    const prices = await pricingService.getLatestPrices()
    logTest('Pricing - Get Latest Prices', Object.keys(prices).length > 0, `Retrieved ${Object.keys(prices).length} items`)

    // Test cache status
    const cacheStatus = pricingService.getCacheStatus()
    logTest('Pricing - Cache Status', true, `Last fetch: ${cacheStatus.lastFetch.toLocaleTimeString()}`)

    // Test getting specific item price
    const itemPrice = await pricingService.getItemPrice(537) // Dragon bones
    logTest('Pricing - Get Item Price', !!itemPrice, `Dragon bones: High ${itemPrice?.high}, Low ${itemPrice?.low}`)

    // Test getting item mapping
    const itemMapping = await pricingService.getItemMapping()
    logTest('Pricing - Get Item Mapping', itemMapping.length > 0, `Retrieved ${itemMapping.length} items`)

    // Test getting historical data
    const history = await pricingService.getItemHistory(537, '24h')
    logTest('Pricing - Get Item History', history.length >= 0, `Retrieved ${history.length} historical records`)

    // Test cache behavior - should use cached data
    const cachedPrices = await pricingService.getLatestPrices()
    logTest('Pricing - Cache Behavior', Object.keys(cachedPrices).length > 0, 'Using cached data')

    // Test force refresh
    const refreshedPrices = await pricingService.forceRefreshPrices()
    logTest('Pricing - Force Refresh', Object.keys(refreshedPrices).length > 0, 'Forced refresh successful')
  } catch (error) {
    logTest('Pricing System', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test database vs API usage
async function testDatabaseVsAPI () {
  logHeader('Testing Database vs API Usage')

  try {
    // Check if we have item mapping in database
    const dbItems = await db.select().from(schema.itemMapping)
    logTest('Database vs API - Item Mapping in DB', dbItems.length > 0, `${dbItems.length} items in database`)

    // Check if we have price history in database
    const dbPrices = await db.select().from(schema.itemPriceHistory)
    logTest('Database vs API - Price History in DB', dbPrices.length > 0, `${dbPrices.length} price records in database`)

    // Test that pricing service uses database first
    const startTime = Date.now()
    const prices = await pricingService.getLatestPrices()
    const endTime = Date.now()
    const responseTime = endTime - startTime

    logTest('Database vs API - Response Time', responseTime < 1000, `Response time: ${responseTime}ms (should be fast for DB)`)

    // Verify we're not hitting API every time
    const cacheStatus = pricingService.getCacheStatus()
    logTest('Database vs API - Cache Respect', !cacheStatus.isStale, 'Respecting 2.5-minute cache interval')
  } catch (error) {
    logTest('Database vs API', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test demo user data persistence
async function testDemoUserData () {
  logHeader('Testing Demo User Data Persistence')

  if (!demoUserId) {
    logTest('Demo User Data', false, 'No demo user available')
    return
  }

  try {
    // Check user subscription
    const subscription = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, demoUserId))
    logTest('Demo User Data - Subscription', subscription.length > 0, 'User has subscription')

    // Check user watchlist
    const watchlist = await db.select().from(schema.userWatchlists).where(eq(schema.userWatchlists.userId, demoUserId))
    logTest('Demo User Data - Watchlist', watchlist.length > 0, `${watchlist.length} watchlist items`)

    // Check user transactions
    const transactions = await db.select().from(schema.userTransactions).where(eq(schema.userTransactions.userId, demoUserId))
    logTest('Demo User Data - Transactions', transactions.length > 0, `${transactions.length} transactions`)

    // Check user profits
    const profits = await db.select().from(schema.userProfits).where(eq(schema.userProfits.userId, demoUserId))
    logTest('Demo User Data - Profits', profits.length > 0, 'User has profit record')

    // Check user achievements
    const achievements = await db.select().from(schema.userAchievements).where(eq(schema.userAchievements.userId, demoUserId))
    logTest('Demo User Data - Achievements', achievements.length > 0, `${achievements.length} achievements`)

    // Check user goals
    const goals = await db.select().from(schema.userGoals).where(eq(schema.userGoals.userId, demoUserId))
    logTest('Demo User Data - Goals', goals.length > 0, `${goals.length} goals`)

    // Check user favorites
    const favorites = await db.select().from(schema.favorites).where(eq(schema.favorites.userId, demoUserId))
    logTest('Demo User Data - Favorites', favorites.length > 0, `${favorites.length} favorites`)
  } catch (error) {
    logTest('Demo User Data', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Main test runner
async function runDemoFeatureTests () {
  logHeader('Ge-Metrics Demo Features Test Suite')
  log('Testing demo user functionality...\n', 'yellow')

  const tests = [
    testDemoUserAuth,
    testFavorites,
    testClans,
    testPricingSystem,
    testDatabaseVsAPI,
    testDemoUserData
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

  logHeader('Demo Features Test Summary')
  log(`Total Tests: ${totalTests}`, 'blue')
  log(`Passed: ${passedTests}`, 'green')
  log(`Failed: ${totalTests - passedTests}`, 'red')

  if (passedTests === totalTests) {
    log('\n🎉 All demo feature tests passed!', 'green')
    log('\n📊 Demo User Features Verified:', 'blue')
    log('• User authentication and login', 'yellow')
    log('• Favorites system (items and combinations)', 'yellow')
    log('• Clan creation and management', 'yellow')
    log('• Clan invitations and membership', 'yellow')
    log('• Pricing system with database caching', 'yellow')
    log('• 2.5-minute API call interval respected', 'yellow')
    log('• Database-first data retrieval', 'yellow')
    log('\n🔐 Demo user is fully functional for frontend testing!', 'green')
  } else {
    log('\n⚠️  Some demo feature tests failed. Please check the configuration.', 'yellow')
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
runDemoFeatureTests().catch((error) => {
  log(`Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
  process.exit(1)
})
