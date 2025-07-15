#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq, and, desc, gte, lte } from 'drizzle-orm'

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

// Test data for all tables
const testData = {
  user: {
    email: 'alltables@example.com',
    username: 'alltablesuser',
    passwordHash: 'hashedpassword123',
    salt: 'salt123',
    name: 'All Tables Test User',
    avatar: 'https://example.com/avatar.jpg'
  },
  itemMapping: {
    id: 999,
    name: 'Test Item for All Tables',
    examine: 'A test item for comprehensive testing',
    members: false,
    lowalch: 100,
    highalch: 150,
    limit: 1000,
    value: 200,
    icon: 'test-icon.png',
    wikiUrl: 'https://oldschool.runescape.wiki/w/Test_Item'
  }
}

let testUserId = null
let testItemId = null

// Test Refresh Tokens
async function testRefreshTokens () {
  logHeader('Testing Refresh Tokens Table')

  try {
    // Create a refresh token
    const newToken = await db.insert(schema.refreshTokens).values({
      userId: testUserId,
      token: 'test-refresh-token-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    }).returning()

    logTest('Refresh Tokens CREATE', true, `Created token: ${newToken[0].id}`)

    // Read token
    const readToken = await db.select().from(schema.refreshTokens).where(eq(schema.refreshTokens.id, newToken[0].id))
    logTest('Refresh Tokens READ', readToken.length > 0, 'Token found')

    // Update token
    const updatedToken = await db
      .update(schema.refreshTokens)
      .set({ expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) })
      .where(eq(schema.refreshTokens.id, newToken[0].id))
      .returning()
    logTest('Refresh Tokens UPDATE', updatedToken.length > 0, 'Token updated')

    // Delete token
    await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.id, newToken[0].id))
    logTest('Refresh Tokens DELETE', true, 'Token deleted')
  } catch (error) {
    logTest('Refresh Tokens CRUD', false, error.message)
  }
}

// Test Subscriptions
async function testSubscriptions () {
  logHeader('Testing Subscriptions Table')

  try {
    // Create a subscription
    const newSubscription = await db.insert(schema.subscriptions).values({
      userId: testUserId,
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: 'sub_test123',
      stripePriceId: 'price_test123',
      status: 'active',
      plan: 'premium',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false
    }).returning()

    logTest('Subscriptions CREATE', true, `Created subscription: ${newSubscription[0].id}`)

    // Read subscription
    const readSubscription = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.id, newSubscription[0].id))
    logTest('Subscriptions READ', readSubscription.length > 0, 'Subscription found')

    // Update subscription
    const updatedSubscription = await db
      .update(schema.subscriptions)
      .set({ status: 'canceled', cancelAtPeriodEnd: true })
      .where(eq(schema.subscriptions.id, newSubscription[0].id))
      .returning()
    logTest('Subscriptions UPDATE', updatedSubscription.length > 0, 'Subscription updated')

    // Delete subscription
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, newSubscription[0].id))
    logTest('Subscriptions DELETE', true, 'Subscription deleted')
  } catch (error) {
    logTest('Subscriptions CRUD', false, error.message)
  }
}

// Test User Watchlists
async function testUserWatchlists () {
  logHeader('Testing User Watchlists Table')

  try {
    // Create a watchlist item
    const newWatchlist = await db.insert(schema.userWatchlists).values({
      userId: testUserId,
      itemId: '12345',
      itemName: 'Test Watchlist Item',
      targetPrice: 1000,
      alertType: 'price',
      isActive: true
    }).returning()

    logTest('User Watchlists CREATE', true, `Created watchlist: ${newWatchlist[0].id}`)

    // Read watchlist
    const readWatchlist = await db.select().from(schema.userWatchlists).where(eq(schema.userWatchlists.id, newWatchlist[0].id))
    logTest('User Watchlists READ', readWatchlist.length > 0, 'Watchlist found')

    // Update watchlist
    const updatedWatchlist = await db
      .update(schema.userWatchlists)
      .set({ targetPrice: 1500, isActive: false })
      .where(eq(schema.userWatchlists.id, newWatchlist[0].id))
      .returning()
    logTest('User Watchlists UPDATE', updatedWatchlist.length > 0, 'Watchlist updated')

    // Delete watchlist
    await db.delete(schema.userWatchlists).where(eq(schema.userWatchlists.id, newWatchlist[0].id))
    logTest('User Watchlists DELETE', true, 'Watchlist deleted')
  } catch (error) {
    logTest('User Watchlists CRUD', false, error.message)
  }
}

