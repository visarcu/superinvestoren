// src/app/api/subscribe/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const { email, slug } = await request.json()
  if (!email || !slug) {
    return NextResponse.json(
      { error: 'email und slug sind erforderlich' },
      { status: 400 }
    )
  }

  try {
    await prisma.subscriber.upsert({
      where:       { email_investorSlug: { email, investorSlug: slug } },
      update:      {},
      create:      { email, investorSlug: slug },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Subscribe Error:', e)
    return NextResponse.json(
      { error: 'Subscription fehlgeschlagen' },
      { status: 500 }
    )
  }
}