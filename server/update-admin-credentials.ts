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

async function updateAdminCredentials () {
  logHeader('Updating Admin Credentials')

  try {
    // Find the existing admin user
    const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@test.com'))

    if (existingUser.length === 0) {
      logTest('Admin User - Check Existing', false, 'Admin user not found')
      return
    }

    const userId = existingUser[0].id
    logTest('Admin User - Found', true, `User ID: ${userId}`)

    // Hash new password
    const saltRounds = 12
    const newPassword = 'Admin123'
    const passwordHash = await bcrypt.hash(newPassword, saltRounds)
    const salt = await bcrypt.genSalt(saltRounds)

    // Update user credentials
    const updatedUser = await db.update(schema.users)
      .set({
        email: 'admin@tesla.com',
        passwordHash,
        salt,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, userId))
      .returning()

    logTest('Admin User - Update Credentials', updatedUser.length > 0, 'Credentials updated')

    log('\n🎉 Admin Credentials Updated Successfully!', 'green')
    log('\n📊 New Admin User Details:', 'blue')
    log('Email: admin@tesla.com', 'yellow')
    log('Password: Admin123', 'yellow')
    log(`User ID: ${userId}`, 'yellow')
    log('Role: Admin', 'yellow')

    return userId
  } catch (error) {
    logTest('Admin User Update', false, `Failed: ${error}`)
    console.error('Error updating admin user:', error)
    throw error
  }
}

// Run the script
updateAdminCredentials()
  .then(() => {
    log('\n✅ Admin credentials update completed!', 'green')
    process.exit(0)
  })
  .catch((error) => {
    log('\n❌ Admin credentials update failed!', 'red')
    console.error(error)
    process.exit(1)
  })
