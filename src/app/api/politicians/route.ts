// src/app/api/politicians/route.ts
// Liefert US-Kongress Aktien-Trades via FMP senate-disclosure-rss-feed
import { NextRequest, NextResponse } from 'next/server'

const FMP_API_KEY = process.env.FMP_API_KEY
const FMP_BASE = 'https://financialmodelingprep.com/api/v4'

export interface PoliticianTrade {
  disclosureYear: string
  disclosureDate: string
  transactionDate: string
  owner: string
  ticker: string
  assetDescription: string
  type: string
  amount: string
  representative: string
  district: string
  link: string
  capitalGainsOver200USD: string
  // Derived
  slug: string
  party?: string
  state?: string
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function getStateFromDistrict(district: string): string {
  if (!district) return ''
  // District format: "TX11", "NY03", "CA-S1" (Senate)
  const match = district.match(/^([A-Z]{2})/i)
  return match ? match[1].toUpperCase() : district
}

// GET /api/politicians?page=0&politician=nancy-pelosi
export async function GET(req: NextRequest) {
  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'FMP API Key fehlt' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '0')
  const politicianSlug = searchParams.get('politician') || ''
  const pages = parseInt(searchParams.get('pages') || '1') // Wie viele Pages laden

  try {
    if (politicianSlug) {
      // Mehrere Seiten laden und nach Politiker filtern
      const targetName = slugToName(politicianSlug)
      const pageCount = Math.min(pages, 10) // max 10 pages für Einzelseite

      const allTrades: PoliticianTrade[] = []

      for (let p = 0; p < pageCount; p++) {
        const url = `${FMP_BASE}/senate-disclosure-rss-feed?page=${p}&apikey=${FMP_API_KEY}`
        const res = await fetch(url, { next: { revalidate: 3600 } })
        if (!res.ok) break
        const data = await res.json()
        if (!Array.isArray(data) || data.length === 0) break

        const filtered = data.filter((t: any) =>
          t.representative?.toLowerCase() === targetName.toLowerCase()
        )

        filtered.forEach((t: any) => {
          allTrades.push({
            ...t,
            slug: nameToSlug(t.representative),
            state: getStateFromDistrict(t.district),
          })
        })
      }

      return NextResponse.json({ trades: allTrades, politician: targetName })
    }

    // Standard: RSS Feed für letzte Trades
    const url = `${FMP_BASE}/senate-disclosure-rss-feed?page=${page}&apikey=${FMP_API_KEY}`
    const res = await fetch(url, { next: { revalidate: 1800 } })

    if (!res.ok) {
      return NextResponse.json({ error: 'FMP API Fehler' }, { status: res.status })
    }

    const raw = await res.json()
    if (!Array.isArray(raw)) {
      return NextResponse.json({ trades: [] })
    }

    const trades: PoliticianTrade[] = raw.map((t: any) => ({
      ...t,
      slug: nameToSlug(t.representative),
      state: getStateFromDistrict(t.district),
    }))

    return NextResponse.json({ trades, page })
  } catch (err) {
    console.error('Politiker-Trades Fehler:', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