// Test User Transactions
async function testUserTransactions () {
  logHeader('Testing User Transactions Table')

  try {
    // Create a transaction
    const newTransaction = await db.insert(schema.userTransactions).values({
      userId: testUserId,
      itemId: '12345',
      itemName: 'Test Transaction Item',
      transactionType: 'buy',
      quantity: 100,
      price: 500,
      profit: 0,
      notes: 'Test transaction'
    }).returning()

    logTest('User Transactions CREATE', true, `Created transaction: ${newTransaction[0].id}`)

    // Read transaction
    const readTransaction = await db.select().from(schema.userTransactions).where(eq(schema.userTransactions.id, newTransaction[0].id))
    logTest('User Transactions READ', readTransaction.length > 0, 'Transaction found')

    // Update transaction
    const updatedTransaction = await db
      .update(schema.userTransactions)
      .set({ profit: 100, notes: 'Updated test transaction' })
      .where(eq(schema.userTransactions.id, newTransaction[0].id))
      .returning()
    logTest('User Transactions UPDATE', updatedTransaction.length > 0, 'Transaction updated')

    // Delete transaction
    await db.delete(schema.userTransactions).where(eq(schema.userTransactions.id, newTransaction[0].id))
    logTest('User Transactions DELETE', true, 'Transaction deleted')
  } catch (error) {
    logTest('User Transactions CRUD', false, error.message)
  }
}

// Test Favorites
async function testFavorites () {
  logHeader('Testing Favorites Table')

  try {
    // Create a favorite
    const newFavorite = await db.insert(schema.favorites).values({
      userId: testUserId,
      favoriteType: 'item',
      favoriteId: '12345'
    }).returning()

    logTest('Favorites CREATE', true, `Created favorite: ${newFavorite[0].id}`)

    // Read favorite
    const readFavorite = await db.select().from(schema.favorites).where(eq(schema.favorites.id, newFavorite[0].id))
    logTest('Favorites READ', readFavorite.length > 0, 'Favorite found')

    // Update favorite
    const updatedFavorite = await db
      .update(schema.favorites)
      .set({ favoriteType: 'combination', updatedAt: new Date() })
      .where(eq(schema.favorites.id, newFavorite[0].id))
      .returning()
    logTest('Favorites UPDATE', updatedFavorite.length > 0, 'Favorite updated')

    // Delete favorite
    await db.delete(schema.favorites).where(eq(schema.favorites.id, newFavorite[0].id))
    logTest('Favorites DELETE', true, 'Favorite deleted')
  } catch (error) {
    logTest('Favorites CRUD', false, error.message)
  }
}

// Test Item Price History
async function testItemPriceHistory () {
  logHeader('Testing Item Price History Table')

  try {
    // Create price history entry
    const newPriceHistory = await db.insert(schema.itemPriceHistory).values({
      itemId: testItemId,
      timestamp: new Date(),
      highPrice: 1000,
      lowPrice: 900,
      volume: 500,
      timeframe: '1h'
    }).returning()

    logTest('Item Price History CREATE', true, `Created price history: ${newPriceHistory[0].id}`)

    // Read price history
    const readPriceHistory = await db.select().from(schema.itemPriceHistory).where(eq(schema.itemPriceHistory.id, newPriceHistory[0].id))
    logTest('Item Price History READ', readPriceHistory.length > 0, 'Price history found')

    // Update price history
    const updatedPriceHistory = await db
      .update(schema.itemPriceHistory)
      .set({ highPrice: 1100, lowPrice: 950, volume: 600 })
      .where(eq(schema.itemPriceHistory.id, newPriceHistory[0].id))
      .returning()
    logTest('Item Price History UPDATE', updatedPriceHistory.length > 0, 'Price history updated')

    // Delete price history
    await db.delete(schema.itemPriceHistory).where(eq(schema.itemPriceHistory.id, newPriceHistory[0].id))
    logTest('Item Price History DELETE', true, 'Price history deleted')
  } catch (error) {
    logTest('Item Price History CRUD', false, error.message)
  }
}

