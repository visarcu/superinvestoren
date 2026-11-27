// src/app/api/income-statement/[ticker]/route.ts
//
// Jahresabschlüsse (GuV) in der Kurswährung. FMP liefert sie in der
// Berichtswährung der Firma (TSM: TWD, Unilever: EUR); die Abnehmer stellen
// sie aber neben Kurs und Schätzungen aus /api/analyst-estimates, die bereits
// in der Kurswährung stehen. Quoten (Margen) bleiben von der Umrechnung
// unberührt, siehe convertStatementRow.
//
// `limit` (1 bis 40, Standard 1): Die Übersicht braucht nur das letzte Jahr
// für die Margen, "Umsatz & Gewinn" fünf Jahre für den Verlauf. Vorher wurde
// der Parameter ignoriert und die Seite bekam immer ein einziges Jahr.
import { NextRequest, NextResponse } from 'next/server'
import { withSources } from '@/lib/dev/withSources'
import { convertStatementRow, getReportingCurrencyInfo, isForeignReporting } from '@/lib/fmpCurrency'

const MAX_LIMIT = 40

async function handler(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const requested = parseInt(request.nextUrl.searchParams.get('limit') || '1', 10)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), MAX_LIMIT) : 1

  try {
    const [response, currencyInfo] = await Promise.all([
      fetch(
        `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=${limit}&apikey=${apiKey}`,
        { next: { revalidate: 86400 } }
      ),
      getReportingCurrencyInfo(ticker, apiKey).catch(() => null),
    ])

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data) || !currencyInfo || !isForeignReporting(currencyInfo)) {
      return NextResponse.json(data)
    }

    if (currencyInfo.fxToTrading == null) {
      // Ohne Devisenkurs bleiben die Zeilen in der Berichtswährung; das Feld
      // reportedCurrency sagt den Abnehmern, was sie bekommen.
      console.warn(`[income-statement] ${ticker}: kein FX-Kurs ${currencyInfo.reportedCurrency}->${currencyInfo.tradingCurrency}, liefere Berichtswährung`)
      return NextResponse.json(data)
    }

    const fx = currencyInfo.fxToTrading
    const to = currencyInfo.tradingCurrency!
    return NextResponse.json(data.map((row: Record<string, any>) => convertStatementRow(row, fx, to)))

  } catch (error) {
    console.error(`Error fetching income statement for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch income statement' }, { status: 500 })
  }
}

export const GET = withSources('income-statement', handler)
