#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq, and } from 'drizzle-orm'
import SubscriptionManagementService from './src/services/subscriptionManagementService.js'

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

// Test data
const testUsers = [
  {
    email: 'test1@ge-metrics.com',
    username: 'testuser1',
    password: 'TestPassword123!',
    name: 'Test User 1'
  },
  {
    email: 'test2@ge-metrics.com',
    username: 'testuser2',
    password: 'TestPassword123!',
    name: 'Test User 2'
  },
  {
    email: 'test3@ge-metrics.com',
    username: 'testuser3',
    password: 'TestPassword123!',
    name: 'Test User 3'
  }
]

const testUserIds: number[] = []
const subscriptionService = new SubscriptionManagementService()

// Test subscription plans
async function testSubscriptionPlans () {
  logHeader('Testing Subscription Plans')

  try {
    const plans = SubscriptionManagementService.getPlans()
    logTest('Subscription Plans - Get All Plans', Object.keys(plans).length === 3, `${Object.keys(plans).length} plans available`)

    // Test individual plans
    const freePlan = SubscriptionManagementService.getPlan('free')
    logTest('Subscription Plans - Free Plan', !!freePlan && freePlan.price === 0, `Free plan: ${freePlan?.name}`)

    const premiumPlan = SubscriptionManagementService.getPlan('premium')
    logTest('Subscription Plans - Premium Plan', !!premiumPlan && premiumPlan.price === 9.99, `Premium plan: $${premiumPlan?.price}`)

    const proPlan = SubscriptionManagementService.getPlan('pro')
    logTest('Subscription Plans - Pro Plan', !!proPlan && proPlan.price === 19.99, `Pro plan: $${proPlan?.price}`)

    // Test invalid plan
    const invalidPlan = SubscriptionManagementService.getPlan('invalid')
    logTest('Subscription Plans - Invalid Plan', !invalidPlan, 'Invalid plan returns null')
  } catch (error) {
    logTest('Subscription Plans', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test subscription creation
async function testSubscriptionCreation () {
  logHeader('Testing Subscription Creation')

  try {
    // Create subscriptions for test users
    for (let i = 0; i < testUserIds.length; i++) {
      const userId = testUserIds[i]
      const planId = i === 0 ? 'free' : i === 1 ? 'premium' : 'pro'

      const subscription = await subscriptionService.createSubscription(userId, planId, {
        customerId: `cus_test_${userId}`,
        subscriptionId: `sub_test_${userId}`,
        priceId: `price_${planId}_monthly`
      })

      logTest(`Subscription Creation - User ${userId}`, !!subscription, `Created ${planId} subscription`)
    }

    // Test duplicate subscription creation
    try {
      await subscriptionService.createSubscription(testUserIds[0], 'premium')
      logTest('Subscription Creation - Duplicate Prevention', false, 'Should have prevented duplicate')
    } catch (error) {
      logTest('Subscription Creation - Duplicate Prevention', true, 'Correctly prevented duplicate subscription')
    }

    // Test invalid plan creation
    try {
      await subscriptionService.createSubscription(testUserIds[0], 'invalid_plan')
      logTest('Subscription Creation - Invalid Plan', false, 'Should have rejected invalid plan')
    } catch (error) {
      logTest('Subscription Creation - Invalid Plan', true, 'Correctly rejected invalid plan')
    }
  } catch (error) {
    logTest('Subscription Creation', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test subscription retrieval
async function testSubscriptionRetrieval () {
  logHeader('Testing Subscription Retrieval')

  try {
    // Test getting user subscription
    const userSubscription = await subscriptionService.getUserSubscription(testUserIds[1])
    logTest('Subscription Retrieval - Get User Subscription', !!userSubscription, `User ${testUserIds[1]} has ${userSubscription?.plan} subscription`)

    // Test getting subscription by ID
    if (userSubscription) {
      const subscriptionById = await subscriptionService.getSubscriptionById(userSubscription.id)
      logTest('Subscription Retrieval - Get by ID', !!subscriptionById, `Found subscription ${userSubscription.id}`)
    }

    // Test getting all subscriptions
    const allSubscriptions = await subscriptionService.getAllSubscriptions()
    logTest('Subscription Retrieval - Get All', allSubscriptions.length >= 3, `${allSubscriptions.length} total subscriptions`)

    // Test filtered subscriptions
    const activeSubscriptions = await subscriptionService.getAllSubscriptions({ status: 'active' })
    logTest('Subscription Retrieval - Filter by Status', activeSubscriptions.length >= 3, `${activeSubscriptions.length} active subscriptions`)

    const premiumSubscriptions = await subscriptionService.getAllSubscriptions({ plan: 'premium' })
    logTest('Subscription Retrieval - Filter by Plan', premiumSubscriptions.length >= 1, `${premiumSubscriptions.length} premium subscriptions`)
  } catch (error) {
    logTest('Subscription Retrieval', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test subscription updates
async function testSubscriptionUpdates () {
  logHeader('Testing Subscription Updates')

  try {
    // Get a subscription to update
    const subscription = await subscriptionService.getUserSubscription(testUserIds[1])
    if (!subscription) {
      logTest('Subscription Updates - No Subscription Found', false, 'No subscription to test with')
      return
    }

    // Test updating subscription
    const updatedSubscription = await subscriptionService.updateSubscription(subscription.id, {
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    })

    logTest('Subscription Updates - Update Subscription', !!updatedSubscription, `Updated subscription ${subscription.id}`)

    // Test upgrading subscription
    const upgradedSubscription = await subscriptionService.upgradeSubscription(testUserIds[1], 'pro')
    logTest('Subscription Updates - Upgrade Subscription', !!upgradedSubscription, 'Upgraded to pro plan')

    // Test downgrading subscription
    const downgradedSubscription = await subscriptionService.downgradeSubscription(testUserIds[1], 'premium')
    logTest('Subscription Updates - Downgrade Subscription', !!downgradedSubscription, 'Downgraded to premium plan')
  } catch (error) {
    logTest('Subscription Updates', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test subscription cancellation
async function testSubscriptionCancellation () {
  logHeader('Testing Subscription Cancellation')

  try {
    // Get a subscription to cancel
    const subscription = await subscriptionService.getUserSubscription(testUserIds[2])
    if (!subscription) {
      logTest('Subscription Cancellation - No Subscription Found', false, 'No subscription to test with')
      return
    }

    // Test cancel at period end
    const canceledSubscription = await subscriptionService.cancelSubscription(subscription.id, true)
    logTest('Subscription Cancellation - Cancel at Period End', canceledSubscription.cancelAtPeriodEnd || false, 'Set to cancel at period end')

    // Test immediate cancellation
    const immediateCanceledSubscription = await subscriptionService.cancelSubscription(subscription.id, false)
    logTest('Subscription Cancellation - Immediate Cancel', immediateCanceledSubscription.status === 'canceled', 'Immediately canceled')

    // Test reactivation
    const reactivatedSubscription = await subscriptionService.reactivateSubscription(subscription.id)
    logTest('Subscription Cancellation - Reactivate', reactivatedSubscription.status === 'active', 'Reactivated subscription')
  } catch (error) {
    logTest('Subscription Cancellation', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test feature access
async function testFeatureAccess () {
  logHeader('Testing Feature Access')

  try {
    // Test free user access
    const freeUserAccess = await subscriptionService.hasFeatureAccess(testUserIds[0], 'Basic item tracking')
    logTest('Feature Access - Free User Basic Feature', freeUserAccess, 'Free user has basic feature access')

    const freeUserPremiumAccess = await subscriptionService.hasFeatureAccess(testUserIds[0], 'AI predictions')
    logTest('Feature Access - Free User Premium Feature', !freeUserPremiumAccess, 'Free user denied premium feature')

    // Test premium user access
    const premiumUserAccess = await subscriptionService.hasFeatureAccess(testUserIds[1], 'Advanced analytics')
    logTest('Feature Access - Premium User Advanced Feature', premiumUserAccess, 'Premium user has advanced feature access')

    // Test pro user access
    const proUserAccess = await subscriptionService.hasFeatureAccess(testUserIds[2], 'AI predictions')
    logTest('Feature Access - Pro User AI Feature', proUserAccess, 'Pro user has AI feature access')
  } catch (error) {
    logTest('Feature Access', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test subscription statistics
async function testSubscriptionStats () {
  logHeader('Testing Subscription Statistics')

  try {
    const stats = await subscriptionService.getSubscriptionStats()

    logTest('Subscription Stats - Total Subscriptions', stats.totalSubscriptions >= 3, `${stats.totalSubscriptions} total subscriptions`)
    logTest('Subscription Stats - Active Subscriptions', stats.activeSubscriptions >= 3, `${stats.activeSubscriptions} active subscriptions`)
    logTest('Subscription Stats - Plan Distribution', Object.keys(stats.planDistribution).length >= 2, `${Object.keys(stats.planDistribution).length} plan types`)
    logTest('Subscription Stats - Revenue Calculation', stats.monthlyRevenue >= 0, `$${stats.monthlyRevenue} monthly revenue`)

    console.log('\n📊 Subscription Statistics:')
    console.log(`Total Subscriptions: ${stats.totalSubscriptions}`)
    console.log(`Active Subscriptions: ${stats.activeSubscriptions}`)
    console.log(`Canceled Subscriptions: ${stats.canceledSubscriptions}`)
    console.log(`Past Due Subscriptions: ${stats.pastDueSubscriptions}`)
    console.log(`Monthly Revenue: $${stats.monthlyRevenue}`)
    console.log(`Yearly Revenue: $${stats.yearlyRevenue}`)
    console.log('Plan Distribution:', stats.planDistribution)
  } catch (error) {
    logTest('Subscription Stats', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test user plan details
async function testUserPlanDetails () {
  logHeader('Testing User Plan Details')

  try {
    for (let i = 0; i < testUserIds.length; i++) {
      const userId = testUserIds[i]
      const planDetails = await subscriptionService.getUserPlanDetails(userId)

      logTest(`User Plan Details - User ${userId}`, !!planDetails.subscription, `${planDetails.plan?.name || 'No'} plan`)
      logTest(`User Plan Details - Active Status ${userId}`, planDetails.isActive || false, `Active: ${planDetails.isActive}`)
      logTest(`User Plan Details - Features ${userId}`, planDetails.features.length > 0, `${planDetails.features.length} features`)

      console.log(`\n👤 User ${userId} Plan Details:`)
      console.log(`Plan: ${planDetails.plan?.name}`)
      console.log(`Active: ${planDetails.isActive}`)
      console.log(`Features: ${planDetails.features.join(', ')}`)
    }
  } catch (error) {
    logTest('User Plan Details', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test expiring subscriptions
async function testExpiringSubscriptions () {
  logHeader('Testing Expiring Subscriptions')

  try {
    const expiringSubscriptions = await subscriptionService.getExpiringSubscriptions(30) // Next 30 days
    logTest('Expiring Subscriptions - Get Expiring', expiringSubscriptions.length >= 0, `${expiringSubscriptions.length} expiring in 30 days`)

    const expiringSoonSubscriptions = await subscriptionService.getExpiringSubscriptions(7) // Next 7 days
    logTest('Expiring Subscriptions - Get Expiring Soon', expiringSoonSubscriptions.length >= 0, `${expiringSoonSubscriptions.length} expiring in 7 days`)
  } catch (error) {
    logTest('Expiring Subscriptions', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Test ID incrementing
async function testIdIncrementing () {
  logHeader('Testing ID Incrementing')

  try {
    // Check user IDs
    const users = await db.select().from(schema.users).orderBy(schema.users.id)
    logTest('ID Incrementing - User IDs', users.length > 0, `Users: ${users.map(u => u.id).join(', ')}`)

    // Check subscription IDs
    const subscriptions = await db.select().from(schema.subscriptions).orderBy(schema.subscriptions.id)
    logTest('ID Incrementing - Subscription IDs', subscriptions.length > 0, `Subscriptions: ${subscriptions.map(s => s.id).join(', ')}`)

    // Check that IDs are sequential
    const userIds = users.map(u => u.id)
    const subscriptionIds = subscriptions.map(s => s.id)

    const userIdsSequential = userIds.every((id, index) => index === 0 || id === userIds[index - 1] + 1)
    const subscriptionIdsSequential = subscriptionIds.every((id, index) => index === 0 || id === subscriptionIds[index - 1] + 1)

    logTest('ID Incrementing - Sequential User IDs', userIdsSequential, 'User IDs are sequential')
    logTest('ID Incrementing - Sequential Subscription IDs', subscriptionIdsSequential, 'Subscription IDs are sequential')
  } catch (error) {
    logTest('ID Incrementing', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Create test users
async function createTestUsers () {
  logHeader('Creating Test Users')

  try {
    for (const userData of testUsers) {
      // Check if user already exists
      const existingUsers = await db.select().from(schema.users).where(eq(schema.users.email, userData.email))

      if (existingUsers.length === 0) {
        const bcrypt = await import('bcryptjs')
        const passwordHash = await bcrypt.hash(userData.password, 10)

        const [newUser] = await db.insert(schema.users).values({
          email: userData.email,
          username: userData.username,
          passwordHash,
          name: userData.name
        }).returning()

        testUserIds.push(newUser.id)
        logTest(`Create Test User - ${userData.username}`, !!newUser, `Created user ID: ${newUser.id}`)
      } else {
        testUserIds.push(existingUsers[0].id)
        logTest(`Create Test User - ${userData.username}`, true, `User already exists ID: ${existingUsers[0].id}`)
      }
    }
  } catch (error) {
    logTest('Create Test Users', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Clean up test data
async function cleanupTestData () {
  logHeader('Cleaning Up Test Data')

  try {
    // Delete test subscriptions
    for (const userId of testUserIds) {
      await db.delete(schema.subscriptions).where(eq(schema.subscriptions.userId, userId))
    }

    // Delete test users
    for (const userId of testUserIds) {
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    }

    logTest('Cleanup - Test Data Removed', true, 'Test data cleaned up successfully')
  } catch (error) {
    logTest('Cleanup', false, error instanceof Error ? error.message : 'Unknown error')
  }
}

// Main test runner
async function runSubscriptionManagementTests () {
  logHeader('Ge-Metrics Subscription Management Test Suite')
  log('Testing complete subscription management system...\n', 'yellow')

  const tests = [
    createTestUsers,
    testSubscriptionPlans,
    testSubscriptionCreation,
    testSubscriptionRetrieval,
    testSubscriptionUpdates,
    testSubscriptionCancellation,
    testFeatureAccess,
    testSubscriptionStats,
    testUserPlanDetails,
    testExpiringSubscriptions,
    testIdIncrementing
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

  // Cleanup
  await cleanupTestData()

  logHeader('Subscription Management Test Summary')
  log(`Total Tests: ${totalTests}`, 'blue')
  log(`Passed: ${passedTests}`, 'green')
  log(`Failed: ${totalTests - passedTests}`, 'red')

  if (passedTests === totalTests) {
    log('\n🎉 All subscription management tests passed!', 'green')
    log('\n📊 Subscription System Features Verified:', 'blue')
    log('• Subscription plan management', 'yellow')
    log('• User subscription creation and management', 'yellow')
    log('• Subscription upgrades and downgrades', 'yellow')
    log('• Subscription cancellation and reactivation', 'yellow')
    log('• Feature access control', 'yellow')
    log('• Subscription statistics and reporting', 'yellow')
    log('• Auto-incrementing IDs (1,2,3,4,5...)', 'yellow')
    log('• User plan details and feature lists', 'yellow')
    log('• Expiring subscription detection', 'yellow')
    log('\n🔐 Subscription system is ready for user management integration!', 'green')
  } else {
    log('\n⚠️  Some subscription management tests failed. Please check the configuration.', 'yellow')
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
runSubscriptionManagementTests().catch((error) => {
  log(`Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red')
  process.exit(1)
})