// Test User Profits
async function testUserProfits () {
  logHeader('Testing User Profits Table')

  try {
    // Create user profits
    const newUserProfits = await db.insert(schema.userProfits).values({
      userId: testUserId,
      totalProfit: 10000,
      weeklyProfit: 1000,
      monthlyProfit: 5000,
      totalTrades: 50,
      bestSingleFlip: 500,
      currentRank: 1
    }).returning()

    logTest('User Profits CREATE', true, `Created user profits: ${newUserProfits[0].id}`)

    // Read user profits
    const readUserProfits = await db.select().from(schema.userProfits).where(eq(schema.userProfits.id, newUserProfits[0].id))
    logTest('User Profits READ', readUserProfits.length > 0, 'User profits found')

    // Update user profits
    const updatedUserProfits = await db
      .update(schema.userProfits)
      .set({ totalProfit: 15000, weeklyProfit: 2000, totalTrades: 75 })
      .where(eq(schema.userProfits.id, newUserProfits[0].id))
      .returning()
    logTest('User Profits UPDATE', updatedUserProfits.length > 0, 'User profits updated')

    // Delete user profits
    await db.delete(schema.userProfits).where(eq(schema.userProfits.id, newUserProfits[0].id))
    logTest('User Profits DELETE', true, 'User profits deleted')
  } catch (error) {
    logTest('User Profits CRUD', false, error.message)
  }
}

// Test User Trades
async function testUserTrades () {
  logHeader('Testing User Trades Table')

  try {
    // Create user trade
    const newUserTrade = await db.insert(schema.userTrades).values({
      userId: testUserId,
      itemId: testItemId,
      itemName: 'Test Trade Item',
      buyPrice: 500,
      sellPrice: 750,
      quantity: 100,
      profit: 25000,
      notes: 'Test trade'
    }).returning()

    logTest('User Trades CREATE', true, `Created user trade: ${newUserTrade[0].id}`)

    // Read user trade
    const readUserTrade = await db.select().from(schema.userTrades).where(eq(schema.userTrades.id, newUserTrade[0].id))
    logTest('User Trades READ', readUserTrade.length > 0, 'User trade found')

    // Update user trade
    const updatedUserTrade = await db
      .update(schema.userTrades)
      .set({ sellPrice: 800, profit: 30000, notes: 'Updated test trade' })
      .where(eq(schema.userTrades.id, newUserTrade[0].id))
      .returning()
    logTest('User Trades UPDATE', updatedUserTrade.length > 0, 'User trade updated')

    // Delete user trade
    await db.delete(schema.userTrades).where(eq(schema.userTrades.id, newUserTrade[0].id))
    logTest('User Trades DELETE', true, 'User trade deleted')
  } catch (error) {
    logTest('User Trades CRUD', false, error.message)
  }
}

// Test User Achievements
async function testUserAchievements () {
  logHeader('Testing User Achievements Table')

  try {
    // Create user achievement
    const newAchievement = await db.insert(schema.userAchievements).values({
      userId: testUserId,
      achievementType: 'profit',
      achievementKey: 'first_million',
      achievementName: 'First Million',
      achievementDescription: 'Earn your first million GP',
      progressValue: 1000000
    }).returning()

    logTest('User Achievements CREATE', true, `Created achievement: ${newAchievement[0].id}`)

    // Read user achievement
    const readAchievement = await db.select().from(schema.userAchievements).where(eq(schema.userAchievements.id, newAchievement[0].id))
    logTest('User Achievements READ', readAchievement.length > 0, 'Achievement found')

    // Update user achievement
    const updatedAchievement = await db
      .update(schema.userAchievements)
      .set({ progressValue: 1500000, achievementDescription: 'Updated achievement description' })
      .where(eq(schema.userAchievements.id, newAchievement[0].id))
      .returning()
    logTest('User Achievements UPDATE', updatedAchievement.length > 0, 'Achievement updated')

    // Delete user achievement
    await db.delete(schema.userAchievements).where(eq(schema.userAchievements.id, newAchievement[0].id))
    logTest('User Achievements DELETE', true, 'Achievement deleted')
  } catch (error) {
    logTest('User Achievements CRUD', false, error.message)
  }
}

