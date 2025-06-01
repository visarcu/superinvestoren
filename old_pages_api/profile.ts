// src/pages/api/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession }           from 'next-auth/next'
import { authOptions }                from '@/app/api/auth/[...nextauth]/route'  // Pfad zum App-Router-Handler
import { prisma }                     from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Nicht eingeloggt' })
  }

  if (req.method === 'PUT') {
    const { email, firstName, lastName } = req.body
    try {
      await prisma.user.update({
        where: { id: session.user.id! },
        data: { email, firstName, lastName },
      })
      return res.status(200).end()
    } catch (e) {
      console.error(e)
      return res.status(500).json({ error: 'Speichern fehlgeschlagen' })
    }
  }

  res.setHeader('Allow', ['PUT'])
  return res.status(405).end()
}