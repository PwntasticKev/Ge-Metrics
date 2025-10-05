import Stripe from 'stripe'
import { config } from '../config/index.js'

// Initialize Stripe
const stripe = new Stripe(config.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20'
})

export { stripe }

// Stripe utility functions
export class StripeService {
  // Get or create customer
  static async getOrCreateCustomer (userId: number, email: string, name?: string) {
    try {
      // First, try to find existing customer by metadata
      const customers = await stripe.customers.list({
        limit: 1,
        email
      })

      if (customers.data.length > 0) {
        return customers.data[0]
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: {
          userId: userId.toString()
        }
      })

      return customer
    } catch (error: any) {
      console.error('[STRIPE] Error creating/retrieving customer:', error)
      throw new Error(`Stripe customer error: ${error.message}`)
    }
  }

  // Update customer subscription
  static async updateSubscription (subscriptionId: string, updates: {
    priceId?: string
    trialEnd?: number // Unix timestamp
    cancelAtPeriodEnd?: boolean
    metadata?: Record<string, string>
  }) {
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {}

      if (updates.priceId) {
        updateData.items = [{
          id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: updates.priceId
        }]
      }

      if (updates.trialEnd) {
        updateData.trial_end = updates.trialEnd
      }

      if (updates.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = updates.cancelAtPeriodEnd
      }

      if (updates.metadata) {
        updateData.metadata = updates.metadata
      }

      const subscription = await stripe.subscriptions.update(subscriptionId, updateData)
      return subscription
    } catch (error: any) {
      console.error('[STRIPE] Error updating subscription:', error)
      throw new Error(`Stripe subscription update error: ${error.message}`)
    }
  }

  // Create subscription
  static async createSubscription (customerId: string, priceId: string, options?: {
    trialDays?: number
    trialEnd?: number
    metadata?: Record<string, string>
  }) {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata: options?.metadata || {}
      }

      if (options?.trialDays) {
        subscriptionData.trial_period_days = options.trialDays
      } else if (options?.trialEnd) {
        subscriptionData.trial_end = options.trialEnd
      }

      const subscription = await stripe.subscriptions.create(subscriptionData)
      return subscription
    } catch (error: any) {
      console.error('[STRIPE] Error creating subscription:', error)
      throw new Error(`Stripe subscription creation error: ${error.message}`)
    }
  }

  // Cancel subscription
  static async cancelSubscription (subscriptionId: string, immediately = false) {
    try {
      if (immediately) {
        const subscription = await stripe.subscriptions.cancel(subscriptionId)
        return subscription
      } else {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        })
        return subscription
      }
    } catch (error: any) {
      console.error('[STRIPE] Error canceling subscription:', error)
      throw new Error(`Stripe subscription cancellation error: ${error.message}`)
    }
  }

  // Reactivate subscription
  static async reactivateSubscription (subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      })
      return subscription
    } catch (error: any) {
      console.error('[STRIPE] Error reactivating subscription:', error)
      throw new Error(`Stripe subscription reactivation error: ${error.message}`)
    }
  }

  // Get subscription details
  static async getSubscription (subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'latest_invoice']
      })
      return subscription
    } catch (error: any) {
      console.error('[STRIPE] Error retrieving subscription:', error)
      throw new Error(`Stripe subscription retrieval error: ${error.message}`)
    }
  }

  // Extend trial
  static async extendTrial (subscriptionId: string, trialEndDate: Date) {
    try {
      const trialEnd = Math.floor(trialEndDate.getTime() / 1000) // Convert to Unix timestamp

      const subscription = await stripe.subscriptions.update(subscriptionId, {
        trial_end: trialEnd,
        metadata: {
          trial_extended_at: new Date().toISOString()
        }
      })

      return subscription
    } catch (error: any) {
      console.error('[STRIPE] Error extending trial:', error)
      throw new Error(`Stripe trial extension error: ${error.message}`)
    }
  }

  // Create billing portal session
  static async createBillingPortalSession (customerId: string, returnUrl: string) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      })
      return session
    } catch (error: any) {
      console.error('[STRIPE] Error creating billing portal session:', error)
      throw new Error(`Stripe billing portal error: ${error.message}`)
    }
  }

  // Get customer invoices
  static async getCustomerInvoices (customerId: string, limit = 10) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        expand: ['data.subscription']
      })
      return invoices.data
    } catch (error: any) {
      console.error('[STRIPE] Error retrieving invoices:', error)
      throw new Error(`Stripe invoices retrieval error: ${error.message}`)
    }
  }

  // Helper to sync Stripe subscription to database format
  static formatSubscriptionForDB (stripeSubscription: Stripe.Subscription) {
    return {
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: stripeSubscription.customer as string,
      stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      isTrialing: stripeSubscription.status === 'trialing'
    }
  }
}