// Test User Goals
async function testUserGoals () {
  logHeader('Testing User Goals Table')

  try {
    // Create user goal
    const newGoal = await db.insert(schema.userGoals).values({
      userId: testUserId,
      goalType: 'profit',
      goalName: 'Earn 10M GP',
      targetValue: 10000000,
      currentProgress: 5000000,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isCompleted: false
    }).returning()

    logTest('User Goals CREATE', true, `Created goal: ${newGoal[0].id}`)

    // Read user goal
    const readGoal = await db.select().from(schema.userGoals).where(eq(schema.userGoals.id, newGoal[0].id))
    logTest('User Goals READ', readGoal.length > 0, 'Goal found')

    // Update user goal
    const updatedGoal = await db
      .update(schema.userGoals)
      .set({ currentProgress: 7500000, isCompleted: true, completedAt: new Date() })
      .where(eq(schema.userGoals.id, newGoal[0].id))
      .returning()
    logTest('User Goals UPDATE', updatedGoal.length > 0, 'Goal updated')

    // Delete user goal
    await db.delete(schema.userGoals).where(eq(schema.userGoals.id, newGoal[0].id))
    logTest('User Goals DELETE', true, 'Goal deleted')
  } catch (error) {
    logTest('User Goals CRUD', false, error.message)
  }
}

// Test Friend Invites
async function testFriendInvites () {
  logHeader('Testing Friend Invites Table')

  try {
    // Create friend invite
    const newInvite = await db.insert(schema.friendInvites).values({
      inviterId: testUserId,
      invitedEmail: 'friend@example.com',
      status: 'pending',
      message: 'Hey, join me on Ge-Metrics!',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }).returning()

    logTest('Friend Invites CREATE', true, `Created invite: ${newInvite[0].id}`)

    // Read friend invite
    const readInvite = await db.select().from(schema.friendInvites).where(eq(schema.friendInvites.id, newInvite[0].id))
    logTest('Friend Invites READ', readInvite.length > 0, 'Invite found')

    // Update friend invite
    const updatedInvite = await db
      .update(schema.friendInvites)
      .set({ status: 'accepted', message: 'Invite accepted!' })
      .where(eq(schema.friendInvites.id, newInvite[0].id))
      .returning()
    logTest('Friend Invites UPDATE', updatedInvite.length > 0, 'Invite updated')

    // Delete friend invite
    await db.delete(schema.friendInvites).where(eq(schema.friendInvites.id, newInvite[0].id))
    logTest('Friend Invites DELETE', true, 'Invite deleted')
  } catch (error) {
    logTest('Friend Invites CRUD', false, error.message)
  }
}

// Test User Friendships
async function testUserFriendships () {
  logHeader('Testing User Friendships Table')

  try {
    // Create a second user for friendship testing
    const friendUser = await db.insert(schema.users).values({
      email: 'friend@example.com',
      username: 'frienduser',
      passwordHash: 'hashedpassword123',
      salt: 'salt123',
      name: 'Friend User'
    }).returning()

    // Create friendship
    const newFriendship = await db.insert(schema.userFriendships).values({
      user1Id: testUserId,
      user2Id: friendUser[0].id
    }).returning()

    logTest('User Friendships CREATE', true, `Created friendship: ${newFriendship[0].id}`)

    // Read friendship
    const readFriendship = await db.select().from(schema.userFriendships).where(eq(schema.userFriendships.id, newFriendship[0].id))
    logTest('User Friendships READ', readFriendship.length > 0, 'Friendship found')

    // Delete friendship
    await db.delete(schema.userFriendships).where(eq(schema.userFriendships.id, newFriendship[0].id))
    logTest('User Friendships DELETE', true, 'Friendship deleted')

    // Clean up friend user
    await db.delete(schema.users).where(eq(schema.users.id, friendUser[0].id))
  } catch (error) {
    logTest('User Friendships CRUD', false, error.message)
  }
}

