// src/pages/api/auth/forgot-password.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendMail } from '@/lib/mailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body
  if (typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Ungültige E-Mail' })
  }

  // 1) Existenz im DB prüfen (aber nicht verraten, wenn nicht gefunden)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Sicherheits-Best Practice: auch hier „200 OK” zurück, damit man nicht erkennen kann,
    // ob eine Adresse registriert ist oder nicht.
    return res.status(200).json({ success: true })
  }

  // 2) Token erzeugen + speichern
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 Stunde gültig
  await prisma.passwordResetToken.create({
    data: {
      token,
      user:    { connect: { id: user.id } },
      expiresAt: expires,
    }
  })

  // 3) Mail mit Reset-Link senden
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`
  try {
    await sendMail({
      to:      email,
      subject: 'SuperInvestor: Passwort zurücksetzen',
      html: `
        <p>Hallo ${user.firstName ?? ''},</p>
        <p>klicke <a href="${resetUrl}">hier</a>, um dein Passwort zurückzusetzen.</p>
        <p>Der Link ist 1 Stunde gültig.</p>
      `,
    })
  } catch (e) {
    console.error('Fehler beim Versenden der Reset-Mail:', e)
    // wir geben trotzdem success=true zurück, um keine Infos zu leaken
  }

  return res.status(200).json({ success: true })
}