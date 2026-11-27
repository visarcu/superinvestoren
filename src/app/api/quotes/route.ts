// src/app/api/quotes/route.ts
// Kurse für Depot, Watchlist und Detailseiten.
//
// Die Auflösung Symbol → Kursquelle liegt im Market-Data-Modul
// (src/lib/marketData): Stammdaten je ISIN, FMP unter Broker- und
// Börsenticker, Yahoo als letzte Instanz. Diese Route macht nur noch zwei
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

// Öffentliche Route: Zahl und Form der Symbole begrenzen. Ohne Deckel löste ein
// Aufruf mit tausenden Symbolen tausende FMP- und Yahoo-Anfragen aus und
// erschöpfte das Kontingent für alle Depots.
const MAX_SYMBOLS = 100
/** Ticker, ISIN oder Index (^GSPC, BRK-B, EURUSD=X): Buchstaben, Ziffern, Punkt, Bindestrich, Gleich, Dach */
const SYMBOL_SHAPE = /^[A-Za-z0-9^][A-Za-z0-9.\-_=^]{0,24}$/

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

  const symbolList = symbols
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && SYMBOL_SHAPE.test(s))
  if (symbolList.length === 0) {
    return NextResponse.json([])
  }
  if (symbolList.length > MAX_SYMBOLS) {
    return NextResponse.json({ error: `Höchstens ${MAX_SYMBOLS} Symbole je Abfrage` }, { status: 400 })
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