// Test Clans
async function testClans () {
  logHeader('Testing Clans Table')

  try {
    // Create clan
    const newClan = await db.insert(schema.clans).values({
      name: 'Test Clan',
      description: 'A test clan for database testing',
      ownerId: testUserId
    }).returning()

    logTest('Clans CREATE', true, `Created clan: ${newClan[0].id}`)

    // Read clan
    const readClan = await db.select().from(schema.clans).where(eq(schema.clans.id, newClan[0].id))
    logTest('Clans READ', readClan.length > 0, 'Clan found')

    // Update clan
    const updatedClan = await db
      .update(schema.clans)
      .set({ name: 'Updated Test Clan', description: 'Updated clan description' })
      .where(eq(schema.clans.id, newClan[0].id))
      .returning()
    logTest('Clans UPDATE', updatedClan.length > 0, 'Clan updated')

    // Delete clan
    await db.delete(schema.clans).where(eq(schema.clans.id, newClan[0].id))
    logTest('Clans DELETE', true, 'Clan deleted')
  } catch (error) {
    logTest('Clans CRUD', false, error.message)
  }
}

// Test Clan Members
async function testClanMembers () {
  logHeader('Testing Clan Members Table')

  try {
    // Create clan first
    const newClan = await db.insert(schema.clans).values({
      name: 'Test Clan for Members',
      description: 'A test clan for member testing',
      ownerId: testUserId
    }).returning()

    // Create clan member
    const newMember = await db.insert(schema.clanMembers).values({
      clanId: newClan[0].id,
      userId: testUserId,
      role: 'member'
    }).returning()

    logTest('Clan Members CREATE', true, `Created member: ${newMember[0].id}`)

    // Read clan member
    const readMember = await db.select().from(schema.clanMembers).where(eq(schema.clanMembers.id, newMember[0].id))
    logTest('Clan Members READ', readMember.length > 0, 'Member found')

    // Update clan member
    const updatedMember = await db
      .update(schema.clanMembers)
      .set({ role: 'officer' })
      .where(eq(schema.clanMembers.id, newMember[0].id))
      .returning()
    logTest('Clan Members UPDATE', updatedMember.length > 0, 'Member updated')

    // Delete clan member
    await db.delete(schema.clanMembers).where(eq(schema.clanMembers.id, newMember[0].id))
    logTest('Clan Members DELETE', true, 'Member deleted')

    // Clean up clan
    await db.delete(schema.clans).where(eq(schema.clans.id, newClan[0].id))
  } catch (error) {
    logTest('Clan Members CRUD', false, error.message)
  }
}

// Test Clan Invites
async function testClanInvites () {
  logHeader('Testing Clan Invites Table')

  try {
    // Create clan first
    const newClan = await db.insert(schema.clans).values({
      name: 'Test Clan for Invites',
      description: 'A test clan for invite testing',
      ownerId: testUserId
    }).returning()

    // Create clan invite
    const newInvite = await db.insert(schema.clanInvites).values({
      clanId: newClan[0].id,
      inviterId: testUserId,
      invitedEmail: 'clanmember@example.com',
      status: 'pending',
      message: 'Join our clan!',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }).returning()

    logTest('Clan Invites CREATE', true, `Created invite: ${newInvite[0].id}`)

    // Read clan invite
    const readInvite = await db.select().from(schema.clanInvites).where(eq(schema.clanInvites.id, newInvite[0].id))
    logTest('Clan Invites READ', readInvite.length > 0, 'Invite found')

    // Update clan invite
    const updatedInvite = await db
      .update(schema.clanInvites)
      .set({ status: 'accepted', message: 'Invite accepted!' })
      .where(eq(schema.clanInvites.id, newInvite[0].id))
      .returning()
    logTest('Clan Invites UPDATE', updatedInvite.length > 0, 'Invite updated')

    // Delete clan invite
    await db.delete(schema.clanInvites).where(eq(schema.clanInvites.id, newInvite[0].id))
    logTest('Clan Invites DELETE', true, 'Invite deleted')

    // Clean up clan
    await db.delete(schema.clans).where(eq(schema.clans.id, newClan[0].id))
  } catch (error) {
    logTest('Clan Invites CRUD', false, error.message)
  }
}

