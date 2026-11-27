// src/app/api/portfolio/summary/route.ts
// Single source of truth for portfolio value calculation
// Both web and mobile should use this to ensure identical values
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectTickerCurrency } from '@/lib/fmp'
import { convertPriceToEurStrict } from '@/lib/portfolioValuation'
import { getQuotes } from '@/lib/marketData/quoteService'
import { convertAmount } from '@/lib/marketData/currency'
import { getExchangeRate } from '@/lib/exchangeRates'
import { countedDepots } from '@/lib/sampleDepotShared'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Wechselkurs direkt aus dem Kursdienst statt per HTTP-Selbstaufruf über die
// eigene Website (der scheiterte in Vorschauen und bei jedem Aussetzer der Route).
async function getRate(from: string, to: string): Promise<number | null> {
  try {
    const rate = await getExchangeRate(from, to)
    return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.split(' ')[1]
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const portfolioId = searchParams.get('portfolioId') // null = all

  try {
    // 1. Get portfolios
    let portfolioQuery = supabaseAdmin.from('portfolios').select('id, name, cash_position, broker_name').eq('user_id', user.id)
    if (portfolioId) portfolioQuery = portfolioQuery.eq('id', portfolioId)
    const { data: portfolioRows, error: pErr } = await portfolioQuery
    // Ein Datenbankfehler ist kein leeres Depot: Vorher kam dann 200 mit
    // Nullwerten, und die App zeigte ein leeres Depot statt einer Störung.
    if (pErr) throw pErr
    if (!portfolioRows?.length) {
      return NextResponse.json({ totalValue: 0, stockValue: 0, cashPosition: 0, holdings: [] })
    }
    // Über alle Depots zählt das Beispieldepot nicht mit, einzeln abgefragt schon
    const portfolios = countedDepots(portfolioRows)

    const portfolioIds = portfolios.map(p => p.id)
    const cashPosition = portfolios.reduce((sum, p) => sum + (Number(p.cash_position) || 0), 0)

    // 2. Get holdings
    const { data: rawHoldings, error: hErr } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('*')
      .in('portfolio_id', portfolioIds)
    if (hErr) throw hErr

    if (!rawHoldings?.length) {
      return NextResponse.json({ totalValue: cashPosition, stockValue: 0, cashPosition, holdings: [] })
    }

    // 3. Merge duplicate symbols (weighted avg purchase price)
    const merged: Record<string, any> = {}
    for (const h of rawHoldings) {
      if (!merged[h.symbol]) {
        merged[h.symbol] = { ...h }
      } else {
        const oldQty = merged[h.symbol].quantity || 0
        const oldPrice = merged[h.symbol].purchase_price || 0
        const newQty = h.quantity || 0
        const newPrice = h.purchase_price || 0
        const totalQty = oldQty + newQty
        merged[h.symbol].quantity = totalQty
        merged[h.symbol].purchase_price = totalQty > 0
          ? ((oldQty * oldPrice) + (newQty * newPrice)) / totalQty
          : newPrice
      }
    }
    const holdingsList = Object.values(merged)

    // 4. Live-Kurse über den zentralen Quote-Service.
    //
    // Vorher lief hier ein nackter FMP-Aufruf ohne jede Ausweichquelle: Kurse,
    // die FMP nicht führt (etliche Xetra-ETFs), landeten still als 0 € im
    // Depotwert der App. Der Service liefert den Kurs in der Währung, die
    // detectTickerCurrency weiter unten für dieses Symbol erwartet.
    const symbols = holdingsList.map((h: any) => String(h.symbol || '')).filter(Boolean)
    const quotes = await getQuotes(symbols)
    const quoteMap: Record<string, number> = {}
    const missingQuotes: string[] = []

    for (const symbol of symbols) {
      const quote = quotes.get(symbol.toUpperCase())
      if (!quote) {
        missingQuotes.push(symbol)
        continue
      }
      const expected = detectTickerCurrency(symbol) === 'GBP' ? 'GBX' : detectTickerCurrency(symbol)
      const price = await convertAmount(quote.price, quote.currency, expected)
      if (price === null || price <= 0) {
        missingQuotes.push(symbol)
        continue
      }
      quoteMap[symbol] = price
    }

    if (missingQuotes.length > 0) {
      console.warn('[portfolio/summary] Kein Kurs für:', missingQuotes.join(', '))
    }

    // 5. Get exchange rates — für ALLE vorkommenden Quote-Währungen
    // (JPY/CHF/CAD/… wurden vorher nie konvertiert: Tokio-Kurse in Yen
    // landeten 1:1 als Euro im Depotwert)
    const currencies = new Set(holdingsList.map((h: any) => detectTickerCurrency(h.symbol)))
    const rateEntries = await Promise.all(
      [...currencies].filter(c => c !== 'EUR').map(async c => [c, await getRate(c, 'EUR')] as const)
    )
    const byCurrency: Record<string, number | null> = Object.fromEntries(rateEntries)
    const usdRate = byCurrency['USD'] ?? null
    const gbpRate = byCurrency['GBP'] ?? null

    // 6. Calculate values
    let stockValue = 0
    let totalCost = 0
    const missingFx: string[] = []
    const enrichedHoldings = holdingsList.map((h: any) => {
      const apiPrice = quoteMap[h.symbol] || 0
      const tickerCur = detectTickerCurrency(h.symbol)
      // Kurs → EUR über die zentrale Bewertungslogik (EUR unverändert,
      // GBP kommt als GBX/Pence → ÷100 × Rate, USD × Rate, sonst unkonvertiert).
      // Ohne Kurs oder Wechselkurs zählt die Position zum Einstand, statt mit
      // 0 € oder mit Pence als Euro. Die Antwort kennzeichnet das (priceSource,
      // missingQuotes, missingFx, degraded); vorher galt der Einstand still als
      // bewerteter Depotwert mit 0 € Gewinn.
      const converted = apiPrice > 0
        ? convertPriceToEurStrict(apiPrice, tickerCur, { usdToEurRate: usdRate, gbpToEurRate: gbpRate, byCurrency })
        : null
      if (apiPrice > 0 && converted === null) missingFx.push(h.symbol)
      const priceSource: 'live' | 'cost' = converted !== null ? 'live' : 'cost'
      const priceEUR = converted ?? (h.purchase_price || 0)

      const qty = h.quantity || 0
      const value = priceEUR * qty
      const cost = (h.purchase_price || 0) * qty
      stockValue += value
      totalCost += cost

      return {
        symbol: h.symbol,
        name: h.name,
        quantity: qty,
        purchasePrice: h.purchase_price || 0,
        currentPrice: priceEUR,
        priceSource,
        value,
        cost,
        gainLoss: value - cost,
        gainLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        weight: 0, // computed below
      }
    })

    // Compute weights
    for (const h of enrichedHoldings) {
      h.weight = stockValue > 0 ? (h.value / stockValue) * 100 : 0
    }

    // Sort by value descending
    enrichedHoldings.sort((a: any, b: any) => b.value - a.value)

    const totalValue = stockValue + cashPosition
    const degraded = missingQuotes.length > 0 || missingFx.length > 0
    const totalGainLoss = stockValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    return NextResponse.json({
      totalValue,
      stockValue,
      cashPosition,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      usdToEurRate: usdRate,
      gbpToEurRate: gbpRate,
      holdingsCount: enrichedHoldings.length,
      holdings: enrichedHoldings,
      missingQuotes,
      missingFx,
      degraded,
    }, {
      // Bei Störung nicht zwischenspeichern, damit der nächste Abruf es erneut versucht
      headers: { 'Cache-Control': degraded ? 'private, no-store' : 'private, max-age=60' }
    })
  } catch (error: any) {
    console.error('[Portfolio Summary] Error:', error)
    return NextResponse.json(
      { error: 'Depot konnte nicht geladen werden', detail: error?.message || String(error) },
      { status: 500 },
    )
  }
}
