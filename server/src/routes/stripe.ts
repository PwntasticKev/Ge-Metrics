import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { stripe } from '../services/stripe.js'
import { db } from '../db'
import { subscriptions } from '../db/schema'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

export default async function stripeRoutes (fastify: FastifyInstance) {
  fastify.post('/stripe', {
    config: {
      // Stripe requires the raw body to verify signatures.
      rawBody: true
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set in .env')
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent((request as any).rawBody as Buffer, signature, webhookSecret)
    } catch (err) {
      const error = err as Error
      fastify.log.error(`Webhook signature verification failed: ${error.message}`)
      return reply.status(400).send(`Webhook Error: ${error.message}`)
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await db.update(subscriptions).set({
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
            stripePriceId: session.line_items?.data[0]?.price?.id || null,
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000 // Default to 30 days from now
            )
          }).where(eq(subscriptions.userId, parseInt(session.metadata?.userId || '0')))
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.billing_reason === 'subscription_cycle') {
          await db.update(subscriptions).set({
            status: 'active',
            stripePriceId: invoice.lines.data[0]?.price?.id || null,
            currentPeriodEnd: new Date(
              (invoice.lines.data[0]?.period?.end || Date.now() / 1000) * 1000
            )
          }).where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string))
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await db.update(subscriptions).set({
          status: 'canceled',
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }).where(eq(subscriptions.stripeSubscriptionId, subscription.id))
        break
      }
    }

    reply.send({ received: true })
  })
}
