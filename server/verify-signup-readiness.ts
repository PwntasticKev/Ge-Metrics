#!/usr/bin/env tsx
/**
 * Complete Signup Readiness Verification
 * Run: cd server && npx tsx verify-signup-readiness.ts
 * 
 * This script checks all requirements for user signup functionality
 */

import dotenv from 'dotenv'
import { sendEmail, verifyEmailConnection } from './src/services/emailService.js'
import Stripe from 'stripe'
import { db } from './src/db/index.js'

dotenv.config()

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  critical: boolean
}

const results: CheckResult[] = []

function addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, critical = true) {
  results.push({ name, status, message, critical })
  
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
  const priority = critical ? '[CRITICAL]' : '[OPTIONAL]'
  console.log(`${icon} ${priority} ${name}: ${message}`)
}

async function checkDatabase() {
  try {
    // Test database connection
    const testQuery = await db.execute('SELECT 1 as test')
    if (testQuery.rows.length > 0) {
      addResult('Database Connection', 'pass', 'Connected successfully')
    } else {
      addResult('Database Connection', 'fail', 'Query returned no results')
    }
  } catch (error) {
    addResult('Database Connection', 'fail', `Failed: ${(error as Error).message}`)
  }
}

async function checkEmailService() {
  // Check environment variables
  const hasAWS = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.SES_FROM_EMAIL)
  const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  const hasResend = !!process.env.RESEND_API_KEY
  
  if (!hasAWS && !hasSMTP && !hasResend) {
    addResult('Email Service Config', 'fail', 'No email service configured (AWS SES, SMTP, or Resend)')
    return
  }
  
  let configType = hasAWS ? 'AWS SES' : hasSMTP ? 'SMTP' : 'Resend'
  addResult('Email Service Config', 'pass', `${configType} configured`)
  
  // Test connection
  try {
    const connectionOk = await verifyEmailConnection()
    if (connectionOk) {
      addResult('Email Connection', 'pass', 'Email service connection verified')
    } else {
      addResult('Email Connection', 'fail', 'Email service connection failed')
    }
  } catch (error) {
    addResult('Email Connection', 'fail', `Connection test failed: ${(error as Error).message}`)
  }
}

async function checkStripeService() {
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY', 
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_MONTHLY',
    'STRIPE_PRICE_YEARLY',
    'STRIPE_PRODUCT_PREMIUM'
  ]
  
  const missing = requiredVars.filter(v => !process.env[v])
  
  if (missing.length > 0) {
    addResult('Stripe Configuration', 'fail', `Missing: ${missing.join(', ')}`)
    return
  }
  
  addResult('Stripe Configuration', 'pass', 'All Stripe environment variables configured')
  
  // Test Stripe connection
  if (!process.env.STRIPE_SECRET_KEY) return
  
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as any
    })
    
    const account = await stripe.accounts.retrieve()
    addResult('Stripe Connection', 'pass', `Connected to account: ${account.email || account.id}`)
    
    // Test products exist
    const productChecks = [
      { id: process.env.STRIPE_PRODUCT_PREMIUM, name: 'Product' },
      { id: process.env.STRIPE_PRICE_MONTHLY, name: 'Monthly Price' },
      { id: process.env.STRIPE_PRICE_YEARLY, name: 'Yearly Price' }
    ]
    
    for (const check of productChecks) {
      if (!check.id) continue
      
      try {
        if (check.name === 'Product') {
          await stripe.products.retrieve(check.id)
        } else {
          await stripe.prices.retrieve(check.id)
        }
        addResult(`Stripe ${check.name}`, 'pass', `${check.name} exists in Stripe`, false)
      } catch (e) {
        addResult(`Stripe ${check.name}`, 'fail', `${check.name} not found: ${check.id}`)
      }
    }
    
  } catch (error) {
    addResult('Stripe Connection', 'fail', `API connection failed: ${(error as Error).message}`)
  }
}

function checkEnvironment() {
  const critical = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET', 
    'JWT_REFRESH_SECRET',
    'FRONTEND_URL'
  ]
  
  const missing = critical.filter(v => !process.env[v])
  
  if (missing.length > 0) {
    addResult('Core Environment', 'fail', `Missing critical vars: ${missing.join(', ')}`)
  } else {
    addResult('Core Environment', 'pass', 'All core environment variables configured')
  }
  
  // Check URL format
  const frontendUrl = process.env.FRONTEND_URL
  if (frontendUrl && !frontendUrl.startsWith('http')) {
    addResult('Frontend URL', 'warning', 'FRONTEND_URL should start with http:// or https://', false)
  }
}

async function simulateSignupFlow() {
  console.log('\n🧪 Testing Signup Flow Components...')
  
  // Test email sending (without actually sending)
  try {
    const emailTest = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      text: 'This is a test',
      html: '<p>This is a test</p>'
    })
    
    if (emailTest.success) {
      addResult('Email Sending', 'pass', 'Email service can send emails', false)
    } else {
      addResult('Email Sending', 'fail', `Email sending failed: ${emailTest.error}`)
    }
  } catch (error) {
    addResult('Email Sending', 'fail', `Email test failed: ${(error as Error).message}`)
  }
}

async function main() {
  console.log('🔍 GE-Metrics Signup Readiness Check\n')
  console.log('Checking all requirements for user signup functionality...\n')
  
  await checkEnvironment()
  await checkDatabase()
  await checkEmailService() 
  await checkStripeService()
  await simulateSignupFlow()
  
  console.log('\n📊 Summary:')
  console.log('='.repeat(50))
  
  const criticalIssues = results.filter(r => r.critical && r.status === 'fail')
  const warnings = results.filter(r => r.status === 'warning')
  const passed = results.filter(r => r.status === 'pass')
  
  console.log(`✅ Passed: ${passed.length}/${results.length} checks`)
  console.log(`⚠️  Warnings: ${warnings.length}`)
  console.log(`❌ Critical Issues: ${criticalIssues.length}`)
  
  if (criticalIssues.length === 0) {
    console.log('\n🎉 SIGNUP READY! Your platform can accept user signups!')
    console.log('\n📋 Next Steps:')
    console.log('1. Test the full signup flow manually with a real email')
    console.log('2. Monitor logs for any issues during real signups')
    console.log('3. Set up Stripe webhook monitoring')
    console.log('4. Plan production deployment')
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Address warnings for optimal experience:')
      warnings.forEach(w => console.log(`   • ${w.name}: ${w.message}`))
    }
  } else {
    console.log('\n🚫 SIGNUP NOT READY - Fix critical issues first:')
    criticalIssues.forEach(issue => console.log(`   • ${issue.name}: ${issue.message}`))
    
    console.log('\n🛠️  Quick Fixes:')
    console.log('• Email: Run "npx tsx test-email-setup.ts" for detailed email setup')
    console.log('• Stripe: Run "npx tsx test-stripe-setup.ts" for detailed Stripe setup') 
    console.log('• Environment: Check your .env file has all required variables')
    console.log('• Database: Verify DATABASE_URL is correct and accessible')
  }
  
  console.log('\n📖 Full setup guide: ./SIGNUP_SETUP_CHECKLIST.md')
}

main().catch(error => {
  console.error('❌ Verification script failed:', error)
  process.exit(1)
})