#!/usr/bin/env tsx
/**
 * Email Setup Test Script
 * Run: cd server && npx tsx test-email-setup.ts
 */

import dotenv from 'dotenv'
import { sendEmail, verifyEmailConnection } from './src/services/emailService.js'

dotenv.config()

const TEST_EMAIL = process.argv[2] || 'your-email@example.com'

async function testEmailSetup() {
  console.log('🔍 Testing Email Configuration...\n')
  
  // Check environment variables
  console.log('📋 Environment Check:')
  const checks = {
    'AWS SES': {
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.SES_FROM_EMAIL),
      vars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'SES_FROM_EMAIL']
    },
    'SMTP': {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      vars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL']
    },
    'Resend': {
      configured: !!process.env.RESEND_API_KEY,
      vars: ['RESEND_API_KEY', 'FROM_EMAIL']
    }
  }
  
  let anyConfigured = false
  for (const [service, config] of Object.entries(checks)) {
    if (config.configured) {
      console.log(`✅ ${service} is configured`)
      anyConfigured = true
    } else {
      console.log(`❌ ${service} not configured (missing: ${config.vars.filter(v => !process.env[v]).join(', ')})`)
    }
  }
  
  if (!anyConfigured) {
    console.log('\n⚠️  No email service configured!')
    console.log('Please configure AWS SES, SMTP, or Resend in your .env file')
    process.exit(1)
  }
  
  // Test connection
  console.log('\n📡 Testing Connection...')
  const connectionOk = await verifyEmailConnection()
  
  if (!connectionOk) {
    console.log('❌ Email connection failed')
    console.log('Check your credentials and try again')
    process.exit(1)
  }
  
  console.log('✅ Email connection verified')
  
  // Send test email
  if (TEST_EMAIL === 'your-email@example.com') {
    console.log('\n⚠️  Skipping test email (no recipient specified)')
    console.log('Run: npx tsx test-email-setup.ts your-actual-email@example.com')
    return
  }
  
  console.log(`\n📧 Sending test email to: ${TEST_EMAIL}`)
  
  const result = await sendEmail({
    to: TEST_EMAIL,
    subject: 'GE-Metrics Email Test',
    html: `
      <h2>Email Configuration Test</h2>
      <p>If you're reading this, your email setup is working! 🎉</p>
      <p>This test email confirms that GE-Metrics can send:</p>
      <ul>
        <li>✅ User verification emails</li>
        <li>✅ Password reset emails</li>
        <li>✅ Subscription notifications</li>
      </ul>
      <p>Your signup flow is ready to go!</p>
    `,
    text: 'Email test successful! Your GE-Metrics email configuration is working.'
  })
  
  if (result.success) {
    console.log('✅ Test email sent successfully!')
    console.log('Message ID:', result.messageId)
    console.log('\n🎉 Email setup complete! Check your inbox (and spam folder)')
  } else {
    console.log('❌ Failed to send test email')
    console.log('Error:', result.error)
  }
}

// Run the test
testEmailSetup().catch(console.error)