// src/pages/api/watchlist/[ticker].ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const userId = session.user.id
  const { ticker } = req.query as { ticker: string }

  // ─── 1) GET: existenz-Prüfung ───
  if (req.method === 'GET') {
    const exists = await prisma.watchlistItem.findUnique({
      where: { userId_ticker: { userId, ticker } },
      select: { id: true }
    })
    return res.status(200).json({ exists: !!exists })
  }

  // ─── 2) POST: hinzufügen ───
  if (req.method === 'POST') {
    await prisma.watchlistItem.upsert({
      where: { userId_ticker: { userId, ticker } },
      create: { userId, ticker },
      update: {},
    })
    return res.status(200).json({ added: true })
  }

  // ─── 3) DELETE: entfernen ───
  if (req.method === 'DELETE') {
    await prisma.watchlistItem.deleteMany({
      where: { userId, ticker }
    })
    return res.status(200).json({ removed: true })
  }

  // alles andere
  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).end('Method Not Allowed')
}