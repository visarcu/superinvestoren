// File: src/app/api/auth/reset-password/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// 1) Schema für neue Passwörter
const ResetSchema = z.object({
  token:    z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
})

export async function POST(request: Request) {
  // 2) Body validieren
  const body = await request.json()
  const result = ResetSchema.safeParse(body)
  if (!result.success) {
    const msg = result.error.issues[0].message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const { token, password } = result.data

  // 3) Token in DB prüfen
  const tokenEntry = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true }
  })

  if (
    !tokenEntry ||
    tokenEntry.expiresAt < new Date() ||
    !tokenEntry.user
  ) {
    return NextResponse.json(
      { error: 'Ungültiger oder abgelaufener Token' },
      { status: 400 }
    )
  }

  // 4) Neues Passwort hashen und speichern
  const hash = await bcrypt.hash(password, 10)
  await prisma.user.update({
    where: { id: tokenEntry.user.id },
    data: { passwordHash: hash },
  })

  // 5) Token löschen, damit er nicht nochmal verwendet werden kann
  await prisma.passwordResetToken.delete({ where: { token } })

  // 6) Erfolg zurückgeben
  return NextResponse.json({ success: true })
}