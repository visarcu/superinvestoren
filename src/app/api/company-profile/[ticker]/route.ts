// src/app/api/company-profile/[ticker]/route.ts
import { NextRequest, NextResponse } from 'next/server'

// FMP liefert für manche OTC-/Sekundär-Listings falsche Profile-Felder
// (Website zeigt auf andere Firma, Branche stimmt nicht etc.).
// Hier manuell überschreiben, bis FMP das fixt.
const PROFILE_OVERRIDES: Record<string, Record<string, string>> = {
  VULNF: {
    website: 'https://v-er.eu',
    industry: 'Battery Materials',
    sector: 'Industrial Materials',
  },
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache für 1 Stunde da sich Profile selten ändern
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const override = PROFILE_OVERRIDES[ticker.toUpperCase()]
    if (override && Array.isArray(data) && data.length > 0) {
      data[0] = { ...data[0], ...override }
    }
    return NextResponse.json(data)

  } catch (error) {
    console.error(`Error fetching company profile for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch company profile' }, { status: 500 })
  }
}