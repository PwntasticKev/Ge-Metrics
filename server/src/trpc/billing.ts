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

        return {
          url: invoice.invoice_pdf || invoice.hosted_invoice_url
        }
      } catch (error) {
        console.error('Error downloading invoice:', error)
        throw new Error('Failed to download invoice')
      }
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
