import { z } from 'zod'
import { protectedProcedure, router } from './trpc.js'
import { db } from '../db/index.js'
import { subscriptions } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { stripe } from '../services/stripe.js'
import { absoluteUrl } from '../utils/utils.js'
import { config } from '../config/index.js'

const billingRouter = router({
  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId)
      })

      if (!subscription) {
        return null
      }

      // Enhance with Stripe data if subscription exists
      const enrichedSubscription: typeof subscription & {
        currentPrice?: number
        currency?: string
        billingCycle?: string
        nextBillingDate?: string
      } = { ...subscription }
      
      try {
        // If we have a Stripe subscription ID, fetch fresh data
        if (subscription.stripeSubscriptionId) {
          const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
          
          // Get price details
          if (stripeSubscription.items.data[0]?.price) {
            const price = stripeSubscription.items.data[0].price
            enrichedSubscription.currentPrice = price.unit_amount || 0
            enrichedSubscription.currency = price.currency || 'usd'
            enrichedSubscription.billingCycle = price.recurring?.interval || 'month'
          }
          
          // Get next billing date
          if (stripeSubscription.current_period_end) {
            enrichedSubscription.nextBillingDate = new Date(stripeSubscription.current_period_end * 1000).toISOString()
          }
        }
      } catch (error) {
        console.error('Error fetching Stripe subscription details:', error)
        // Continue with DB data if Stripe fetch fails
      }

      return enrichedSubscription
    }),

  getPaymentMethod: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId)
      })

      if (!subscription || !subscription.stripeCustomerId) {
        return null
      }

      try {
        // Get customer's default payment method
        const customer = await stripe.customers.retrieve(subscription.stripeCustomerId)
        
        // Check if customer is deleted
        if (customer.deleted) {
          return null
        }
        
        // Type guard for customer object
        if (typeof customer === 'object' && 'invoice_settings' in customer) {
          const defaultPaymentMethod = customer.invoice_settings?.default_payment_method
          
          if (defaultPaymentMethod && typeof defaultPaymentMethod === 'string') {
            const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethod)
            if (pm.type === 'card' && pm.card) {
              return {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year
              }
            }
          }
        }
        
        // Fallback: Try to get payment methods list
        const paymentMethods = await stripe.paymentMethods.list({
          customer: subscription.stripeCustomerId,
          type: 'card'
        })

        if (paymentMethods.data.length === 0) {
          return null
        }

        const pm = paymentMethods.data[0]
        if (pm.type === 'card' && pm.card) {
          return {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year
          }
        }
      } catch (error) {
        console.error('Error fetching payment method:', error)
        return null
      }

      return null
    }),

  getInvoices: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId)
      })

      if (!subscription || !subscription.stripeCustomerId) {
        return []
      }

      try {
        const invoices = await stripe.invoices.list({
          customer: subscription.stripeCustomerId,
          limit: 10
        })

        return invoices.data.map(invoice => ({
          id: invoice.id,
          number: invoice.number,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          date: new Date(invoice.created * 1000).toISOString(),
          description: invoice.lines.data[0]?.description || 'Premium Plan',
          invoiceUrl: invoice.invoice_pdf,
          hostedUrl: invoice.hosted_invoice_url
        }))
      } catch (error) {
        console.error('Error fetching invoices:', error)
        return []
      }
    }),

  downloadInvoice: protectedProcedure
    .input(z.object({
      invoiceId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId)
      })

      if (!subscription || !subscription.stripeCustomerId) {
        throw new Error('No subscription found')
      }

      try {
        const invoice = await stripe.invoices.retrieve(input.invoiceId)
        if (invoice.customer !== subscription.stripeCustomerId) {
          throw new Error('Access denied')
        }
        return { url: invoice.invoice_pdf || invoice.hosted_invoice_url }
      } catch (error) {
        console.error('Error downloading invoice:', error)
        throw new Error('Failed to download invoice')
      }
    }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ priceId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const userEmail = ctx.user.email

      const billingUrl = absoluteUrl('/billing')

      // Ensure a subscription row exists for this user
      const existing = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) })
      if (!existing) {
        await db.insert(subscriptions).values({
          userId,
          plan: 'premium',
          status: 'inactive',
          trialDays: 14,
          isTrialing: false
        })
      }

      const current = existing || await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) })

      // If already has a customer, open the billing portal
      if (current && current.stripeCustomerId) {
        const stripeSession = await stripe.billingPortal.sessions.create({
          customer: current.stripeCustomerId,
          return_url: billingUrl
        })
        return { url: stripeSession.url }
      }

      // New customer: require a priceId
      // Use config.STRIPE_PRICE_MONTHLY (backend env var) or provided priceId
      const price = input.priceId || config.STRIPE_PRICE_MONTHLY
      if (!price) {
        throw new Error('priceId is required for new subscriptions. Please set STRIPE_PRICE_MONTHLY environment variable.')
      }
      
      // Validate that it's a price ID, not a product ID
      if (price.startsWith('prod_')) {
        throw new Error('Invalid price ID: Product IDs (prod_*) cannot be used. Please use a price ID (price_*).')
      }

      const stripeSession = await stripe.checkout.sessions.create({
        success_url: billingUrl,
        cancel_url: billingUrl,
        payment_method_types: ['card'],
        mode: 'subscription',
        billing_address_collection: 'auto',
        customer_email: userEmail,
        line_items: [{ price, quantity: 1 }],
        subscription_data: {
          trial_period_days: 14,
          metadata: { userId: String(userId) }
        },
        metadata: { userId: String(userId) }
      })

      return { url: stripeSession.url }
    })
})

export default billingRouter
