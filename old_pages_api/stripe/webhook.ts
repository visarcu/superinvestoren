// src/pages/api/stripe/webhook.ts
import { buffer } from 'micro'
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

export const config = { api: { bodyParser: false } }

// Stripe-Version aus package.json verwenden
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

// Hilfs-TypeGuard: Unterscheidet Live-Customer von DeletedCustomer
function isLiveCustomer(
  c: Stripe.Customer | Stripe.DeletedCustomer
): c is Stripe.Customer {
  return (c as Stripe.DeletedCustomer).deleted !== true
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  // Signature-Verifikation
  const sig = req.headers['stripe-signature']!
  const buf = await buffer(req)
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // lookupEmail: ermittelt die E-Mail aus Session, Subscription oder Invoice
  async function lookupEmail(obj: any): Promise<string | undefined> {
    // 1) Checkout Session → customer_details.email
    if (obj.customer_details?.email) {
      return obj.customer_details.email as string
    }

    // 2) Subscription/Invoice → obj.customer kann ID oder Objekt sein
    let custId: string | undefined
    if (typeof obj.customer === 'string') {
      custId = obj.customer
    } else if (obj.customer?.id) {
      custId = obj.customer.id
    }

    if (custId) {
      // 2a) direktes Abruf-Objekt aus Stripe
      const custRaw = await stripe.customers.retrieve(custId)
      if (
        typeof custRaw !== 'string' &&
        isLiveCustomer(custRaw) &&
        typeof custRaw.email === 'string'
      ) {
        return custRaw.email
      }

      // 2b) Fallback: über Prisma → stripeCustomerId
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: custId },
      })
      return user?.email ?? undefined
    }

    return undefined
  }

  // Haupt-Dispatcher
  switch (event.type) {
    case 'checkout.session.completed': {
      const sess = event.data.object as Stripe.Checkout.Session
      const email = await lookupEmail(sess)
      const custId = typeof sess.customer === 'string'
        ? sess.customer
        : sess.customer?.id
      const subId = typeof sess.subscription === 'string'
        ? sess.subscription
        : (sess.subscription as Stripe.Subscription)?.id

      if (email && custId && subId) {
        await prisma.user.update({
          where: { email },
          data: {
            isPremium: true,
            premiumSince: new Date(),
            stripeCustomerId: custId,
            stripeSubscriptionId: subId,      // ← hier speichern
          },
        })
        console.log(`✅ ${email} ist jetzt Premium (Cust: ${custId}, Sub: ${subId}).`)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const email = await lookupEmail(sub)
      if (email) {
        await prisma.user.update({
          where: { email },
          data: {
            isPremium: false,
            stripeSubscriptionId: null,     // ← Subscription aus DB entfernen
          },
        })
        console.log(`🚫 ${email} hat gekündigt.`)
      }
      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      const email = await lookupEmail(inv)
      if (email) {
        await prisma.user.update({
          where: { email },
          data: { isPremium: false },
        })
        console.log(`⚠️ Zahlung fehlgeschlagen für ${email}.`)
      }
      break
    }

    default:
      console.log(`ℹ️ Unhandled event type ${event.type}`)
  }

  return res.status(200).json({ received: true })
}