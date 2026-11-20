import { NextRequest, NextResponse } from 'next/server'
import { getReportingCurrencyInfo } from '@/lib/fmpCurrency'

// Die Schätzungen werden hier in die Handelswährung umgerechnet, weil beide
// Abnehmer (ForwardPETable, ProfessionalValuationTable) Kurs / EPS rechnen.
// Siehe lib/fmpCurrency: ohne Umrechnung zeigt TSM ein Forward-KGV von 0,5.
export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  const { ticker } = params

  if (!/^[A-Z0-9.-]{1,10}$/i.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
  }

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const [response, fx] = await Promise.all([
      fetch(
        `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?apikey=${apiKey}`,
        { next: { revalidate: 3600 } }
      ),
      getReportingCurrencyInfo(ticker, apiKey),
    ])

    if (!response.ok) {
      throw new Error(`Analyst Estimates API responded with status ${response.status}`)
    }

    const estimates = await response.json()
    const { reportedCurrency, tradingCurrency, fxToTrading } = fx

    if (!Array.isArray(estimates) || !reportedCurrency || !tradingCurrency || reportedCurrency === tradingCurrency) {
      return NextResponse.json(estimates)
    }

    if (fxToTrading == null) {
      // Lieber keine Schätzungen als Kennzahlen in der falschen Währung
      console.error(`Analyst estimates ${ticker}: kein FX-Kurs ${reportedCurrency}->${tradingCurrency}`)
      return NextResponse.json({ error: 'Exchange rate unavailable' }, { status: 502 })
    }

    const converted = estimates.map((e: Record<string, any>) => {
      const out: Record<string, any> = { ...e }
      for (const [key, value] of Object.entries(e)) {
        if (key.startsWith('estimated') && typeof value === 'number') {
          out[key] = value * fxToTrading
        }
      }
      out.currency = tradingCurrency
      out.convertedFrom = reportedCurrency
      return out
    })

    return NextResponse.json(converted)

  } catch (error) {
    console.error(`Analyst estimates error for ${ticker}:`, error)
    return NextResponse.json({ error: 'Failed to fetch analyst estimates data' }, { status: 500 })
  }
}
