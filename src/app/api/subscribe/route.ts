// src/app/api/subscribe/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const { email, slug } = await request.json()

  if (!email || !slug) {
    return NextResponse.json(
      { error: 'E-Mail und Investor-Slug sind erforderlich.' },
      { status: 400 }
    )
  }

  // 1) Prüfen, ob der User existiert und E-Mail verifiziert hat
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true }
  })
  if (!user) {
    return NextResponse.json(
      { error: 'Diese E-Mail ist uns nicht bekannt. Bitte registriere dich zuerst.' },
      { status: 404 }
    )
  }
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Bitte bestätige zuerst deine E-Mail-Adresse.' },
      { status: 403 }
    )
  }

  // 2) Subscriber upsert
  try {
    await prisma.subscriber.upsert({
      where: { email_investorSlug: { email, investorSlug: slug } },
      update: {},
      create: { email, investorSlug: slug },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Subscribe Error:', e)
    return NextResponse.json(
      { error: 'Subscription fehlgeschlagen.' },
      { status: 500 }
    )
  }
}