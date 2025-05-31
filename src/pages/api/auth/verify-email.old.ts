// src/pages/api/auth/verify-email.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 0) Nur GET erlauben
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end('Method Not Allowed')
  }

  const token = req.query.token
  if (typeof token !== 'string') {
    return res.status(400).json({ error: 'Token fehlt' })
  }

  // 1) Token laden + prüfen
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Token ungültig oder abgelaufen' })
  }

  // 2) E-Mail verifizieren
  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
  })

  // 3) Einmal-Token löschen
  await prisma.emailVerificationToken.delete({
    where: { token },
  })

  // 4) Weiterleiten (307 = Temporärer Redirect)
  res.writeHead(307, { Location: `/auth/signin?verified=1` })
  return res.end()
}