// src/lib/tradeParser.ts
// Freitext → Wertpapier-Transaktion ("hab für 500 Euro MSCI World gekauft",
// "3 Apple Aktien verkauft zu 280"). Zweiter Baustein der Sprach-Eingabe.
//
// Der Parser extrahiert NUR die Absicht (Kauf/Verkauf, Instrument-Text,
// Beträge) — die Auflösung auf ein konkretes Wertpapier passiert danach
// gegen die Depot-Bestände des Nutzers (höchste Priorität) und die
// kuratierten Kataloge. Gespeichert wird IMMER erst nach Bestätigung.
//
// Nur serverseitig verwenden (OPENAI_API_KEY).

import { searchETFs } from '@/lib/etfUtils'
import { stocks } from '@/data/stocks'

export interface ParsedTradeOk {
  ok: true
  side: 'buy' | 'sell'
  /** Instrument, wie der Nutzer es genannt hat ("MSCI World", "Apple") */
  query: string
  /** Gesamtbetrag in EUR, falls genannt */
  totalEur?: number
  /** Stückzahl, falls genannt */
  quantity?: number
  /** Preis pro Stück in EUR, falls genannt */
  pricePerUnit?: number
  /** ISO-Datum (yyyy-mm-dd); "gestern" etc. wird relativ zu heute aufgelöst */
  date: string
}

export type ParsedTrade = ParsedTradeOk | { ok: false; reason: string }

const MAX_EUR = 10_000_000

export async function parseTradeEntry(text: string): Promise<ParsedTrade> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, reason: 'Parser nicht konfiguriert' }

  const cleaned = text.trim().slice(0, 300)
  if (cleaned.length < 3) return { ok: false, reason: 'Eingabe zu kurz' }

  const today = new Date().toISOString().split('T')[0]

  const prompt = `Du wandelst eine deutsche Freitext-Eingabe in eine Wertpapier-Transaktion um. Heute ist ${today}.

EINGABE: "${cleaned}"

Antworte NUR mit einem JSON-Objekt:
- Erfolgsfall: {"ok": true, "side": "buy"|"sell", "query": "<Instrument wie genannt>", "totalEur": <Zahl|null>, "quantity": <Zahl|null>, "pricePerUnit": <Zahl|null>, "date": "<yyyy-mm-dd>"}
- Wenn keine Kauf-/Verkaufsabsicht mit Instrument erkennbar ist: {"ok": false, "reason": "<kurze deutsche Begründung>"}

REGELN:
- "query" ist der Instrument-Name so wie genannt, ohne Füllwörter ("MSCI World", "Apple", "Allianz")
- Beträge normalisieren: "500 Euro" → totalEur 500; "3 Stück zu 280" → quantity 3, pricePerUnit 280; "15k" = 15000
- Nenne nur Felder, die WIRKLICH in der Eingabe stehen — nichts erfinden, fehlende als null
- "gestern"/"vorgestern"/"letzten Freitag" relativ zu heute (${today}) als Datum auflösen; ohne Angabe: heute
- Fremdwährungsbeträge (Dollar etc.): ok:false mit Begründung
- Vermögens-Updates ohne Kauf/Verkauf ("Tagesgeld ist jetzt 5000") → ok:false mit Hinweis auf die Vermögens-Seite`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein präziser Parser. Antworte ausschließlich mit validem JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 250,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return { ok: false, reason: 'Parser momentan nicht erreichbar' }

    const data = await res.json()
    const raw = JSON.parse(data.choices?.[0]?.message?.content || '{}')

    if (raw.ok !== true) {
      return { ok: false, reason: typeof raw.reason === 'string' ? raw.reason : 'Eingabe nicht erkannt' }
    }

    const side = raw.side === 'sell' ? 'sell' : raw.side === 'buy' ? 'buy' : null
    const query = typeof raw.query === 'string' ? raw.query.trim().slice(0, 60) : ''
    if (!side || !query) return { ok: false, reason: 'Kauf/Verkauf oder Instrument nicht erkannt' }

    const num = (v: unknown): number | undefined => {
      const n = Number(v)
      return Number.isFinite(n) && n > 0 && n <= MAX_EUR ? n : undefined
    }

    const totalEur = num(raw.totalEur)
    const quantity = num(raw.quantity)
    const pricePerUnit = num(raw.pricePerUnit)
    if (!totalEur && !quantity) {
      return { ok: false, reason: 'Weder Betrag noch Stückzahl erkannt' }
    }

    const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : today

    return { ok: true, side, query, totalEur, quantity, pricePerUnit, date }
  } catch {
    return { ok: false, reason: 'Parser momentan nicht erreichbar' }
  }
}

// =====================================================
// Instrument-Auflösung: Depot-Bestände zuerst, dann Kataloge
// =====================================================

export interface InstrumentCandidate {
  symbol: string
  name: string
  /** 'depot' = liegt bereits im Depot des Nutzers */
  source: 'depot' | 'etf' | 'aktie'
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9äöüß ]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Kandidaten für einen Instrument-Text finden.
 * Priorität: 1) Bestände im Depot (dort ist die Absicht fast immer gemeint),
 * 2) kuratierter ETF-Katalog, 3) Aktien-Stammdaten. Max. 4 Kandidaten.
 */
export function resolveInstrument(
  query: string,
  userHoldings: { symbol: string; name: string }[],
): InstrumentCandidate[] {
  const q = normalize(query)
  if (!q) return []
  const tokens = q.split(' ').filter(t => t.length > 1)
  const matches = (candidate: string): boolean => {
    const c = normalize(candidate)
    return tokens.length > 0 && tokens.every(t => c.includes(t))
  }

  const seen = new Set<string>()
  const result: InstrumentCandidate[] = []
  const push = (symbol: string, name: string, source: InstrumentCandidate['source']) => {
    const key = symbol.toUpperCase()
    if (seen.has(key) || result.length >= 4) return
    seen.add(key)
    result.push({ symbol: key, name, source })
  }

  // 1) Depot-Bestände (Name ODER Symbol passt)
  for (const h of userHoldings) {
    if (matches(h.name) || normalize(h.symbol) === q) push(h.symbol, h.name, 'depot')
  }

  // 2) ETF-Katalog (kuratiert, inkl. Fuzzy-Suche)
  if (result.length < 4) {
    for (const etf of searchETFs(query, 4)) {
      push(etf.symbol, etf.name, 'etf')
    }
  }

  // 3) Aktien-Stammdaten — mit Ranking statt Fundreihenfolge, sonst gewinnt
  // "Apple Hospitality REIT" oder "Maui Land & Pineapple" gegen Apple Inc.
  if (result.length < 4) {
    const scored: { ticker: string; name: string; score: number }[] = []
    for (const s of stocks) {
      const name = normalize(s.name)
      let score = 0
      if (normalize(s.ticker) === q) score = 90
      else if (name === q) score = 100
      else if (name.startsWith(q)) score = 80
      else if (tokens.length > 0 && tokens.every(t => new RegExp(`(^| )${t}`).test(name))) score = 60
      else if (matches(s.name)) score = 30
      if (score > 0) scored.push({ ticker: s.ticker, name: s.name, score })
    }
    scored.sort((a, b) => b.score - a.score || a.name.length - b.name.length)
    for (const s of scored) {
      if (result.length >= 4) break
      push(s.ticker, s.name, 'aktie')
    }
  }

  return result
}
