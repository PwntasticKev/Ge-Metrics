#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq } from 'drizzle-orm'
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

// Admin user data
const adminUser = {
  email: 'admin@test.com',
  username: 'admin',
  password: 'Admin123!',
  name: 'Admin User',
  avatar: 'https://example.com/admin-avatar.jpg'
}

async function createAdminUser () {
  logHeader('Creating Master Admin User')

  try {
    // Check if admin user already exists
    const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, adminUser.email))

    if (existingUser.length > 0) {
      logTest('Admin User - Check Existing', true, 'Admin user already exists')
      log('\n📊 Admin User Details:', 'blue')
      log(`Email: ${adminUser.email}`, 'yellow')
      log(`Username: ${adminUser.username}`, 'yellow')
      log(`Password: ${adminUser.password}`, 'yellow')
      log(`User ID: ${existingUser[0].id}`, 'yellow')
      return existingUser[0].id
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(adminUser.password, saltRounds)
    const salt = await bcrypt.genSalt(saltRounds)

    // Create admin user
    const newUser = await db.insert(schema.users).values({
      email: adminUser.email,
      username: adminUser.username,
      passwordHash,
      salt,
      name: adminUser.name,
      avatar: adminUser.avatar
    }).returning()

    const userId = newUser[0].id
    logTest('Admin User - Create User', true, `Created admin user: ${userId}`)

    // Create employee record with admin role
    const employee = await db.insert(schema.employees).values({
      userId,
      role: 'admin',
      department: 'Administration',
      isActive: true,
      permissions: {
        canManageUsers: true,
        canManageSubscriptions: true,
        canViewAuditLogs: true,
        canManageEmployees: true,
        canAccessAdminPanel: true
      }
    }).returning()

    logTest('Admin User - Create Employee Record', employee.length > 0, 'Admin employee record created')

    // Create premium subscription for admin
    const subscription = await db.insert(schema.subscriptions).values({
      userId,
      status: 'active',
      plan: 'premium',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      cancelAtPeriodEnd: false
    }).returning()

    logTest('Admin User - Create Subscription', subscription.length > 0, 'Premium subscription created')

    // Create sample watchlist items for admin
    const watchlistItems = await db.insert(schema.userWatchlists).values([
      {
        userId,
        itemId: '537',
        itemName: 'Dragon Bones',
        targetPrice: 5000,
        alertType: 'price',
        isActive: true
      },
      {
        userId,
        itemId: '1127',
        itemName: 'Rune Platebody',
        targetPrice: 40000,
        alertType: 'volume',
        isActive: true
      }
    ]).returning()

    logTest('Admin User - Create Watchlist', watchlistItems.length === 2, 'Watchlist items created')

    log('\n🎉 Admin User Created Successfully!', 'green')
    log('\n📊 Admin User Details:', 'blue')
    log(`Email: ${adminUser.email}`, 'yellow')
    log(`Username: ${adminUser.username}`, 'yellow')
    log(`Password: ${adminUser.password}`, 'yellow')
    log(`User ID: ${userId}`, 'yellow')
    log('Role: Admin', 'yellow')
    log('Subscription: Premium', 'yellow')

    return userId
  } catch (error) {
    logTest('Admin User Creation', false, `Failed: ${error}`)
    console.error('Error creating admin user:', error)
    throw error
  }
}

// Run the script
createAdminUser()
  .then(() => {
    log('\n✅ Admin user creation completed!', 'green')
    process.exit(0)
  })
  .catch((error) => {
    log('\n❌ Admin user creation failed!', 'red')
    console.error(error)
    process.exit(1)
  })
