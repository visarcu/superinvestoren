// src/pages/api/stripe/cancel.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'              // ← hier
import { authOptions } from '../auth/[...nextauth]'            // ← hier
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  // ─── Session prüfen ───────────────────────────────
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // ─── User aus DB holen ────────────────────────────
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user?.stripeSubscriptionId) {
    return res.status(400).json({ error: 'Keine aktive Subscription gefunden.' })
  }

  try {
    // ─── Kündige genau diese Subscription ───────────
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })

    // ─── Interimistisch isPremium zurücksetzen ──────
    await prisma.user.update({
      where: { email: user.email },
      data: { isPremium: false },
    })

    return res.status(200).json({ canceled: true })
  } catch (err: any) {
    console.error('Error cancelling subscription:', err)
    return res.status(500).json({ error: err.message })
  }
}