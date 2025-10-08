import { z } from 'zod'
import { protectedProcedure, router } from './trpc.js'
import { db } from '../db/index.js'
import { subscriptions } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { stripe } from '../services/stripe.js'
import { absoluteUrl } from '../utils/utils.js'

const billingRouter = router({
  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId)
      })

      return subscription
    }),

  createCheckoutSession: protectedProcedure
    .input(z.object({
      priceId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const userEmail = ctx.user.email

      const billingUrl = absoluteUrl('/billing')

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId)
      })

      // User is already a customer, create a portal session
      if (subscription && subscription.stripeCustomerId) {
        const stripeSession = await stripe.billingPortal.sessions.create({
          customer: subscription.stripeCustomerId,
          return_url: billingUrl
        })

        return { url: stripeSession.url }
      }

      // New customer, create a checkout session
      if (!input.priceId) {
        throw new Error('priceId is required for new subscriptions.')
      }

      const stripeSession = await stripe.checkout.sessions.create({
        success_url: billingUrl,
        cancel_url: billingUrl,
        payment_method_types: ['card'],
        mode: 'subscription',
        billing_address_collection: 'auto',
        customer_email: userEmail,
        line_items: [
          {
            price: input.priceId,
            quantity: 1
          }
        ],
        metadata: {
          userId
        }
      })

      return { url: stripeSession.url }
    })
})

export default billingRouter