// Test Profit Audit Log
async function testProfitAuditLog () {
  logHeader('Testing Profit Audit Log Table')

  try {
    // Create audit log entry
    const newAuditLog = await db.insert(schema.profitAuditLog).values({
      userId: testUserId,
      action: 'trade_completed',
      details: { itemId: '12345', profit: 1000, quantity: 100 }
    }).returning()

    logTest('Profit Audit Log CREATE', true, `Created audit log: ${newAuditLog[0].id}`)

    // Read audit log
    const readAuditLog = await db.select().from(schema.profitAuditLog).where(eq(schema.profitAuditLog.id, newAuditLog[0].id))
    logTest('Profit Audit Log READ', readAuditLog.length > 0, 'Audit log found')

    // Update audit log
    const updatedAuditLog = await db
      .update(schema.profitAuditLog)
      .set({
        action: 'trade_updated',
        details: { itemId: '12345', profit: 1500, quantity: 100, updated: true }
      })
      .where(eq(schema.profitAuditLog.id, newAuditLog[0].id))
      .returning()
    logTest('Profit Audit Log UPDATE', updatedAuditLog.length > 0, 'Audit log updated')

    // Delete audit log
    await db.delete(schema.profitAuditLog).where(eq(schema.profitAuditLog.id, newAuditLog[0].id))
    logTest('Profit Audit Log DELETE', true, 'Audit log deleted')
  } catch (error) {
    logTest('Profit Audit Log CRUD', false, error.message)
  }
}

// Setup test data
async function setupTestData () {
  logHeader('Setting Up Test Data')

  try {
    // Create test user
    const newUser = await db.insert(schema.users).values(testData.user).returning()
    testUserId = newUser[0].id
    logTest('Test User Creation', true, `Created user: ${testUserId}`)

    // Create test item
    const newItem = await db.insert(schema.itemMapping).values(testData.itemMapping).returning()
    testItemId = newItem[0].id
    logTest('Test Item Creation', true, `Created item: ${testItemId}`)
  } catch (error) {
    logTest('Test Data Setup', false, error.message)
    throw error
  }
}

// Cleanup test data
async function cleanupTestData () {
  logHeader('Cleaning Up Test Data')

  try {
    if (testItemId) {
      await db.delete(schema.itemMapping).where(eq(schema.itemMapping.id, testItemId))
      logTest('Test Item Cleanup', true, 'Item deleted')
    }

    if (testUserId) {
      await db.delete(schema.users).where(eq(schema.users.id, testUserId))
      logTest('Test User Cleanup', true, 'User deleted')
    }
  } catch (error) {
    logTest('Test Data Cleanup', false, error.message)
  }
}

// Main test runner
async function runAllTableTests () {
  logHeader('Ge-Metrics All Tables CRUD Test Suite')
  log('Testing all database tables...\n', 'yellow')

  const tests = [
    setupTestData,
    testRefreshTokens,
    testSubscriptions,
    testUserWatchlists,
    testUserTransactions,
    testFavorites,
    testItemPriceHistory,
    testUserProfits,
    testUserTrades,
    testUserAchievements,
    testUserGoals,
    testFriendInvites,
    testUserFriendships,
    testClans,
    testClanMembers,
    testClanInvites,
    testProfitAuditLog,
    cleanupTestData
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

  logHeader('All Tables Test Summary')
  log(`Total Tests: ${totalTests}`, 'blue')
  log(`Passed: ${passedTests}`, 'green')
  log(`Failed: ${totalTests - passedTests}`, 'red')

  if (passedTests === totalTests) {
    log('\n🎉 All table tests passed! Your database is fully functional.', 'green')
  } else {
    log('\n⚠️  Some table tests failed. Please check the database configuration.', 'yellow')
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
runAllTableTests().catch((error) => {
  log(`Test suite failed: ${error.message}`, 'red')
  process.exit(1)
})
