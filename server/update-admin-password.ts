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

async function updateAdminPassword () {
  logHeader('Updating Admin Password')

  try {
    // Find the admin user
    const users = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@tesla.com'))

    if (users.length === 0) {
      logTest('Admin User - Check Existing', false, 'Admin user not found')
      return
    }

    const user = users[0]
    logTest('Admin User - Found', true, `User ID: ${user.id}`)

    // Hash new password
    const saltRounds = 12
    const newPassword = 'Admin123!'
    const passwordHash = await bcrypt.hash(newPassword, saltRounds)
    const salt = await bcrypt.genSalt(saltRounds)

    // Update user password
    const updatedUser = await db.update(schema.users)
      .set({
        passwordHash,
        salt,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, user.id))
      .returning()

    logTest('Admin User - Update Password', updatedUser.length > 0, 'Password updated')

    log('\n🎉 Admin Password Updated Successfully!', 'green')
    log('\n📊 Updated Admin User Details:', 'blue')
    log('Email: admin@tesla.com', 'yellow')
    log('Password: Admin123!', 'yellow')
    log(`User ID: ${user.id}`, 'yellow')
    log('Role: Admin', 'yellow')

    return user.id
  } catch (error) {
    logTest('Admin Password Update', false, `Failed: ${error}`)
    console.error('Error updating admin password:', error)
    throw error
  }
}

// Run the script
updateAdminPassword()
  .then(() => {
    log('\n✅ Admin password update completed!', 'green')
    process.exit(0)
  })
  .catch((error) => {
    log('\n❌ Admin password update failed!', 'red')
    console.error(error)
    process.exit(1)
  })
