// src/app/api/portfolio/summary/route.ts
// Single source of truth for portfolio value calculation
// Both web and mobile should use this to ensure identical values
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectTickerCurrency } from '@/lib/fmp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const FMP_API_KEY = process.env.FMP_API_KEY

async function getRate(from: string, to: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://finclue.de'}/api/exchange-rate?from=${from}&to=${to}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.rate === 'number' ? data.rate : null
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
    let portfolioQuery = supabaseAdmin.from('portfolios').select('id, name, cash_position').eq('user_id', user.id)
    if (portfolioId) portfolioQuery = portfolioQuery.eq('id', portfolioId)
    const { data: portfolios, error: pErr } = await portfolioQuery
    if (pErr || !portfolios?.length) {
      return NextResponse.json({ totalValue: 0, stockValue: 0, cashPosition: 0, holdings: [] })
    }

    const portfolioIds = portfolios.map(p => p.id)
    const cashPosition = portfolios.reduce((sum, p) => sum + (Number(p.cash_position) || 0), 0)

    // 2. Get holdings
    const { data: rawHoldings } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('*')
      .in('portfolio_id', portfolioIds)

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

    // 4. Get live quotes
    const symbols = holdingsList.map((h: any) => h.symbol).join(',')
    const quotesRes = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${FMP_API_KEY}`
    )
    const quotes = quotesRes.ok ? await quotesRes.json() : []
    const quoteMap: Record<string, number> = {}
    for (const q of (Array.isArray(quotes) ? quotes : [])) {
      if (q.symbol && q.price) quoteMap[q.symbol] = q.price
    }

    // 5. Get exchange rates
    const currencies = new Set(holdingsList.map((h: any) => detectTickerCurrency(h.symbol)))
    const usdRate = currencies.has('USD') ? await getRate('USD', 'EUR') : null
    const gbpRate = currencies.has('GBP') ? await getRate('GBP', 'EUR') : null

    // 6. Calculate values
    let stockValue = 0
    let totalCost = 0
    const enrichedHoldings = holdingsList.map((h: any) => {
      const apiPrice = quoteMap[h.symbol] || 0
      const tickerCur = detectTickerCurrency(h.symbol)
      let priceEUR: number

      if (tickerCur === 'EUR') {
        priceEUR = apiPrice
      } else if (tickerCur === 'GBP' && gbpRate) {
        priceEUR = (apiPrice / 100) * gbpRate // GBX→GBP→EUR
      } else if (tickerCur === 'USD' && usdRate) {
        priceEUR = apiPrice * usdRate
      } else {
        priceEUR = apiPrice // Fallback (should not happen)
      }

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
    }, {
      headers: { 'Cache-Control': 'private, max-age=60' } // 1 min cache
    })
  } catch (error: any) {
    console.error('[Portfolio Summary] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
