// src/pages/api/watchlist/index.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' })
  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.user.id },
    select: { ticker: true }
  })
  res.status(200).json({ tickers: items.map(i => i.ticker) })
}