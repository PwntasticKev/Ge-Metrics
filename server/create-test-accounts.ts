/**
 * Create Test Accounts for Authentication Testing
 * Creates admin and normal user accounts in the database
 */

import { db } from './src/db'
import { users, employees, subscriptions, NewUser } from './src/db/schema'
import { AuthUtils } from './src/utils/auth'
import { eq } from 'drizzle-orm'
import dotenv from 'dotenv'

dotenv.config()

if (process.env.NODE_ENV === 'production') {
  console.error('❌ This script is for development use only and cannot be run in production.')
  process.exit(1)
}

const TEST_PASSWORD = 'Noob1234'

async function createTestAccounts () {
  try {
    console.log('🔧 Creating test accounts...')

    // 1. Create Admin User
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@ge-metrics-test.com')).limit(1)
    if (existingAdmin.length === 0) {
      const { hash, salt } = await AuthUtils.hashPassword(TEST_PASSWORD)
      const newAdmin: NewUser = {
        email: 'admin@ge-metrics-test.com',
        username: 'admin_user',
        passwordHash: hash,
        salt,
        name: 'Admin User',
        emailVerified: true // Pre-verify for testing
      }
      const [adminUser] = await db.insert(users).values(newAdmin).returning()

      if (adminUser) {
        // Create admin employee record
        await db.insert(employees).values({
          userId: adminUser.id,
          role: 'admin',
          department: 'Administration',
          isActive: true,
          permissions: {
            'users:read': true,
            'users:write': true,
            'users:delete': true,
            'billing:read': true,
            'billing:write': true,
            'system:read': true,
            'system:write': true,
            'admin:access': true
          }
        })

        // Create admin subscription (active premium)
        const now = new Date()
        const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        await db.insert(subscriptions).values({
          userId: adminUser.id,
          status: 'active',
          plan: 'premium',
          currentPeriodStart: now,
          currentPeriodEnd: futureDate,
          cancelAtPeriodEnd: false
        })
        console.log('✅ Admin user created successfully!')
        console.log('   Email: admin@ge-metrics-test.com')
        console.log(`   Password: ${TEST_PASSWORD}`)
        console.log('   Role: admin')
        console.log('   Status: Active Premium')
      }
    }

    // 2. Create Normal User
    const existingUser = await db.select().from(users).where(eq(users.email, 'user@ge-metrics-test.com')).limit(1)
    if (existingUser.length === 0) {
      const { hash, salt } = await AuthUtils.hashPassword(TEST_PASSWORD)
      const newNormalUser: NewUser = {
        email: 'user@ge-metrics-test.com',
        username: 'normal_user',
        passwordHash: hash,
        salt,
        name: 'Normal User',
        emailVerified: true // Pre-verify for testing
      }
      const [normalUser] = await db.insert(users).values(newNormalUser).returning()

      if (normalUser) {
        // Create normal user subscription (14-day trial)
        const now = new Date()
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
        await db.insert(subscriptions).values({
          userId: normalUser.id,
          status: 'trialing',
          plan: 'premium',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          cancelAtPeriodEnd: false
        })
        console.log('✅ Normal user created successfully!')
        console.log('   Email: user@ge-metrics-test.com')
        console.log(`   Password: ${TEST_PASSWORD}`)
        console.log('   Role: user (with 14-day trial)')
        console.log('   Status: 14-day trial (premium features)')
      }
    }

    // 3. Create Expired Trial User
    const existingExpiredUser = await db.select().from(users).where(eq(users.email, 'expired@ge-metrics-test.com')).limit(1)
    if (existingExpiredUser.length === 0) {
      const { hash, salt } = await AuthUtils.hashPassword(TEST_PASSWORD)
      const newExpiredUser: NewUser = {
        email: 'expired@ge-metrics-test.com',
        username: 'expired_user',
        passwordHash: hash,
        salt,
        name: 'Expired User',
        emailVerified: true // Pre-verify for testing
      }
      const [expiredUser] = await db.insert(users).values(newExpiredUser).returning()

      if (expiredUser) {
        // Create expired subscription
        const now = new Date()
        const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        await db.insert(subscriptions).values({
          userId: expiredUser.id,
          status: 'canceled', // or 'past_due'
          plan: 'premium',
          currentPeriodStart: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000), // Trial started 21 days ago
          currentPeriodEnd: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Trial ended 7 days ago
          cancelAtPeriodEnd: true
        })
        console.log('✅ Expired trial user created successfully!')
        console.log('   Email: expired@ge-metrics-test.com')
        console.log(`   Password: ${TEST_PASSWORD}`)
        console.log('   Status: Trial expired (for testing blocked access)')
      }
    }

    console.log('\n🎉 All test accounts are set up!')
  } catch (error) {
    console.error('❌ Error creating test accounts:', error)
    process.exit(1)
  }
}

createTestAccounts()
