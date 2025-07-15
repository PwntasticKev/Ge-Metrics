import { z } from 'zod'
import { router, protectedProcedure } from './trpc.js'
import { subscriptionService } from '../services/subscriptionService.js'
import {
  createCheckoutSession,
  createCustomerPortalSession,
  cancelSubscription,
  updateSubscription,
  STRIPE_CONFIG,
} from '../config/stripe.js'
import { TRPCError } from '@trpc/server'

export const subscriptionRouter = router({
  // Get current user's subscription status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const status = await subscriptionService.getUserSubscriptionStatus(ctx.user.id)
    return status
  }),

  // Get subscription details
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await subscriptionService.getSubscriptionByUserId(ctx.user.id)
    return subscription
  }),

  // Create checkout session
  createCheckoutSession: protectedProcedure
    .input(z.object({
      priceId: z.string(),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
      trialDays: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Create or get customer
        const { customer } = await subscriptionService.createStripeCustomer(
          ctx.user.id,
          ctx.user.email,
          ctx.user.name || undefined
        )

        // Create checkout session
        const session = await createCheckoutSession({
          priceId: input.priceId,
          customerId: customer.id,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          trialDays: input.trialDays,
          metadata: {
            userId: ctx.user.id,
          },
        })

        return {
          sessionId: session.id,
          url: session.url,
        }
      } catch (error) {
        console.error('Failed to create checkout session:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session',
        })
      }
    }),

  // Create customer portal session
  createPortalSession: protectedProcedure
    .input(z.object({
      returnUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const subscription = await subscriptionService.getSubscriptionByUserId(ctx.user.id)
        
        if (!subscription?.stripeCustomerId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No subscription found',
          })
        }

        const session = await createCustomerPortalSession(
          subscription.stripeCustomerId,
          input.returnUrl
        )

        return {
          url: session.url,
        }
      } catch (error) {
        console.error('Failed to create portal session:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create portal session',
        })
      }
    }),

  // Cancel subscription at period end
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await subscriptionService.cancelSubscriptionAtPeriodEnd(ctx.user.id)
      return { success: true }
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to cancel subscription',
      })
    }
  }),

  // Reactivate subscription
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await subscriptionService.reactivateSubscription(ctx.user.id)
      return { success: true }
    } catch (error) {
      console.error('Failed to reactivate subscription:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reactivate subscription',
      })
    }
  }),

  // Update subscription plan
  updatePlan: protectedProcedure
    .input(z.object({
      newPriceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const subscription = await subscriptionService.getSubscriptionByUserId(ctx.user.id)
        
        if (!subscription?.stripeSubscriptionId) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No active subscription found',
          })
        }

        await updateSubscription(subscription.stripeSubscriptionId, input.newPriceId)
        return { success: true }
      } catch (error) {
        console.error('Failed to update subscription:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update subscription',
        })
      }
    }),

  // Check if user has valid subscription
  hasValidSubscription: protectedProcedure.query(async ({ ctx }) => {
    const hasValid = await subscriptionService.hasValidSubscription(ctx.user.id)
    return { hasValidSubscription: hasValid }
  }),

  // Get available plans
  getPlans: protectedProcedure.query(async () => {
    return {
      plans: [
        {
          id: 'monthly',
          name: 'Monthly Premium',
          priceId: STRIPE_CONFIG.PRICES.MONTHLY,
          price: 4.99,
          currency: 'USD',
          interval: 'month',
          features: [
            'Unlimited price alerts',
            'Advanced analytics',
            'Priority support',
            'Real-time notifications',
            'Export data',
          ],
        },
        {
          id: 'yearly',
          name: 'Yearly Premium',
          priceId: STRIPE_CONFIG.PRICES.YEARLY,
          price: 39.99,
          currency: 'USD',
          interval: 'year',
          monthlyEquivalent: 3.33,
          savings: 33,
          features: [
            'All Monthly features',
            'Advanced market insights',
            'Custom alerts',
            'API access',
            'Dedicated support',
          ],
        },
      ],
    }
  }),

  // Start free trial (for new users only)
  startFreeTrial: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Check if user already has a subscription
      const existingSubscription = await subscriptionService.getSubscriptionByUserId(ctx.user.id)
      
      if (existingSubscription && existingSubscription.plan !== 'free') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User already has a subscription',
        })
      }

      // Create trial subscription (this would typically be done through Stripe)
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + STRIPE_CONFIG.TRIAL_DAYS)

      if (existingSubscription) {
        await subscriptionService.updateSubscription(existingSubscription.id, {
          status: 'active',
          plan: 'premium',
          currentPeriodEnd: trialEnd,
        })
      } else {
        await subscriptionService.createSubscription({
          userId: ctx.user.id,
          status: 'active',
          plan: 'premium',
          currentPeriodEnd: trialEnd,
        })
      }

      return { success: true, trialEnd }
    } catch (error) {
      console.error('Failed to start free trial:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start free trial',
      })
    }
  }),
})
