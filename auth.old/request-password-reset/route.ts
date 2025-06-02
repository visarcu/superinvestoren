// File: src/app/api/auth/forgot-password/route.ts

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendMail } from '@/lib/mailer'

// Diese Funktion wird automatisch für POST-Anfragen auf
// /api/auth/forgot-password aufgerufen
export async function POST(request: Request) {
  // 1) Body aus der Request auslesen
  //    In TypeScript können wir den Typ einfach so definieren:
  let { email }: { email?: string } = await request.json()

  // 2) Validierung: Prüfen, ob "email" korrekt übergeben wurde
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Ungültige E-Mail' },
      { status: 400 }
    )
  }

  // 3) Existenzprüfung des Users (aber aus Datenschutz- bzw. Sicherheitsgründen
  //    geben wir immer "200 OK" zurück, auch wenn die Mailadresse nicht existiert)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  // 4) Token generieren und in der DB speichern
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60) // Token 1 Stunde gültig

  await prisma.passwordResetToken.create({
    data: {
      token,
      user:      { connect: { id: user.id } },
      expiresAt: expires,
    },
  })

  // 5) Reset-URL bauen und Mail versenden
  //    Achte darauf, dass NEXTAUTH_URL in Vercel korrekt auf deine Live-Domain zeigt
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

  // Sende die E-Mail (Fehler beim Versand fangen wir ab, aber geben trotzdem „ok: true“ zurück)
  try {
    await sendMail({
      to:      email,
      subject: 'Passwort zurücksetzen – SuperInvestor',
      html: `
        <p>Hallo,</p>
        <p>Hier dein Link zum Zurücksetzen deines Passworts (1 Stunde gültig):</p>
        <p><a href="${resetUrl}">Passwort zurücksetzen</a></p>
      `,
    })
  } catch (err) {
    console.error('Fehler beim Versenden der Passwort-Reset-Mail:', err)
    // Aus Sicherheitsgründen kein Fehlerstatus zurückgeben, damit Angreifer nicht erkennen,
    // ob die Mailstelle existiert oder nicht
  }

  // 6) Immer Erfolg (200 OK) zurückgeben
  return NextResponse.json({ ok: true })
}