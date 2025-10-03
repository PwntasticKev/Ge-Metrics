/**
 * Create Test Accounts for Authentication Testing
 * Creates admin and normal user accounts in the database
 */

import { db } from './src/db/index.js'
import { users, subscriptions, userSettings } from './src/db/schema.js'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

const TEST_PASSWORD = 'Noob1234'

async function createTestAccounts () {
  console.log('🔧 Creating test accounts...')

  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, salt)

    // 1. Create Admin User
    console.log('👑 Creating admin user...')

    // Check if admin user already exists
    const existingAdmin = await db.select()
      .from(users)
      .where(eq(users.email, 'admin@ge-metrics-test.com'))
      .limit(1)

    let adminUser
    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin user already exists, updating...')
      adminUser = await db.update(users)
        .set({
          username: 'admin_test',
          passwordHash,
          salt,
          name: 'Test Administrator',
          updatedAt: new Date()
        })
        .where(eq(users.email, 'admin@ge-metrics-test.com'))
        .returning()
      adminUser = adminUser[0]
    } else {
      adminUser = await db.insert(users)
        .values({
          email: 'admin@ge-metrics-test.com',
          username: 'admin_test',
          passwordHash,
          salt,
          name: 'Test Administrator'
        })
        .returning()
      adminUser = adminUser[0]
    }

    // Create admin user settings record instead of employee
    await db.insert(userSettings).values({
      userId: adminUser.id,
      role: 'admin',
      emailNotifications: true,
      volumeAlerts: true,
      priceDropAlerts: true,
      cooldownPeriod: 5,
      otpEnabled: false,
      otpVerified: false,
      permissions: {
        admin: ['full_access'],
        users: ['read', 'write', 'delete'],
        billing: ['read', 'write'],
        system: ['read', 'write']
      }
    }).onConflictDoUpdate({
      target: userSettings.userId,
      set: { 
        role: 'admin',
        permissions: {
          admin: ['full_access'],
          users: ['read', 'write', 'delete'], 
          billing: ['read', 'write'],
          system: ['read', 'write']
        }
      }
    })

    // Create admin subscription (active premium)
    const existingAdminSub = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, adminUser.id))
      .limit(1)

    if (existingAdminSub.length === 0) {
      const now = new Date()
      const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year from now

      await db.insert(subscriptions)
        .values({
          userId: adminUser.id,
          status: 'active',
          plan: 'premium',
          currentPeriodStart: now,
          currentPeriodEnd: futureDate,
          cancelAtPeriodEnd: false
        })
    }

    console.log('✅ Admin user created successfully!')
    console.log('   Email: admin@ge-metrics-test.com')
    console.log(`   Password: ${TEST_PASSWORD}`)
    console.log('   Role: admin')

    // 2. Create Normal User
    console.log('👤 Creating normal user...')

    // Check if normal user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, 'user@ge-metrics-test.com'))
      .limit(1)

    let normalUser
    if (existingUser.length > 0) {
      console.log('⚠️  Normal user already exists, updating...')
      normalUser = await db.update(users)
        .set({
          username: 'normal_test',
          passwordHash,
          salt,
          name: 'Test User',
          updatedAt: new Date()
        })
        .where(eq(users.email, 'user@ge-metrics-test.com'))
        .returning()
      normalUser = normalUser[0]
    } else {
      normalUser = await db.insert(users)
        .values({
          email: 'user@ge-metrics-test.com',
          username: 'normal_test',
          passwordHash,
          salt,
          name: 'Test User'
        })
        .returning()
      normalUser = normalUser[0]
    }

    // Create normal user subscription (14-day trial)
    const existingUserSub = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, normalUser.id))
      .limit(1)

    if (existingUserSub.length === 0) {
      const now = new Date()
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      const billingEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

      await db.insert(subscriptions)
        .values({
          userId: normalUser.id,
          status: 'trialing',
          plan: 'trial',
          currentPeriodStart: now,
          currentPeriodEnd: billingEnd, // 30-day billing cycle
          cancelAtPeriodEnd: false
        })
    }

    console.log('✅ Normal user created successfully!')
    console.log('   Email: user@ge-metrics-test.com')
    console.log(`   Password: ${TEST_PASSWORD}`)
    console.log('   Role: user (with 14-day trial)')

    // 3. Create Expired Trial User (for testing expired state)
    console.log('⏰ Creating expired trial user...')

    const existingExpiredUser = await db.select()
      .from(users)
      .where(eq(users.email, 'expired@ge-metrics-test.com'))
      .limit(1)

    let expiredUser
    if (existingExpiredUser.length > 0) {
      console.log('⚠️  Expired user already exists, updating...')
      expiredUser = await db.update(users)
        .set({
          username: 'expired_test',
          passwordHash,
          salt,
          name: 'Expired Trial User',
          updatedAt: new Date()
        })
        .where(eq(users.email, 'expired@ge-metrics-test.com'))
        .returning()
      expiredUser = expiredUser[0]
    } else {
      expiredUser = await db.insert(users)
        .values({
          email: 'expired@ge-metrics-test.com',
          username: 'expired_test',
          passwordHash,
          salt,
          name: 'Expired Trial User'
        })
        .returning()
      expiredUser = expiredUser[0]
    }

    // Create expired subscription
    const existingExpiredSub = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, expiredUser.id))
      .limit(1)

    if (existingExpiredSub.length === 0) {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

      await db.insert(subscriptions)
        .values({
          userId: expiredUser.id,
          status: 'canceled',
          plan: 'trial',
          currentPeriodStart: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: pastDate,
          cancelAtPeriodEnd: true
        })
    }

    console.log('✅ Expired trial user created successfully!')
    console.log('   Email: expired@ge-metrics-test.com')
    console.log(`   Password: ${TEST_PASSWORD}`)
    console.log('   Status: Trial expired (for testing blocked access)')

    console.log('\n🎉 All test accounts created successfully!')
    console.log('\n📋 Test Account Summary:')
    console.log('┌─────────────────────────────────────────────────────────────┐')
    console.log('│                        TEST ACCOUNTS                        │')
    console.log('├─────────────────────────────────────────────────────────────┤')
    console.log('│ ADMIN ACCOUNT:                                              │')
    console.log('│   Email: admin@ge-metrics-test.com                         │')
    console.log('│   Password: Noob1234                                       │')
    console.log('│   Role: admin (full permissions)                           │')
    console.log('│   Status: Active Premium                                   │')
    console.log('├─────────────────────────────────────────────────────────────┤')
    console.log('│ NORMAL USER ACCOUNT:                                        │')
    console.log('│   Email: user@ge-metrics-test.com                          │')
    console.log('│   Password: Noob1234                                       │')
    console.log('│   Role: user (basic access)                                │')
    console.log('│   Status: 14-day trial (premium features)                  │')
    console.log('├─────────────────────────────────────────────────────────────┤')
    console.log('│ EXPIRED TRIAL ACCOUNT:                                      │')
    console.log('│   Email: expired@ge-metrics-test.com                       │')
    console.log('│   Password: Noob1234                                       │')
    console.log('│   Role: user                                               │')
    console.log('│   Status: Expired trial (blocked access)                   │')
    console.log('└─────────────────────────────────────────────────────────────┘')
  } catch (error) {
    console.error('❌ Error creating test accounts:', error)
    process.exit(1)
  }
}

// Run the script
createTestAccounts()
  .then(() => {
    console.log('✨ Test accounts setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to create test accounts:', error)
    process.exit(1)
  })
