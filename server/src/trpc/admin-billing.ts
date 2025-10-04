import { z } from 'zod'
import { eq, sql, and, gte, lte, desc, count, avg, sum, or } from 'drizzle-orm'
import { 
  db, 
  users, 
  subscriptions,
  userSettings,
  auditLog
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'
import Stripe from 'stripe'
import { config } from '../config/index.js'

const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})

export const adminBillingRouter = router({
  // Get comprehensive billing overview
  getBillingOverview: adminProcedure
    .query(async () => {
      const now = new Date()
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Get subscription stats
      const [totalSubscriptions] = await db.select({ count: count() }).from(subscriptions)
      const [activeSubscriptions] = await db.select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active'))
      const [trialSubscriptions] = await db.select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'trialing'))
      const [canceledSubscriptions] = await db.select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'canceled'))
      const [pastDueSubscriptions] = await db.select({ count: count() })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'past_due'))

      // Get new subscriptions in last 30 days
      const [newSubscriptionsMonth] = await db.select({ count: count() })
        .from(subscriptions)
        .where(gte(subscriptions.createdAt, last30Days))

      // Get subscription trends (last 30 days)
      const subscriptionTrend = await db.select({
        date: sql<string>`DATE(${subscriptions.createdAt})`,
        count: count()
      })
        .from(subscriptions)
        .where(gte(subscriptions.createdAt, last30Days))
        .groupBy(sql`DATE(${subscriptions.createdAt})`)
        .orderBy(sql`DATE(${subscriptions.createdAt})`)

      // Get plan distribution
      const planDistribution = await db.select({
        plan: subscriptions.plan,
        count: count()
      })
        .from(subscriptions)
        .groupBy(subscriptions.plan)

      // Mock revenue data (would come from Stripe in production)
      const mockRevenueData = {
        totalRevenue: 15750, // $157.50 in cents
        monthlyRecurringRevenue: 8900, // $89.00 in cents
        averageRevenuePerUser: 2950, // $29.50 in cents
        churnRate: 5.2 // percentage
      }

      return {
        subscriptions: {
          total: totalSubscriptions.count,
          active: activeSubscriptions.count,
          trialing: trialSubscriptions.count,
          canceled: canceledSubscriptions.count,
          pastDue: pastDueSubscriptions.count,
          newThisMonth: newSubscriptionsMonth.count
        },
        revenue: mockRevenueData,
        trends: {
          subscriptionTrend,
          planDistribution
        }
      }
    }),

  // Get detailed subscription analytics
  getSubscriptionAnalytics: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      groupBy: z.enum(['day', 'week', 'month']).default('day')
    }))
    .query(async ({ input }) => {
      const { startDate, endDate, groupBy } = input
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate ? new Date(endDate) : new Date()

      // Get subscription creation trend
      const subscriptionTrend = await db.select({
        date: sql<string>`DATE(${subscriptions.createdAt})`,
        count: count(),
        activeCount: count(sql`CASE WHEN ${subscriptions.status} = 'active' THEN 1 END`),
        trialCount: count(sql`CASE WHEN ${subscriptions.status} = 'trialing' THEN 1 END`),
        canceledCount: count(sql`CASE WHEN ${subscriptions.status} = 'canceled' THEN 1 END`)
      })
        .from(subscriptions)
        .where(and(
          gte(subscriptions.createdAt, start),
          lte(subscriptions.createdAt, end)
        ))
        .groupBy(sql`DATE(${subscriptions.createdAt})`)
        .orderBy(sql`DATE(${subscriptions.createdAt})`)

      // Get cohort analysis (simplified)
      const cohortData = await db.select({
        month: sql<string>`DATE_TRUNC('month', ${subscriptions.createdAt})`,
        totalSignups: count(),
        stillActive: count(sql`CASE WHEN ${subscriptions.status} = 'active' THEN 1 END`)
      })
        .from(subscriptions)
        .where(gte(subscriptions.createdAt, start))
        .groupBy(sql`DATE_TRUNC('month', ${subscriptions.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${subscriptions.createdAt})`)

      return {
        subscriptionTrend,
        cohortData
      }
    }),

  // Get all subscriptions with filtering and pagination
  getAllSubscriptions: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      status: z.string().optional(),
      plan: z.string().optional(),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, status, plan, search } = input
      const offset = (page - 1) * limit

      // Build where conditions
      const conditions = []
      
      if (status) {
        conditions.push(eq(subscriptions.status, status))
      }
      
      if (plan) {
        conditions.push(eq(subscriptions.plan, plan))
      }
      
      if (search) {
        conditions.push(
          or(
            sql`${users.email} ILIKE ${`%${search}%`}`,
            sql`${users.name} ILIKE ${`%${search}%`}`,
            sql`${subscriptions.stripeCustomerId} ILIKE ${`%${search}%`}`
          )
        )
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get subscriptions with user data
      const subscriptionsQuery = db
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          status: subscriptions.status,
          plan: subscriptions.plan,
          stripeCustomerId: subscriptions.stripeCustomerId,
          stripeSubscriptionId: subscriptions.stripeSubscriptionId,
          stripePriceId: subscriptions.stripePriceId,
          currentPeriodStart: subscriptions.currentPeriodStart,
          currentPeriodEnd: subscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
          createdAt: subscriptions.createdAt,
          updatedAt: subscriptions.updatedAt,
          // User data
          userEmail: users.email,
          userName: users.name,
          userAvatar: users.avatar
        })
        .from(subscriptions)
        .leftJoin(users, eq(subscriptions.userId, users.id))

      if (whereClause) {
        subscriptionsQuery.where(whereClause)
      }

      const subscriptionsResult = await subscriptionsQuery
        .orderBy(desc(subscriptions.createdAt))
        .limit(limit)
        .offset(offset)

      // Get total count
      const totalQuery = db
        .select({ count: count() })
        .from(subscriptions)
        .leftJoin(users, eq(subscriptions.userId, users.id))

      if (whereClause) {
        totalQuery.where(whereClause)
      }

      const [{ count: totalSubscriptions }] = await totalQuery

      return {
        subscriptions: subscriptionsResult,
        pagination: {
          page,
          limit,
          total: totalSubscriptions,
          totalPages: Math.ceil(totalSubscriptions / limit)
        }
      }
    }),

  // Issue refund
  issueRefund: adminProcedure
    .input(z.object({
      subscriptionId: z.string(),
      amount: z.number().optional(), // in cents, if partial refund
      reason: z.string(),
      refundType: z.enum(['full', 'partial']).default('full')
    }))
    .mutation(async ({ input, ctx }) => {
      const { subscriptionId, amount, reason, refundType } = input

      try {
        // Get subscription details from database
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, subscriptionId))
          .limit(1)

        if (!subscription || !subscription.stripeSubscriptionId) {
          throw new Error('Subscription not found or has no Stripe ID')
        }

        // Get the latest invoice from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
        
        if (!stripeSubscription.latest_invoice) {
          throw new Error('No invoice found for this subscription')
        }

        // Get invoice details
        const invoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice as string)
        
        if (!invoice.payment_intent) {
          throw new Error('No payment intent found for this invoice')
        }

        // Create refund
        const refundData: any = {
          payment_intent: invoice.payment_intent as string,
          reason: 'requested_by_customer',
          metadata: {
            admin_user_id: ctx.user.id.toString(),
            reason: reason,
            refund_type: refundType
          }
        }

        if (refundType === 'partial' && amount) {
          refundData.amount = amount
        }

        const refund = await stripe.refunds.create(refundData)

        // Log the admin action
        await db.insert(auditLog).values({
          userId: ctx.user.id,
          action: 'issue_refund',
          resource: 'subscription',
          resourceId: subscriptionId,
          details: {
            stripeRefundId: refund.id,
            refundAmount: refund.amount,
            refundType,
            reason,
            stripeSubscriptionId: subscription.stripeSubscriptionId
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent']
        })

        return {
          success: true,
          refund: {
            id: refund.id,
            amount: refund.amount,
            status: refund.status,
            created: refund.created
          }
        }
      } catch (error) {
        throw new Error(`Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Cancel subscription
  cancelSubscription: adminProcedure
    .input(z.object({
      subscriptionId: z.string(),
      immediately: z.boolean().default(false),
      reason: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { subscriptionId, immediately, reason } = input

      try {
        // Get subscription from database
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, subscriptionId))
          .limit(1)

        if (!subscription || !subscription.stripeSubscriptionId) {
          throw new Error('Subscription not found or has no Stripe ID')
        }

        let updatedSubscription
        
        if (immediately) {
          // Cancel immediately in Stripe
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
          
          // Update database
          const result = await db
            .update(subscriptions)
            .set({
              status: 'canceled',
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, subscriptionId))
            .returning()
          updatedSubscription = result[0]
        } else {
          // Cancel at period end in Stripe
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true
          })
          
          // Update database
          const result = await db
            .update(subscriptions)
            .set({
              cancelAtPeriodEnd: true,
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, subscriptionId))
            .returning()
          updatedSubscription = result[0]
        }

        // Log the admin action
        await db.insert(auditLog).values({
          userId: ctx.user.id,
          action: 'cancel_subscription',
          resource: 'subscription',
          resourceId: subscriptionId,
          details: {
            immediately,
            reason,
            stripeSubscriptionId: subscription.stripeSubscriptionId
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent']
        })

        return updatedSubscription
      } catch (error) {
        throw new Error(`Cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Reactivate subscription
  reactivateSubscription: adminProcedure
    .input(z.object({
      subscriptionId: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { subscriptionId, reason } = input

      try {
        // Get subscription from database
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, subscriptionId))
          .limit(1)

        if (!subscription || !subscription.stripeSubscriptionId) {
          throw new Error('Subscription not found or has no Stripe ID')
        }

        // Reactivate in Stripe (remove cancel_at_period_end)
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: false
        })

        // Update database
        const [updatedSubscription] = await db
          .update(subscriptions)
          .set({
            cancelAtPeriodEnd: false,
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(subscriptions.id, subscriptionId))
          .returning()

        // Log the admin action
        await db.insert(auditLog).values({
          userId: ctx.user.id,
          action: 'reactivate_subscription',
          resource: 'subscription',
          resourceId: subscriptionId,
          details: {
            reason,
            stripeSubscriptionId: subscription.stripeSubscriptionId
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent']
        })

        return updatedSubscription
      } catch (error) {
        throw new Error(`Reactivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Update subscription plan
  updateSubscriptionPlan: adminProcedure
    .input(z.object({
      subscriptionId: z.string(),
      newPlan: z.string(),
      newPriceId: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { subscriptionId, newPlan, newPriceId, reason } = input

      try {
        // Get subscription from database
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, subscriptionId))
          .limit(1)

        if (!subscription || !subscription.stripeSubscriptionId) {
          throw new Error('Subscription not found or has no Stripe ID')
        }

        // Update subscription in Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
        
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [{
            id: stripeSubscription.items.data[0].id,
            price: newPriceId
          }]
        })

        // Update database
        const [updatedSubscription] = await db
          .update(subscriptions)
          .set({
            plan: newPlan,
            stripePriceId: newPriceId,
            updatedAt: new Date()
          })
          .where(eq(subscriptions.id, subscriptionId))
          .returning()

        // Log the admin action
        await db.insert(auditLog).values({
          userId: ctx.user.id,
          action: 'update_subscription_plan',
          resource: 'subscription',
          resourceId: subscriptionId,
          details: {
            previousPlan: subscription.plan,
            newPlan,
            newPriceId,
            reason,
            stripeSubscriptionId: subscription.stripeSubscriptionId
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent']
        })

        return updatedSubscription
      } catch (error) {
        throw new Error(`Plan update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }),

  // Get revenue analytics from Stripe
  getRevenueAnalytics: adminProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ input }) => {
      // Mock revenue data for now - in production this would integrate with Stripe reporting API
      const mockRevenueData = {
        totalRevenue: 25460, // $254.60 in cents
        revenueByDay: [
          { date: '2024-01-01', revenue: 2950 },
          { date: '2024-01-02', revenue: 3200 },
          { date: '2024-01-03', revenue: 2800 },
          { date: '2024-01-04', revenue: 3450 },
          { date: '2024-01-05', revenue: 3100 },
          { date: '2024-01-06', revenue: 2900 },
          { date: '2024-01-07', revenue: 3260 }
        ],
        revenueByPlan: [
          { plan: 'premium', revenue: 18950, subscriptions: 64 },
          { plan: 'pro', revenue: 6510, subscriptions: 13 }
        ],
        metrics: {
          averageRevenuePerUser: 2950,
          monthlyRecurringRevenue: 8900,
          customerLifetimeValue: 15750,
          churnRate: 4.2
        }
      }

      return mockRevenueData
    })
})