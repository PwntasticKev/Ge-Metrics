#!/usr/bin/env tsx
/**
 * Stripe Setup Test Script
 * Run: cd server && npx tsx test-stripe-setup.ts
 */

import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config()

async function testStripeSetup() {
  console.log('🔍 Testing Stripe Configuration...\n')
  
  // Check environment variables
  console.log('📋 Environment Check:')
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_PRICE_MONTHLY',
    'STRIPE_PRICE_YEARLY',
    'STRIPE_PRODUCT_PREMIUM'
  ]
  
  const missing = requiredVars.filter(v => !process.env[v])
  
  if (missing.length > 0) {
    console.log('❌ Missing environment variables:', missing.join(', '))
    console.log('\n📝 Setup Instructions:')
    console.log('1. Go to https://dashboard.stripe.com')
    console.log('2. Create a product called "GE-Metrics Premium"')
    console.log('3. Add two prices: Monthly ($9.99) and Yearly ($99.99)')
    console.log('4. Copy the IDs to your .env file')
    console.log('\nExample .env:')
    console.log('STRIPE_SECRET_KEY=sk_test_...')
    console.log('STRIPE_PUBLISHABLE_KEY=pk_test_...')
    console.log('STRIPE_WEBHOOK_SECRET=whsec_...')
    console.log('STRIPE_PRICE_MONTHLY=price_...')
    console.log('STRIPE_PRICE_YEARLY=price_...')
    console.log('STRIPE_PRODUCT_PREMIUM=prod_...')
    
    if (!process.env.STRIPE_SECRET_KEY) {
      process.exit(1)
    }
  } else {
    console.log('✅ All Stripe environment variables configured')
  }
  
  // Test Stripe connection
  console.log('\n📡 Testing Stripe API Connection...')
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('❌ No STRIPE_SECRET_KEY found')
    process.exit(1)
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any
  })
  
  try {
    // Test API key validity
    const account = await stripe.accounts.retrieve()
    console.log('✅ Connected to Stripe account:', account.email || account.id)
    console.log('   Mode:', process.env.STRIPE_SECRET_KEY.includes('sk_test') ? 'TEST' : 'LIVE')
    
    // Check if products exist
    if (process.env.STRIPE_PRODUCT_PREMIUM) {
      try {
        const product = await stripe.products.retrieve(process.env.STRIPE_PRODUCT_PREMIUM)
        console.log(`✅ Product found: ${product.name}`)
      } catch (e) {
        console.log('❌ Product not found:', process.env.STRIPE_PRODUCT_PREMIUM)
        console.log('   Create it in Stripe Dashboard')
      }
    }
    
    // Check if prices exist
    const priceChecks = [
      { env: 'STRIPE_PRICE_MONTHLY', name: 'Monthly price' },
      { env: 'STRIPE_PRICE_YEARLY', name: 'Yearly price' }
    ]
    
    for (const check of priceChecks) {
      if (process.env[check.env]) {
        try {
          const price = await stripe.prices.retrieve(process.env[check.env]!)
          const amount = (price.unit_amount || 0) / 100
          const interval = price.recurring?.interval || 'one-time'
          console.log(`✅ ${check.name}: $${amount}/${interval}`)
        } catch (e) {
          console.log(`❌ ${check.name} not found:`, process.env[check.env])
        }
      }
    }
    
    // Test webhook endpoint setup
    console.log('\n🔗 Webhook Configuration:')
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      console.log('✅ Webhook secret configured')
      console.log('   Endpoint URL: https://your-domain.com/stripe/webhook')
      console.log('   Required events:')
      console.log('   - checkout.session.completed')
      console.log('   - customer.subscription.created')
      console.log('   - customer.subscription.updated')
      console.log('   - customer.subscription.deleted')
      console.log('   - invoice.payment_succeeded')
      console.log('   - invoice.payment_failed')
    } else {
      console.log('⚠️  No webhook secret configured')
      console.log('   1. Go to Stripe Dashboard → Webhooks')
      console.log('   2. Add endpoint: https://your-domain.com/stripe/webhook')
      console.log('   3. Copy signing secret to STRIPE_WEBHOOK_SECRET')
    }
    
    // Create test checkout session
    console.log('\n🧪 Creating Test Checkout Session...')
    
    if (process.env.STRIPE_PRICE_MONTHLY) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price: process.env.STRIPE_PRICE_MONTHLY,
            quantity: 1
          }],
          mode: 'subscription',
          success_url: 'http://localhost:5173/signup/success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'http://localhost:5173/signup/cancel',
          subscription_data: {
            trial_period_days: 30
          },
          metadata: {
            userId: 'test-user-123'
          }
        })
        
        console.log('✅ Test checkout session created!')
        console.log('   Session ID:', session.id)
        console.log('   Test URL:', session.url)
        console.log('\n💳 Test Card Numbers:')
        console.log('   Success: 4242 4242 4242 4242')
        console.log('   Decline: 4000 0000 0000 0002')
        console.log('   3D Secure: 4000 0025 0000 3155')
        console.log('   Use any future date and any CVC')
      } catch (e) {
        console.log('❌ Failed to create checkout session:', (e as Error).message)
      }
    }
    
    console.log('\n✅ Stripe setup test complete!')
    console.log('\n📋 Next Steps:')
    console.log('1. Complete any missing configuration above')
    console.log('2. Test the full signup flow with a real email')
    console.log('3. Monitor webhook events in Stripe Dashboard')
    console.log('4. Set up production keys when ready')
    
  } catch (error) {
    console.log('❌ Stripe connection failed:', (error as Error).message)
    console.log('\nCheck that your STRIPE_SECRET_KEY is valid')
    process.exit(1)
  }
}

// Run the test
testStripeSetup().catch(console.error)