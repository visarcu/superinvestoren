// File: src/app/api/auth/verify-email/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  // 0) Extrahiere den Token aus dem Query-String
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) {
    return NextResponse.json(
      { error: 'Token fehlt' },
      { status: 400 }
    )
  }

  // 1) Suche das Token in der DB
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Token ungültig oder abgelaufen' },
      { status: 400 }
    )
  }

  // 2) Verifiziere die E-Mail
  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
  })

  // 3) Lösche das One-Time-Token
  await prisma.emailVerificationToken.delete({
    where: { token },
  })

  // 4) Leite weiter auf die Login-Seite mit ?verified=1
  //    (Relative Redirect innerhalb derselben Domain)
  return NextResponse.redirect(new URL('/auth/signin?verified=1', request.url))
}