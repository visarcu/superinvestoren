// src/app/api/unsubscribe/route.ts
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

  //try {
    //await prisma.subscriber.delete({
     // where: { email_investorSlug: { email, investorSlug: slug } },
   // })
  //} catch {
    // falls nicht gefunden, trotzdem OK
 // }
  return NextResponse.json({ success: true })
}