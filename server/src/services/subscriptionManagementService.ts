import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  stripePriceId?: string
}

export interface SubscriptionStats {
  totalSubscriptions: number
  activeSubscriptions: number
  canceledSubscriptions: number
  pastDueSubscriptions: number
  monthlyRevenue: number
  yearlyRevenue: number
  planDistribution: Record<string, number>
}

export class SubscriptionManagementService {
  // Available subscription plans
  private static readonly PLANS: Record<string, SubscriptionPlan> = {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'month',
      features: [
        'Basic item tracking',
        'Limited watchlist (5 items)',
        'Basic price alerts',
        'Community access'
      ]
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      price: 9.99,
      interval: 'month',
      stripePriceId: 'price_premium_monthly',
      features: [
        'Advanced item tracking',
        'Unlimited watchlist',
        'Advanced price alerts',
        'Volume alerts',
        'Profit tracking',
        'Historical data access',
        'Priority support'
      ]
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 19.99,
      interval: 'month',
      stripePriceId: 'price_pro_monthly',
      features: [
        'All Premium features',
        'AI predictions',
        'Whale tracking',
        'Advanced analytics',
        'API access',
        'Custom alerts',
        'Dedicated support',
        'Early access to features'
      ]
    }
  }

  /**
   * Get all available subscription plans
   */
  static getPlans (): Record<string, SubscriptionPlan> {
    return this.PLANS
  }

  /**
   * Get a specific plan by ID
   */
  static getPlan (planId: string): SubscriptionPlan | null {
    return this.PLANS[planId] || null
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription (userId: number, planId: string, stripeData?: {
    customerId?: string
    subscriptionId?: string
    priceId?: string
  }): Promise<schema.Subscription> {
    try {
      const plan = SubscriptionManagementService.getPlan(planId)
      if (!plan) {
        throw new Error(`Invalid plan: ${planId}`)
      }

      // Check if user already has a subscription
      const existingSubscription = await this.getUserSubscription(userId)
      if (existingSubscription) {
        throw new Error('User already has a subscription')
      }

      const [newSubscription] = await db.insert(schema.subscriptions).values({
        userId,
        plan: planId,
        status: 'active',
        stripeCustomerId: stripeData?.customerId,
        stripeSubscriptionId: stripeData?.subscriptionId,
        stripePriceId: stripeData?.priceId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(plan.interval)
      }).returning()

      // Log the subscription creation
      await this.logAuditEvent(userId, 'subscription_created', 'subscription', newSubscription.id.toString(), {
        planId,
        stripeData
      })

      return newSubscription
    } catch (error) {
      console.error('Error creating subscription:', error)
      throw error
    }
  }

  /**
   * Update a user's subscription
   */
  async updateSubscription (subscriptionId: string, updates: Partial<{
    plan: string
    status: string
    stripeCustomerId: string
    stripeSubscriptionId: string
    stripePriceId: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
  }>): Promise<schema.Subscription> {
    try {
      const [updatedSubscription] = await db.update(schema.subscriptions).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(schema.subscriptions.id, subscriptionId)).returning()

      if (!updatedSubscription) {
        throw new Error('Subscription not found')
      }

      // Log the subscription update
      await this.logAuditEvent(updatedSubscription.userId, 'subscription_updated', 'subscription', subscriptionId.toString(), updates)

      return updatedSubscription
    } catch (error) {
      console.error('Error updating subscription:', error)
      throw error
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription (subscriptionId: string, cancelAtPeriodEnd = true): Promise<schema.Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId)
      if (!subscription) {
        throw new Error('Subscription not found')
      }

      const updates: any = {
        cancelAtPeriodEnd,
        updatedAt: new Date()
      }

      if (!cancelAtPeriodEnd) {
        updates.status = 'canceled'
      }

      const [updatedSubscription] = await db.update(schema.subscriptions).set(updates)
        .where(eq(schema.subscriptions.id, subscriptionId)).returning()

      // Log the cancellation
      await this.logAuditEvent(subscription.userId, 'subscription_canceled', 'subscription', subscriptionId.toString(), {
        cancelAtPeriodEnd
      })

      return updatedSubscription
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription (subscriptionId: string): Promise<schema.Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId)
      if (!subscription) {
        throw new Error('Subscription not found')
      }

      const [updatedSubscription] = await db.update(schema.subscriptions).set({
        status: 'active',
        cancelAtPeriodEnd: false,
        updatedAt: new Date()
      }).where(eq(schema.subscriptions.id, subscriptionId)).returning()

      // Log the reactivation
      await this.logAuditEvent(subscription.userId, 'subscription_reactivated', 'subscription', subscriptionId.toString())

      return updatedSubscription
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      throw error
    }
  }

  /**
   * Get a user's subscription
   */
  async getUserSubscription (userId: number): Promise<schema.Subscription | null> {
    try {
      const subscriptions = await db.select().from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, userId))
        .orderBy(desc(schema.subscriptions.createdAt))
        .limit(1)

      return subscriptions.length > 0 ? subscriptions[0] : null
    } catch (error) {
      console.error('Error getting user subscription:', error)
      throw error
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById (subscriptionId: string): Promise<schema.Subscription | null> {
    try {
      const subscriptions = await db.select().from(schema.subscriptions)
        .where(eq(schema.subscriptions.id, subscriptionId))

      return subscriptions.length > 0 ? subscriptions[0] : null
    } catch (error) {
      console.error('Error getting subscription by ID:', error)
      throw error
    }
  }

  /**
   * Get all subscriptions with optional filters
   */
  async getAllSubscriptions (filters?: {
    status?: string
    plan?: string
    limit?: number
    offset?: number
  }): Promise<schema.Subscription[]> {
    try {
      let query = db.select().from(schema.subscriptions).$dynamic()

      if (filters?.status) {
        query = query.where(eq(schema.subscriptions.status, filters.status))
      }

      if (filters?.plan) {
        query = query.where(eq(schema.subscriptions.plan, filters.plan))
      }

      query = query.orderBy(desc(schema.subscriptions.createdAt))

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.offset(filters.offset)
      }

      return await query
    } catch (error) {
      console.error('Error getting all subscriptions:', error)
      throw error
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats (): Promise<SubscriptionStats> {
    try {
      const allSubscriptions = await db.select().from(schema.subscriptions)

      const stats: SubscriptionStats = {
        totalSubscriptions: allSubscriptions.length,
        activeSubscriptions: allSubscriptions.filter(s => s.status === 'active').length,
        canceledSubscriptions: allSubscriptions.filter(s => s.status === 'canceled').length,
        pastDueSubscriptions: allSubscriptions.filter(s => s.status === 'past_due').length,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        planDistribution: {}
      }

      // Calculate revenue and plan distribution
      allSubscriptions.forEach(subscription => {
        const plan = SubscriptionManagementService.getPlan(subscription.plan)
        if (plan && subscription.status === 'active') {
          if (plan.interval === 'month') {
            stats.monthlyRevenue += plan.price
          } else if (plan.interval === 'year') {
            stats.yearlyRevenue += plan.price
          }
        }

        stats.planDistribution[subscription.plan] = (stats.planDistribution[subscription.plan] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting subscription stats:', error)
      throw error
    }
  }

  /**
   * Check if a user has access to a specific feature
   */
  async hasFeatureAccess (userId: number, feature: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId)
      if (!subscription || subscription.status !== 'active') {
        return false
      }

      const plan = SubscriptionManagementService.getPlan(subscription.plan)
      if (!plan) {
        return false
      }

      return plan.features.includes(feature)
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }

  /**
   * Get user's subscription plan details
   */
  async getUserPlanDetails (userId: number): Promise<{
    subscription: schema.Subscription | null
    plan: SubscriptionPlan | null
    features: string[]
    isActive: boolean
  }> {
    try {
      const subscription = await this.getUserSubscription(userId)
      const plan = subscription ? SubscriptionManagementService.getPlan(subscription.plan) : null

      return {
        subscription,
        plan,
        features: plan?.features || [],
        isActive: subscription?.status === 'active'
      }
    } catch (error) {
      console.error('Error getting user plan details:', error)
      throw error
    }
  }

  /**
   * Upgrade a user's subscription
   */
  async upgradeSubscription (userId: number, newPlanId: string): Promise<schema.Subscription> {
    try {
      const subscription = await this.getUserSubscription(userId)
      if (!subscription) {
        throw new Error('User has no subscription to upgrade')
      }

      const newPlan = SubscriptionManagementService.getPlan(newPlanId)
      if (!newPlan) {
        throw new Error(`Invalid plan: ${newPlanId}`)
      }

      // Check if it's actually an upgrade
      const currentPlan = SubscriptionManagementService.getPlan(subscription.plan)
      if (currentPlan && newPlan.price <= currentPlan.price) {
        throw new Error('New plan must be an upgrade')
      }

      return await this.updateSubscription(subscription.id, {
        plan: newPlanId,
        currentPeriodEnd: this.calculatePeriodEnd(newPlan.interval)
      })
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      throw error
    }
  }

  /**
   * Downgrade a user's subscription
   */
  async downgradeSubscription (userId: number, newPlanId: string): Promise<schema.Subscription> {
    try {
      const subscription = await this.getUserSubscription(userId)
      if (!subscription) {
        throw new Error('User has no subscription to downgrade')
      }

      const newPlan = SubscriptionManagementService.getPlan(newPlanId)
      if (!newPlan) {
        throw new Error(`Invalid plan: ${newPlanId}`)
      }

      // Check if it's actually a downgrade
      const currentPlan = SubscriptionManagementService.getPlan(subscription.plan)
      if (currentPlan && newPlan.price >= currentPlan.price) {
        throw new Error('New plan must be a downgrade')
      }

      return await this.updateSubscription(subscription.id, {
        plan: newPlanId,
        currentPeriodEnd: this.calculatePeriodEnd(newPlan.interval)
      })
    } catch (error) {
      console.error('Error downgrading subscription:', error)
      throw error
    }
  }

  /**
   * Get subscriptions expiring soon
   */
  async getExpiringSubscriptions (days = 7): Promise<schema.Subscription[]> {
    try {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + days)

      return await db.select().from(schema.subscriptions)
        .where(
          and(
            eq(schema.subscriptions.status, 'active'),
            lte(schema.subscriptions.currentPeriodEnd, expiryDate)
          )
        )
        .orderBy(schema.subscriptions.currentPeriodEnd)
    } catch (error) {
      console.error('Error getting expiring subscriptions:', error)
      throw error
    }
  }

  /**
   * Check for expiring trials and send notifications
   */
  async checkTrialExpirationsAndNotify (): Promise<{ processed: number; emailsSent: number }> {
    try {
      const now = new Date()
      // Look for trials ending in 3 days (between 2.5 and 3.5 days from now)
      const targetStart = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000)
      const targetEnd = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000)

      const expiringTrials = await db.select().from(schema.subscriptions)
        .where(
          and(
            eq(schema.subscriptions.status, 'trialing'),
            eq(schema.subscriptions.isTrialing, true),
            gte(schema.subscriptions.trialEnd, targetStart),
            lte(schema.subscriptions.trialEnd, targetEnd)
          )
        )

      console.log(`[SubscriptionService] Found ${expiringTrials.length} trials ending soon (3 days)`)

      let emailsSent = 0
      const { sendEmail } = await import('./emailService.js')

      for (const sub of expiringTrials) {
        try {
          const [user] = await db.select().from(schema.users).where(eq(schema.users.id, sub.userId)).limit(1)
          
          if (!user) continue

          const trialEndDate = sub.trialEnd ? new Date(sub.trialEnd).toLocaleDateString() : 'soon'
          
          await sendEmail({
            to: user.email,
            subject: 'Your Trial is Ending Soon!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #667eea;">Don't Lose Your Edge!</h2>
                <p>Hey ${user.username},</p>
                <p>Just a heads up that your Ge-Metrics free trial is ending on <strong>${trialEndDate}</strong>.</p>
                <p>You've had access to premium features like advanced flip tracking, volume analysis, and more. To keep maximizing your profits, upgrade to the full Premium plan now.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL}/billing" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Upgrade to Premium ($3/mo)</a>
                </div>
                <p>It's just $3/month - less than a bond for way more value.</p>
                <p>Cheers,<br>The Ge-Metrics Team</p>
              </div>
            `,
            text: `Hey ${user.username}, your Ge-Metrics free trial is ending on ${trialEndDate}. Upgrade now to keep your premium access: ${process.env.FRONTEND_URL}/billing`
          })
          
          emailsSent++
        } catch (err) {
          console.error(`Failed to send trial expiry email to user ${sub.userId}:`, err)
        }
      }

      return { processed: expiringTrials.length, emailsSent }
    } catch (error) {
      console.error('Error checking trial expirations:', error)
      throw error
    }
  }

  /**
   * Calculate period end date based on interval
   */
  private calculatePeriodEnd (interval: string): Date {
    const endDate = new Date()

    if (interval === 'month') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else if (interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    return endDate
  }

  /**
   * Log audit event
   */
  private async logAuditEvent (userId: number, action: string, resource: string, resourceId: string, details?: any): Promise<void> {
    try {
      await db.insert(schema.auditLog).values({
        userId,
        action,
        resource,
        resourceId,
        details
      })
    } catch (error) {
      console.error('Error logging audit event:', error)
    }
  }
}

export default SubscriptionManagementService
