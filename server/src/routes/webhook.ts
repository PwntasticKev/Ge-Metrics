import express from 'express'
import { validateWebhookSignature } from '../config/stripe.js'
import { subscriptionService } from '../services/subscriptionService.js'
import { config } from '../config/index.js'

const router = express.Router()

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = config.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  try {
    // Validate webhook signature
    const event = validateWebhookSignature(req.body, sig, webhookSecret)
    
    console.log(`🔔 Webhook received: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await subscriptionService.handleSubscriptionCreated(event.data.object)
        console.log('✅ Subscription created:', event.data.object.id)
        break

      case 'customer.subscription.updated':
        await subscriptionService.handleSubscriptionUpdated(event.data.object)
        console.log('✅ Subscription updated:', event.data.object.id)
        break

      case 'customer.subscription.deleted':
        await subscriptionService.handleSubscriptionDeleted(event.data.object)
        console.log('✅ Subscription deleted:', event.data.object.id)
        break

      case 'invoice.payment_succeeded':
        await subscriptionService.handleInvoicePaymentSucceeded(event.data.object)
        console.log('✅ Invoice payment succeeded:', event.data.object.id)
        break

      case 'invoice.payment_failed':
        await subscriptionService.handleInvoicePaymentFailed(event.data.object)
        console.log('❌ Invoice payment failed:', event.data.object.id)
        break

      case 'checkout.session.completed':
        console.log('✅ Checkout session completed:', event.data.object.id)
        // Additional checkout completion logic can be added here
        break

      case 'customer.subscription.trial_will_end':
        console.log('⚠️ Trial will end:', event.data.object.id)
        // You can add trial ending notification logic here
        break

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('❌ Webhook error:', err)
    
    if (err instanceof Error && err.message.includes('Invalid webhook signature')) {
      return res.status(400).json({ error: 'Invalid signature' })
    }
    
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
})

export { router as webhookRouter }
