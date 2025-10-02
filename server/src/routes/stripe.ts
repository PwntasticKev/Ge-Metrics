import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { stripe } from '../services/stripe'
import { db } from '../db'
import { subscriptions } from '../db/schema'
import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

export default async function stripeRoutes (fastify: FastifyInstance) {
  fastify.post('/webhook', {
    config: {
      rawBody: true
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(request.rawBody as Buffer, signature, webhookSecret)
    } catch (err: any) {
      fastify.log.error(`Stripe webhook error: ${err.message}`)
      return reply.status(400).send(`Webhook Error: ${err.message}`)
    }

    const session = event.data.object as Stripe.Checkout.Session

    if (event.type === 'checkout.session.completed') {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      await db.update(subscriptions)
        .set({
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
        })
        .where(eq(subscriptions.userId, parseInt(session.metadata!.userId)))
    }

    if (event.type === 'invoice.payment_succeeded') {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      await db.update(subscriptions)
        .set({
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    }

    reply.status(200).send()
  })
}
