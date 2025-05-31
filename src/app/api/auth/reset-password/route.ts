// File: src/app/api/auth/reset-password/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// 1) Zod-Schema für den Request-Body
const ResetSchema = z.object({
  token:    z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, { message: 'Mindestens 1 Großbuchstabe' })
    .regex(/[0-9]/, { message: 'Mindestens 1 Zahl' }),
})

// 2) POST-Handler für /api/auth/reset-password
export async function POST(request: Request) {
  // a) Body parsen
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Ungültiger Request-Body' },
      { status: 400 }
    )
  }

  // b) Zod-Validierung
  const parse = ResetSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: parse.error.issues[0].message },
      { status: 400 }
    )
  }
  const { token, password } = parse.data

  // c) Token in der Datenbank nachschlagen
  const rec = await prisma.passwordResetToken.findUnique({
    where:   { token },
    include: { user: true },
  })
  if (!rec || rec.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Link ungültig oder abgelaufen' },
      { status: 400 }
    )
  }

  // d) Neues Passwort hashen und in der User-Tabelle updaten
  const hash = await bcrypt.hash(password, 10)
  await prisma.user.update({
    where: { id: rec.userId },
    data:  { passwordHash: hash },
  })

  // e) Verbrauchtes Token löschen
  await prisma.passwordResetToken.delete({
    where: { token },
  })

  // f) Erfolg zurückgeben
  return NextResponse.json({ success: true })
}