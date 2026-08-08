// src/app/api/quotes/route.ts
// Kurse für Depot, Watchlist und Detailseiten.
//
// Die Auflösung Symbol → Kursquelle liegt im Market-Data-Modul
// (src/lib/marketData): Stammdaten je ISIN, EODHD für europäische Börsen,
// FMP für US-Werte, Yahoo als letzte Instanz. Diese Route macht nur noch zwei
// Dinge: Symbole entgegennehmen und die Antwort in das Format bringen, das die
// bestehenden Clients erwarten.
//
// Währungs-Contract: Der Client leitet die Währung aus dem Ticker-Suffix ab
// (detectTickerCurrency) und rechnet selbst in EUR um — '.L' erwartet er dabei
// in Pence. Der Preis muss also in genau dieser Währung geliefert werden,
// unabhängig davon, welcher Anbieter ihn geliefert hat.

import { NextResponse } from 'next/server'
import { getQuotes } from '@/lib/marketData/quoteService'
import { convertAmount } from '@/lib/marketData/currency'
import { detectTickerCurrency } from '@/lib/fmp'

function expectedCurrency(symbol: string): string {
  const currency = detectTickerCurrency(symbol)
  // Der Client behandelt '.L' als Pence (teilt durch 100).
  return currency === 'GBP' ? 'GBX' : currency
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get('symbols')
  if (!symbols) {
    return NextResponse.json([], { status: 400 })
  }

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)
  if (symbolList.length === 0) {
    return NextResponse.json([])
  }

  let quotes
  try {
    quotes = await getQuotes(symbolList)
  } catch (err) {
    console.error('/api/quotes fehlgeschlagen:', err)
    return NextResponse.json([], { status: 502 })
  }

  const out: Record<string, unknown>[] = []

  for (const symbol of symbolList) {
    const quote = quotes.get(symbol.toUpperCase())
    if (!quote) continue

    const target = expectedCurrency(symbol)
    const price = await convertAmount(quote.price, quote.currency, target)
    // Ohne belastbaren Umrechnungskurs lieber kein Kurs: eine nicht
    // umgerechnete Zahl landet sonst als echter Depotwert in der Oberfläche.
    if (price === null || price <= 0) continue

    const change = (await convertAmount(quote.change, quote.currency, target)) ?? 0
    const previousClose = (await convertAmount(quote.previousClose, quote.currency, target)) ?? 0
    const raw = (quote.raw || {}) as Record<string, unknown>

    out.push({
      // Zusatzfelder des Anbieters (marketCap, pe, yearHigh …) bleiben erhalten;
      // Heatmap und ETF-Detailseite lesen sie. Sie stehen — wie bisher — in der
      // Notierungswährung der Quelle.
      ...raw,
      symbol,
      name: quote.name || raw.name || symbol,
      price,
      change,
      changesPercentage: quote.changePercent,
      previousClose,
      currency: target,
      _source: `${quote.source}:${quote.sourceSymbol}`,
    })
  }

  return NextResponse.json(out)
}
