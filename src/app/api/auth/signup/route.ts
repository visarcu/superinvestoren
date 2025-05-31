// File: src/app/api/auth/signup/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { sendMail } from '@/lib/mailer'

// 1) Zod‐Schema
const SignupSchema = z.object({
  email: z.string().email({ message: 'Ungültige E-Mail' }),
  password: z
    .string()
    .min(8, { message: 'Mindestens 8 Zeichen' })
    .regex(/[A-Z]/, { message: 'Mindestens 1 Großbuchstabe' })
    .regex(/[0-9]/, { message: 'Mindestens 1 Zahl' }),
  firstName: z.string().optional(),
  lastName:  z.string().optional(),
})

export async function POST(request: Request) {
  // 2) Body auslesen
  const body = await request.json()

  // 3) Validierung mit Zod
  const parsed = SignupSchema.safeParse(body)
  if (!parsed.success) {
    const issueMsg = parsed.error.issues[0].message
    return NextResponse.json(
      { error: issueMsg },
      { status: 400 }
    )
  }
  const { email, password, firstName, lastName } = parsed.data

  // 4) Prüfen, ob E-Mail schon existiert
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: 'Diese E-Mail ist bereits registriert.' },
      { status: 409 }
    )
  }

  // 5) Passwort hashen und User anlegen
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      isPremium: false,
      firstName,
      lastName,
      emailVerified: false,
    },
  })

  // 6) Verifikations‐Token erzeugen
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 Stunden

  await prisma.emailVerificationToken.create({
    data: {
      token,
      user:      { connect: { id: user.id } },
      expiresAt: expires,
    },
  })

  // 7) Bestätigungs‐Link bauen und Mail versenden
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`
  try {
    await sendMail({
      to:      email,
      subject: 'Bitte bestätige deine E-Mail bei FinClue',
      html: `
        <p>Hi ${firstName || 'User'},</p>
        <p>Klicke <a href="${verifyUrl}">hier</a>, um deine E-Mail-Adresse zu bestätigen.</p>
        <p>Der Link ist 24 Stunden gültig.</p>
      `,
    })
  } catch (err) {
    console.error('❌ Fehler beim Versand der Verifizierungs-Mail:', err)
    // optional: trotzdem success=true zurückgeben
  }

  // 8) Erfolg zurückgeben
  return NextResponse.json(
    { success: true },
    { status: 201 }
  )
}

// Wenn eine andere Methode (z.B. GET) an diese Route kommt, gib 405 zurück:
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}