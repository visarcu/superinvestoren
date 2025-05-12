import { buffer } from "micro"
import Stripe from "stripe"
import { prisma } from "@/lib/db"

export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30" })

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"]!
  const body = await buffer(req)
  let evt: Stripe.Event

  try {
    evt = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (evt.type === "checkout.session.completed") {
    const sess = evt.data.object as Stripe.Checkout.Session
    if (sess.customer_email) {
      await prisma.user.update({
        where: { email: sess.customer_email },
        data: { isPremium: true },
      })
    }
  }

  res.status(200).json({ received: true })
}