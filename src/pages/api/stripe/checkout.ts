// src/pages/api/stripe/checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion weglassen, damit die default aus Deinem Package.json genommen wird
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: process.env.STRIPE_PRICE_ID!, quantity: 1 }
      ],
      success_url: `${process.env.NEXTAUTH_URL}/?checkout=success`,
      cancel_url:  `${process.env.NEXTAUTH_URL}/pricing?checkout=cancel`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err)
    return res.status(500).json({ error: err.message })
  }
}