// Beispiel für Next.js App Router: src/app/api/investor/[slug]/subscribe/route.ts
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const { email } = await req.json()
  // hier mail-Format prüfen, in DB speichern, Newsletter-Service aufrufen etc.
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Ungültige E-Mail' }, { status: 400 })
  }
  // saveSubscription(params.slug, email)
  return NextResponse.json({ success: true })
}