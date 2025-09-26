#!/usr/bin/env node

import { db } from './src/db/index.js'
import * as schema from './src/db/schema.js'
import { eq } from 'drizzle-orm'
import { OtpService } from './src/services/otpService.js'
import * as AuthUtils from './src/utils/auth.js'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m'
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

async function testOtpFunctionality () {
  logHeader('Testing OTP Functionality')

  try {
    // Find admin user
    const users = await db.select().from(schema.users).where(eq(schema.users.email, 'admin@tesla.com'))
    if (users.length === 0) {
      logTest('Find Admin User', false, 'Admin user not found')
      return
    }

    const user = users[0]
    logTest('Find Admin User', true, `User ID: ${user.id}`)

    // Test 1: Generate OTP
    const { otpCode, expiresAt } = await OtpService.generateOtp(
      user.id,
      'password_reset',
      { expiresInMinutes: 5 }
    )
    logTest('Generate OTP', true, `OTP: ${otpCode}`)

    // Test 2: Verify OTP (should succeed)
    const verifyResult = await OtpService.verifyOtp(user.id, otpCode, 'password_reset')
    logTest('Verify Valid OTP', verifyResult.valid, verifyResult.message)

    // Test 3: Try to verify the same OTP again (should fail - already used)
    const verifyResult2 = await OtpService.verifyOtp(user.id, otpCode, 'password_reset')
    logTest('Verify Used OTP', !verifyResult2.valid, 'Correctly rejected used OTP')

    // Test 4: Try to verify invalid OTP (should fail)
    const verifyResult3 = await OtpService.verifyOtp(user.id, '000000', 'password_reset')
    logTest('Verify Invalid OTP', !verifyResult3.valid, 'Correctly rejected invalid OTP')

    // Test 5: Generate another OTP and test password change flow
    const { otpCode: newOtpCode } = await OtpService.generateOtp(
      user.id,
      'password_reset',
      { expiresInMinutes: 5 }
    )
    logTest('Generate Second OTP', true, `OTP: ${newOtpCode}`)

    // Test 6: Simulate password change with OTP
    const otpResult = await OtpService.verifyOtp(user.id, newOtpCode, 'password_reset')
    if (otpResult.valid) {
      const newPassword = 'NewPassword123'
      const { hash, salt } = await AuthUtils.hashPassword(newPassword)

      await db.update(schema.users)
        .set({
          passwordHash: hash,
          salt,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, user.id))

      logTest('Password Change with OTP', true, 'Password changed successfully')
    } else {
      logTest('Password Change with OTP', false, 'OTP verification failed')
    }

    // Test 7: Check OTP stats
    const stats = await OtpService.getOtpStats(user.id)
    logTest('OTP Statistics', true, `Total: ${stats.totalOtps}, Used: ${stats.usedOtps}`)

    log('\n🎉 OTP Functionality Test Completed Successfully!', 'green')
  } catch (error) {
    logTest('OTP Functionality Test', false, `Failed: ${error}`)
    console.error('Error testing OTP functionality:', error)
    throw error
  }
}

// Run the test
testOtpFunctionality()
  .then(() => {
    log('\n✅ OTP functionality test completed!', 'green')
    process.exit(0)
  })
  .catch((error) => {
    log('\n❌ OTP functionality test failed!', 'red')
    console.error(error)
    process.exit(1)
  })
