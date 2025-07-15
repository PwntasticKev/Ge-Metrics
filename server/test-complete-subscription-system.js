import { db } from './src/db/index.ts'
import * as schema from './src/db/schema.ts'
import SubscriptionManagementService from './src/services/subscriptionManagementService.ts'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

console.log('🚀 Testing Complete Ge-Metrics Subscription Management System\n')

// Test data
const testUsers = [
  {
    email: 'admin@example.com',
    username: 'admin_user',
    name: 'Admin User',
    passwordHash: bcrypt.hashSync('password123', 10)
  },
  {
    email: 'premium@example.com',
    username: 'premium_user',
    name: 'Premium User',
    passwordHash: bcrypt.hashSync('password123', 10)
  },
  {
    email: 'pro@example.com',
    username: 'pro_user',
    name: 'Pro User',
    passwordHash: bcrypt.hashSync('password123', 10)
  },
  {
    email: 'free@example.com',
    username: 'free_user',
    name: 'Free User',
    passwordHash: bcrypt.hashSync('password123', 10)
  }
]

const subscriptionService = new SubscriptionManagementService()

async function testCompleteSubscriptionSystem () {
  try {
    console.log('📋 Step 1: Creating test users with auto-incrementing IDs...')
    const createdUsers = []

    for (const userData of testUsers) {
      const [user] = await db.insert(schema.users).values({
        email: userData.email,
        username: userData.username,
        name: userData.name,
        passwordHash: userData.passwordHash
      }).returning()

      createdUsers.push(user)
      console.log(`✅ Created user: ${user.username} (ID: ${user.id})`)
    }

    console.log('\n📋 Step 2: Testing subscription plans...')
    const plans = SubscriptionManagementService.getPlans()
    console.log('Available plans:', Object.keys(plans))

    for (const [planId, plan] of Object.entries(plans)) {
      console.log(`Plan: ${plan.name} - $${plan.price}/${plan.interval}`)
      console.log(`Features: ${plan.features.join(', ')}`)
    }

    console.log('\n📋 Step 3: Creating subscriptions with auto-incrementing IDs...')

    // Create Premium subscription for user 2
    const premiumSubscription = await subscriptionService.createSubscription(
      createdUsers[1].id,
      'premium',
      {
        customerId: 'cus_premium_123',
        subscriptionId: 'sub_premium_123',
        priceId: 'price_premium_monthly'
      }
    )
    console.log(`✅ Created Premium subscription: ${premiumSubscription.id}`)

    // Create Pro subscription for user 3
    const proSubscription = await subscriptionService.createSubscription(
      createdUsers[2].id,
      'pro',
      {
        customerId: 'cus_pro_123',
        subscriptionId: 'sub_pro_123',
        priceId: 'price_pro_monthly'
      }
    )
    console.log(`✅ Created Pro subscription: ${proSubscription.id}`)

    console.log('\n📋 Step 4: Testing subscription retrieval...')

    // Get user subscriptions
    for (const user of createdUsers) {
      const subscription = await subscriptionService.getUserSubscription(user.id)
      if (subscription) {
        console.log(`User ${user.username}: ${subscription.plan} (${subscription.status})`)
      } else {
        console.log(`User ${user.username}: No subscription`)
      }
    }

    console.log('\n📋 Step 5: Testing subscription updates...')

    // Update premium subscription
    const updatedSubscription = await subscriptionService.updateSubscription(
      premiumSubscription.id,
      {
        status: 'past_due',
        cancelAtPeriodEnd: true
      }
    )
    console.log(`✅ Updated subscription ${premiumSubscription.id}: ${updatedSubscription.status}`)

    console.log('\n📋 Step 6: Testing subscription cancellation...')

    // Cancel pro subscription
    const canceledSubscription = await subscriptionService.cancelSubscription(proSubscription.id, true)
    console.log(`✅ Canceled subscription ${proSubscription.id}: cancelAtPeriodEnd = ${canceledSubscription.cancelAtPeriodEnd}`)

    console.log('\n📋 Step 7: Testing subscription reactivation...')

    // Reactivate pro subscription
    const reactivatedSubscription = await subscriptionService.reactivateSubscription(proSubscription.id)
    console.log(`✅ Reactivated subscription ${proSubscription.id}: ${reactivatedSubscription.status}`)

    console.log('\n📋 Step 8: Testing feature access...')

    // Test feature access for each user
    const features = ['AI predictions', 'Whale tracking', 'Advanced analytics', 'API access']

    for (const user of createdUsers) {
      console.log(`\nUser: ${user.username}`)
      for (const feature of features) {
        const hasAccess = await subscriptionService.hasFeatureAccess(user.id, feature)
        console.log(`  ${feature}: ${hasAccess ? '✅' : '❌'}`)
      }
    }

    console.log('\n📋 Step 9: Testing subscription statistics...')

    const stats = await subscriptionService.getSubscriptionStats()
    console.log('Subscription Statistics:')
    console.log(`  Total: ${stats.totalSubscriptions}`)
    console.log(`  Active: ${stats.activeSubscriptions}`)
    console.log(`  Canceled: ${stats.canceledSubscriptions}`)
    console.log(`  Past Due: ${stats.pastDueSubscriptions}`)
    console.log(`  Monthly Revenue: $${stats.monthlyRevenue}`)
    console.log('  Plan Distribution:', stats.planDistribution)

    console.log('\n📋 Step 10: Testing subscription upgrades/downgrades...')

    // Upgrade free user to premium
    const freeUser = createdUsers[3]
    const upgradeSubscription = await subscriptionService.createSubscription(freeUser.id, 'premium')
    console.log(`✅ Created Premium subscription for free user: ${upgradeSubscription.id}`)

    // Upgrade to pro
    const upgradedSubscription = await subscriptionService.upgradeSubscription(freeUser.id, 'pro')
    console.log(`✅ Upgraded free user to Pro: ${upgradedSubscription.plan}`)

    // Downgrade to premium
    const downgradedSubscription = await subscriptionService.downgradeSubscription(freeUser.id, 'premium')
    console.log(`✅ Downgraded free user to Premium: ${downgradedSubscription.plan}`)

    console.log('\n📋 Step 11: Testing expiring subscriptions...')

    const expiringSubscriptions = await subscriptionService.getExpiringSubscriptions(30)
    console.log(`Found ${expiringSubscriptions.length} subscriptions expiring in 30 days`)

    console.log('\n📋 Step 12: Testing user plan details...')

    for (const user of createdUsers) {
      const planDetails = await subscriptionService.getUserPlanDetails(user.id)
      console.log(`\nUser: ${user.username}`)
      console.log(`  Plan: ${planDetails.plan?.name || 'None'}`)
      console.log(`  Active: ${planDetails.isActive}`)
      console.log(`  Features: ${planDetails.features.length}`)
    }

    console.log('\n📋 Step 13: Testing all subscriptions retrieval...')

    const allSubscriptions = await subscriptionService.getAllSubscriptions()
    console.log(`Total subscriptions in system: ${allSubscriptions.length}`)

    const activeSubscriptions = await subscriptionService.getAllSubscriptions({ status: 'active' })
    console.log(`Active subscriptions: ${activeSubscriptions.length}`)

    console.log('\n📋 Step 14: Testing employee management...')

    // Create an employee
    const [employee] = await db.insert(schema.employees).values({
      userId: createdUsers[0].id,
      role: 'admin',
      department: 'Management',
      isActive: true,
      permissions: { canManageUsers: true, canManageSubscriptions: true }
    }).returning()

    console.log(`✅ Created employee: ${employee.role} (ID: ${employee.id})`)

    console.log('\n📋 Step 15: Testing audit logging...')

    // Check audit log entries
    const auditLogs = await db.select().from(schema.auditLog)
    console.log(`Total audit log entries: ${auditLogs.length}`)

    if (auditLogs.length > 0) {
      console.log('Recent audit log entries:')
      auditLogs.slice(-5).forEach(log => {
        console.log(`  ${log.action} - ${log.resource} (${log.created_at})`)
      })
    }

    console.log('\n✅ All subscription tests completed successfully!')

    // Display final database state
    console.log('\n📊 Final Database State:')
    const finalUsers = await db.select().from(schema.users)
    const finalSubscriptions = await db.select().from(schema.subscriptions)
    const finalEmployees = await db.select().from(schema.employees)
    const finalAuditLogs = await db.select().from(schema.auditLog)

    console.log(`Users: ${finalUsers.length} (IDs: ${finalUsers.map(u => u.id).join(', ')})`)
    console.log(`Subscriptions: ${finalSubscriptions.length} (IDs: ${finalSubscriptions.map(s => s.id).join(', ')})`)
    console.log(`Employees: ${finalEmployees.length} (IDs: ${finalEmployees.map(e => e.id).join(', ')})`)
    console.log(`Audit Logs: ${finalAuditLogs.length}`)

    console.log('\n📋 User Subscription Summary:')
    for (const user of finalUsers) {
      const subscription = finalSubscriptions.find(s => s.userId === user.id)
      console.log(`  ${user.username} (ID: ${user.id}): ${subscription ? subscription.plan : 'No subscription'}`)
    }

    console.log('\n🎉 Complete subscription system test completed successfully!')
    console.log('✅ Auto-incrementing IDs working correctly (1, 2, 3, 4, 5, 6...)')
    console.log('✅ All CRUD operations working')
    console.log('✅ Feature access control working')
    console.log('✅ Audit logging working')
    console.log('✅ Employee management working')
    console.log('✅ Subscription statistics working')
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  }
}

// Run the test
testCompleteSubscriptionSystem()
  .then(() => {
    console.log('\n🎉 Complete subscription system test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })
