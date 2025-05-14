import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import * as z from 'zod'

const BodySchema = z.object({
  ticker: z.string().min(1),
  email: z.string().email(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Only POST allowed')
  }

  const parse = BodySchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload' })
  }
  const { ticker, email } = parse.data

  try {
    const sub = await prisma.investorSubscriber.upsert({
      where: { investorTicker_email: { investorTicker: ticker, email } },
      create: { investorTicker: ticker, email },
      update: {},
    })
    return res.status(201).json({ success: true })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: 'Database error' })
  }
}