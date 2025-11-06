import express from 'express'
import Stripe from 'stripe'
import { stripe } from '../services/stripe.js'
import { db } from '../db/index.js'
import { subscriptions } from '../db/schema.js'
import { and, eq } from 'drizzle-orm'

const router = express.Router()

// Webhook endpoint: Stripe requires the raw body to validate signatures
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET')
    return res.status(500).send('Webhook secret not configured')
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, signature, webhookSecret)
  } catch (err) {
    const error = err as Error
    console.error(`[Stripe] Webhook signature verification failed: ${error.message}`)
    return res.status(400).send(`Webhook Error: ${error.message}`)
  }

  const upsertByUser = async (userIdStr: string | undefined, data: Partial<typeof subscriptions.$inferInsert>) => {
    const userId = userIdStr ? parseInt(userIdStr, 10) : NaN
    if (!Number.isFinite(userId)) return
    const existing = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) })
    if (existing) {
      await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.userId, userId))
    } else {
      await db.insert(subscriptions).values({ userId, plan: 'premium', status: 'inactive', ...data }).onConflictDoNothing()
    }
  }

  const syncFromStripeSubscription = async (stripeSubId: string, userId?: string) => {
    const sub = await stripe.subscriptions.retrieve(stripeSubId, { expand: ['items.data.price'] })
    const priceId = sub.items.data[0]?.price?.id || null
    const payload: Partial<typeof subscriptions.$inferInsert> = {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id || null),
      stripePriceId: priceId,
      status: sub.status as any,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      isTrialing: sub.status === 'trialing'
    }

    if (userId) {
      await upsertByUser(userId, payload)
    } else {
      await db.update(subscriptions).set({ ...payload, updatedAt: new Date() }).where(eq(subscriptions.stripeSubscriptionId, sub.id))
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          await syncFromStripeSubscription(session.subscription as string, session.metadata?.userId)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await syncFromStripeSubscription(subscription.id)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await db.update(subscriptions)
          .set({ status: 'canceled', currentPeriodEnd: new Date(subscription.current_period_end * 1000), updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await db.update(subscriptions).set({
            status: 'active',
            stripePriceId: invoice.lines.data[0]?.price?.id || null,
            currentPeriodEnd: new Date((invoice.lines.data[0]?.period?.end || Math.floor(Date.now() / 1000)) * 1000),
            updatedAt: new Date()
          }).where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string))
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await db.update(subscriptions).set({ status: 'past_due', updatedAt: new Date() })
            .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string))
        }
        break
      }
      default:
        // no-op for other events
        break
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[Stripe] Webhook processing error', err)
    res.status(500).send('Webhook processing error')
  }
})

export default router
