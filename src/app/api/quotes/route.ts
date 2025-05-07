// src/app/api/quotes/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get('symbols')
  if (!symbols) {
    return NextResponse.json([], { status: 400 })
  }

  // **Hier** URL-Encoding pro Symbol:
  const encoded = symbols
    .split(',')
    .map((s) => encodeURIComponent(s))
    .join(',')

  const url = `https://financialmodelingprep.com/api/v3/quote/${encoded}?apikey=${process.env.FMP_API_KEY}`

  let quotes
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`FMP antwortete mit ${res.status}`)
    quotes = await res.json()
  } catch (err) {
    console.error('fetch /api/quotes failed:', err)
    return NextResponse.json([], { status: 502 })
  }

  return NextResponse.json(quotes)
}