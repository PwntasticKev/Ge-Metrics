import Stripe from 'stripe'
import { config } from './index.js'

if (!config.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required')
}

export const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// Stripe configuration constants
export const STRIPE_CONFIG = {
  // Webhook configuration
  WEBHOOK_ENDPOINT_SECRET: config.STRIPE_WEBHOOK_SECRET || '',
  
  // Price IDs for different plans
  PRICES: {
    MONTHLY: config.STRIPE_PRICE_MONTHLY || 'price_monthly_default',
    YEARLY: config.STRIPE_PRICE_YEARLY || 'price_yearly_default',
  },
  
  // Product configuration
  PRODUCTS: {
    PREMIUM: config.STRIPE_PRODUCT_PREMIUM || 'prod_premium_default',
  },
  
  // Trial configuration
  TRIAL_DAYS: 30,
  
  // Customer portal configuration
  PORTAL_SETTINGS: {
    features: {
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true },
      subscription_pause: { enabled: false },
      subscription_update: { enabled: true },
      invoice_history: { enabled: true },
    },
  },
  
  // Checkout session configuration
  CHECKOUT_SETTINGS: {
    mode: 'subscription' as const,
    payment_method_types: ['card'],
    billing_address_collection: 'required',
    allow_promotion_codes: true,
    automatic_tax: { enabled: false },
    customer_update: {
      name: 'auto',
      address: 'auto',
    },
  },
}

// Helper function to validate webhook signature
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string,
  endpointSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    throw new Error('Invalid webhook signature')
  }
}

// Helper function to create customer portal session
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    configuration: undefined, // Use default configuration or specify custom one
  })
}

// Helper function to create checkout session
export async function createCheckoutSession(params: {
  priceId: string
  customerId?: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
  trialDays?: number
  metadata?: Record<string, string>
}): Promise<Stripe.Checkout.Session> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    ...STRIPE_CONFIG.CHECKOUT_SETTINGS,
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata || {},
  }

  // Add customer information
  if (params.customerId) {
    sessionParams.customer = params.customerId
  } else if (params.customerEmail) {
    sessionParams.customer_email = params.customerEmail
  }

  // Add trial period if specified
  if (params.trialDays && params.trialDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: params.trialDays,
    }
  }

  return await stripe.checkout.sessions.create(sessionParams)
}

// Helper function to get or create customer
export async function getOrCreateCustomer(
  email: string,
  name?: string,
  userId?: string
): Promise<Stripe.Customer> {
  // First, try to find existing customer by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }

  // Create new customer
  const customerData: Stripe.CustomerCreateParams = {
    email,
    name,
    metadata: {},
  }

  if (userId) {
    customerData.metadata!.userId = userId
  }

  return await stripe.customers.create(customerData)
}

// Helper function to cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  } else {
    return await stripe.subscriptions.cancel(subscriptionId)
  }
}

// Helper function to update subscription
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })
}

// Helper function to process refund
export async function processRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
  }

  if (amount) {
    refundParams.amount = Math.round(amount * 100) // Convert to cents
  }

  return await stripe.refunds.create(refundParams)
}

export default stripe
