// File: src/app/api/auth/forgot-password/route.ts

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendMail } from '@/lib/mailer'

export async function POST(request: Request) {
  // 1) Body auslesen
  let { email }: { email?: string } = await request.json()

  // 2) Prüfen, ob E-Mail gültig übergeben wurde
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Ungültige E-Mail' },
      { status: 400 }
    )
  }

  // 3) Prüfen, ob der User existiert (aber keinen Unterschied verraten, falls nicht)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Sicherheits-Best Practice: Gib trotzdem 200 OK zurück, um nicht zu verraten,
    // ob die Adresse wirklich existiert oder nicht.
    return NextResponse.json({ success: true })
  }

  // 4) Token erzeugen + in der DB speichern
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 Stunde gültig
  await prisma.passwordResetToken.create({
    data: {
      token,
      user:      { connect: { id: user.id } },
      expiresAt: expires,
    },
  })

  // 5) Reset-URL zusammenbauen und Mail verschicken
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
  } catch (err) {
    console.error('Fehler beim Versenden der Reset-Mail:', err)
    // Wir geben trotzdem „success: true“ zurück, damit wir keine Daten leaken.
  }

  // 6) Erfolg zurückmelden
  return NextResponse.json({ success: true })
}