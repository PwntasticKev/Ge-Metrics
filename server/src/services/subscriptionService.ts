import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { subscriptions, users } from '../db/schema.js'
import { stripe, getOrCreateCustomer } from '../config/stripe.js'
import type { Subscription, NewSubscription } from '../db/schema.js'
import type Stripe from 'stripe'

export class SubscriptionService {
  // Create a new subscription in the database
  async createSubscription (data: NewSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(data).returning()
    return subscription
  }

  // Get subscription by user ID
  async getSubscriptionByUserId (userId: number): Promise<Subscription | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1)

    return subscription || null
  }

  // Get subscription by Stripe subscription ID
  async getSubscriptionByStripeId (stripeSubscriptionId: string): Promise<Subscription | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1)

    return subscription || null
  }

  // Update subscription
  async updateSubscription (
    subscriptionId: string,
    data: Partial<Subscription>
  ): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscriptionId))
      .returning()

    return subscription
  }

  // Update subscription by Stripe ID
  async updateSubscriptionByStripeId (
    stripeSubscriptionId: string,
    data: Partial<Subscription>
  ): Promise<Subscription | null> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .returning()

    return subscription || null
  }

  // Delete subscription
  async deleteSubscription (subscriptionId: string): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, subscriptionId))
  }

  // Create or update customer in Stripe and database
  async createStripeCustomer (userId: number, email: string, name?: string): Promise<{
    customer: Stripe.Customer
    subscription: Subscription
  }> {
    // Get or create customer in Stripe
    const customer = await getOrCreateCustomer(email, name, String(userId))

    // Update or create subscription record with customer ID
    let subscription = await this.getSubscriptionByUserId(userId)

    if (subscription) {
      subscription = await this.updateSubscription(String(subscription.id), {
        stripeCustomerId: customer.id
      })
    } else {
      subscription = await this.createSubscription({
        userId,
        stripeCustomerId: customer.id,
        status: 'inactive',
        plan: 'free'
      } as NewSubscription)
    }

    return { customer, subscription }
  }

  // Handle subscription creation from Stripe webhook
  async handleSubscriptionCreated (stripeSubscription: Stripe.Subscription): Promise<void> {
    const customerId = stripeSubscription.customer as string
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
    const userId = customer.metadata?.userId

    if (!userId) {
      console.error('No userId found in customer metadata for subscription:', stripeSubscription.id)
      return
    }

    // Determine plan from price ID
    const priceId = stripeSubscription.items.data[0]?.price?.id
    const plan = this.getPlanFromPriceId(priceId)

    // Create or update subscription
    const existingSubscription = await this.getSubscriptionByUserId(parseInt(userId, 10))

    if (existingSubscription) {
      await this.updateSubscription(String(existingSubscription.id), {
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        status: stripeSubscription.status as any,
        plan,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
      })
    } else {
      await this.createSubscription({
        userId: parseInt(userId, 10),
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        status: stripeSubscription.status as any,
        plan,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
      } as NewSubscription)
    }
  }

  // Handle subscription update from Stripe webhook
  async handleSubscriptionUpdated (stripeSubscription: Stripe.Subscription): Promise<void> {
    const priceId = stripeSubscription.items.data[0]?.price?.id
    const plan = this.getPlanFromPriceId(priceId)

    await this.updateSubscriptionByStripeId(stripeSubscription.id, {
      stripePriceId: priceId,
      status: stripeSubscription.status as any,
      plan,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
    })
  }

  // Handle subscription deletion from Stripe webhook
  async handleSubscriptionDeleted (stripeSubscription: Stripe.Subscription): Promise<void> {
    await this.updateSubscriptionByStripeId(stripeSubscription.id, {
      status: 'canceled',
      cancelAtPeriodEnd: false
    })
  }

  // Handle invoice payment succeeded
  async handleInvoicePaymentSucceeded (invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      // Update subscription status to active
      await this.updateSubscriptionByStripeId(invoice.subscription as string, {
        status: 'active'
      })
    }
  }

  // Handle invoice payment failed
  async handleInvoicePaymentFailed (invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      // Update subscription status to past_due
      await this.updateSubscriptionByStripeId(invoice.subscription as string, {
        status: 'past_due'
      })
    }
  }

  // Utility function to determine plan from price ID
  private getPlanFromPriceId (priceId?: string): 'free' | 'premium' {
    if (!priceId) return 'free'

    // This should match your actual Stripe price IDs
    // You can also store this mapping in your database or config
    const monthlyPriceIds = process.env.STRIPE_PRICE_MONTHLY?.split(',') || []
    const yearlyPriceIds = process.env.STRIPE_PRICE_YEARLY?.split(',') || []

    if (monthlyPriceIds.includes(priceId) || yearlyPriceIds.includes(priceId)) {
      return 'premium'
    }

    return 'free'
  }

  // Get subscription status for user
  async getUserSubscriptionStatus (userId: number): Promise<{
    isActive: boolean
    plan: string
    status: string
    currentPeriodEnd?: Date
  }> {
    const subscription = await this.getSubscriptionByUserId(userId)

    if (!subscription) {
      return {
        isActive: false,
        plan: 'free',
        status: 'inactive'
      }
    }

    const isActive = subscription.status === 'active' &&
                    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date())

    return {
      isActive,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd || undefined
    }
  }

  // Check if user has access to premium features
  async hasValidSubscription (userId: number): Promise<boolean> {
    const status = await this.getUserSubscriptionStatus(userId)
    return status.isActive && status.plan === 'premium'
  }

  // Cancel subscription at period end
  async cancelSubscriptionAtPeriodEnd (userId: number): Promise<void> {
    const subscription = await this.getSubscriptionByUserId(userId)

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found')
    }

    // Cancel in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    // Update in database
    await this.updateSubscription(String(subscription.id), {
      cancelAtPeriodEnd: true
    })
  }

  // Reactivate canceled subscription
  async reactivateSubscription (userId: number): Promise<void> {
    const subscription = await this.getSubscriptionByUserId(userId)

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No subscription found')
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    })

    // Update in database
    await this.updateSubscription(String(subscription.id), {
      cancelAtPeriodEnd: false
    })
  }
}

export const subscriptionService = new SubscriptionService()
export default subscriptionService
