// src/pages/api/auth/resend-verification.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { sendMail } from '@/lib/mailer'  // deine Mailer-Lib

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'E-Mail ist erforderlich.' })

  // User & Token löschen / neu erzeugen
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(404).json({ error: 'E-Mail unbekannt.' })
  if (user.emailVerified) {
    return res.status(400).json({ error: 'E-Mail ist schon verifiziert.' })
  }

  // vorhandene Tokens löschen
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })

  // neuen Token erzeugen
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)
  await prisma.emailVerificationToken.create({
    data: { token, user: { connect: { id: user.id } }, expiresAt },
  })

  // Mail erneut versenden
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`
  await sendMail({
    to: email,
    subject: 'E-Mail erneut bestätigen – SuperInvestor',
    html: `
      <p>Hi,</p>
      <p>hier ist dein neuer Bestätigungslink (24 h gültig):</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    `,
  })

  return res.status(200).json({ success: true })
}