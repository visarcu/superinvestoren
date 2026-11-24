// src/lib/ai/tools/market.ts
// Suche, Kurse, Kursverlauf, Kursbewegung eines Tages, Marktüberblick.

import { z } from 'zod'
import { getQuotes } from '@/lib/marketData/quoteService'
import { getDailyHistory, type DailyBar } from '@/lib/marketData/history'
import type { NormalizedQuote } from '@/lib/marketData/types'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AiBlock } from '../types'
import { fmpList, finite, isoDaysAgo, normalizeSymbol, round, SYMBOL_PATTERN } from '../data/fmp'
import { firstReports, loadNews } from '../data/news'
import { seriesStats, thinOut } from '../data/valuation'
import { berlin, berlinIsoDay, berlinShort, defineTool, germanDate, newYorkToBerlin, ToolError } from './base'

export const symbolSchema = z.string().trim().min(1).max(15).transform(normalizeSymbol).refine(s => SYMBOL_PATTERN.test(s), 'ungültiges Symbol')
export const SYMBOL_PROP = { type: 'string', description: 'Börsensymbol wie NVDA, SAP.DE, ^GDAXI. Im Zweifel vorher wertpapier_suchen nutzen.' }

function quoteTime(q: NormalizedQuote): Date | null {
  const ts = finite(q.raw?.timestamp)
  return ts ? new Date(ts * 1000) : null
}

function quoteSummary(q: NormalizedQuote) {
  const time = quoteTime(q)
  return {
    symbol: q.symbol,
    name: q.name ?? null,
    kurs: round(q.price, q.price < 5 ? 4 : 2),
    waehrung: q.currency,
    veraenderung: round(q.change, 2),
    veraenderung_prozent: round(q.changePercent, 2),
    vortagesschluss: round(q.previousClose, 2),
    tagestief: round(finite(q.raw?.dayLow), 2),
    tageshoch: round(finite(q.raw?.dayHigh), 2),
    jahrestief: round(finite(q.raw?.yearLow), 2),
    jahreshoch: round(finite(q.raw?.yearHigh), 2),
    volumen: finite(q.raw?.volume),
    volumen_schnitt: finite(q.raw?.avgVolume),
    boersenwert: finite(q.raw?.marketCap),
    stand: time ? berlin(time) : null,
  }
}

export const wertpapierSuchen = defineTool({
  name: 'wertpapier_suchen',
  description:
    'Findet das Börsensymbol zu einem Firmennamen, ETF-Namen, einer ISIN oder einem unklaren Kürzel. Nutzen, wenn das Symbol nicht sicher bekannt ist. Bei europäischen Firmen die Heimatbörse (z. B. .DE) bevorzugen, bei US-Firmen das US-Symbol.',
  schema: z.object({ suche: z.string().trim().min(1).max(60) }),
  inputSchema: {
    type: 'object',
    properties: { suche: { type: 'string', description: 'Name, ISIN oder Kürzel, z. B. "Münchener Rück" oder "FTSE All-World ETF"' } },
    required: ['suche'],
    additionalProperties: false,
  },
  label: i => `Wertpapier „${i.suche}“ suchen`,
  async run({ suche }) {
    const isIsin = /^[A-Z]{2}[A-Z0-9]{9}\d$/i.test(suche)
    const like = suche.replace(/[%_,()]/g, ' ').trim()
    const [byName, byTicker, instruments] = await Promise.all([
      isIsin ? Promise.resolve([]) : fmpList('/api/v3/search', { query: suche, limit: 30 }, { revalidate: 86400 }),
      isIsin ? Promise.resolve([]) : fmpList('/api/v3/search-ticker', { query: suche, limit: 10 }, { revalidate: 86400 }),
      isIsin
        ? supabaseAdmin.from('instruments').select('isin, name, type, currency, fmp_symbol, yahoo_symbol').eq('isin', suche.toUpperCase()).limit(3)
        : supabaseAdmin.from('instruments').select('isin, name, type, currency, fmp_symbol, yahoo_symbol').ilike('name', `%${like}%`).limit(12),
    ])
    const q = suche.toUpperCase()
    const rank = (exchange: string) =>
      ({ NASDAQ: 0, NYSE: 0, AMEX: 1, ETF: 1, XETRA: 1, EURONEXT: 2, LSE: 2, SIX: 2 } as Record<string, number>)[exchange] ?? 4
    const seen = new Map<string, { symbol: string; name: string; boerse: string; waehrung: string | null; typ: string | null; score: number }>()
    for (const row of [...byTicker, ...byName]) {
      if (!row?.symbol || !row?.name || seen.has(row.symbol)) continue
      const name = String(row.name).toUpperCase()
      const text = row.symbol === q ? 0 : name === q ? 1 : name.startsWith(q) ? 2 : name.includes(q) ? 3 : 5
      seen.set(row.symbol, {
        symbol: row.symbol, name: row.name, boerse: row.exchangeShortName ?? row.exchange ?? '', waehrung: row.currency ?? null, typ: null,
        score: text * 2 + rank(row.exchangeShortName ?? ''),
      })
    }
    for (const row of instruments.data ?? []) {
      const symbol = row.fmp_symbol || row.yahoo_symbol
      if (!symbol || seen.has(symbol)) continue
      seen.set(symbol, { symbol, name: row.name, boerse: '', waehrung: row.currency, typ: row.type === 'etf' ? 'ETF' : 'Aktie', score: isIsin ? 0 : 7 })
    }
    const treffer = [...seen.values()].sort((a, b) => a.score - b.score).slice(0, 10).map(({ score, ...rest }) => rest)
    if (treffer.length === 0) throw new ToolError(`Kein Wertpapier zu „${suche}“ gefunden.`)
    return { data: { treffer } }
  },
})

export const kurs = defineTool({
  name: 'kurs',
  description: 'Aktueller Kurs, Tagesveränderung, Volumen, Börsenwert und Jahresspanne für bis zu 10 Symbole (Aktien, ETFs, Indizes wie ^GSPC ^NDX ^GDAXI, Krypto wie BTCUSD, Devisen wie EURUSD, Rohstoffe wie GCUSD).',
  schema: z.object({ symbole: z.array(symbolSchema).min(1).max(10) }),
  inputSchema: {
    type: 'object',
    properties: { symbole: { type: 'array', items: SYMBOL_PROP, minItems: 1, maxItems: 10 } },
    required: ['symbole'],
    additionalProperties: false,
  },
  label: i => `Kurs laden: ${i.symbole.join(', ')}`,
  async run({ symbole }) {
    const quotes = await getQuotes(symbole)
    const werte = symbole.map(s => quotes.get(s)).filter((q): q is NormalizedQuote => !!q).map(quoteSummary)
    if (werte.length === 0) throw new ToolError(`Kein Kurs für ${symbole.join(', ')} gefunden.`)
    return {
      data: { werte, ohne_kurs: symbole.filter(s => !quotes.has(s)) },
      sources: [{ label: 'Kurse', stand: werte[0]?.stand ?? null }],
    }
  },
})

const RANGES = { '1M': 30, '3M': 91, '6M': 182, '1J': 365, '3J': 1096, '5J': 1826, '10J': 3652, '20J': 7305 } as const

function performance(bars: DailyBar[], pick: (b: DailyBar) => number) {
  const first = bars[0]
  const last = bars[bars.length - 1]
  const start = pick(first)
  const end = pick(last)
  let peak = pick(first)
  let peakDate = first.date
  let drawdown = { pct: 0, von: first.date, bis: first.date }
  for (const b of bars) {
    const v = pick(b)
    if (v > peak) { peak = v; peakDate = b.date }
    const dd = (v / peak - 1) * 100
    if (dd < drawdown.pct) drawdown = { pct: dd, von: peakDate, bis: b.date }
  }
  const years = (Date.parse(last.date) - Date.parse(first.date)) / (365.25 * 86_400_000)
  const returns: number[] = []
  for (let i = 1; i < bars.length; i++) returns.push(pick(bars[i]) / pick(bars[i - 1]) - 1)
  const mean = returns.reduce((s, r) => s + r, 0) / Math.max(1, returns.length)
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, returns.length - 1)
  const stats = seriesStats(bars.map(b => [b.date, b.close]))
  return {
    von: first.date,
    bis: last.date,
    startkurs: round(first.close, 2),
    endkurs: round(last.close, 2),
    veraenderung_prozent: round((end / start - 1) * 100, 2),
    rendite_pro_jahr_prozent: years >= 1.5 ? round(((end / start) ** (1 / years) - 1) * 100, 2) : null,
    hoch: stats ? { kurs: round(stats.max, 2), datum: stats.maxDate } : null,
    tief: stats ? { kurs: round(stats.min, 2), datum: stats.minDate } : null,
    groesster_rueckgang_prozent: round(drawdown.pct, 2),
    rueckgang_von: drawdown.von,
    rueckgang_bis: drawdown.bis,
    schwankung_pro_jahr_prozent: round(Math.sqrt(variance * 252) * 100, 1),
  }
}

export const kursverlauf = defineTool({
  name: 'kursverlauf',
  description:
    'Wertentwicklung über einen Zeitraum für 1 bis 4 Symbole: Veränderung, Rendite pro Jahr, Hoch, Tief, größter Rückgang, Schwankung. Liefert eine Grafik. Für Vergleiche ("X gegen Y seit 2020") alle Symbole in einem Aufruf.',
  schema: z.object({
    symbole: z.array(symbolSchema).min(1).max(4),
    zeitraum: z.enum(['1M', '3M', '6M', 'lfd_jahr', '1J', '3J', '5J', '10J', '20J']).optional(),
    von: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    mit_dividenden: z.boolean().optional(),
  }),
  inputSchema: {
    type: 'object',
    properties: {
      symbole: { type: 'array', items: SYMBOL_PROP, minItems: 1, maxItems: 4 },
      zeitraum: { type: 'string', enum: ['1M', '3M', '6M', 'lfd_jahr', '1J', '3J', '5J', '10J', '20J'], description: 'Standard 1J. Nicht zusammen mit von/bis.' },
      von: { type: 'string', description: 'YYYY-MM-DD' },
      bis: { type: 'string', description: 'YYYY-MM-DD' },
      mit_dividenden: { type: 'boolean', description: 'true = Rendite inklusive wieder angelegter Dividenden' },
    },
    required: ['symbole'],
    additionalProperties: false,
  },
  label: i => `Kursverlauf laden: ${i.symbole.join(', ')}`,
  async run({ symbole, zeitraum, von, bis, mit_dividenden }, ctx) {
    const today = berlinIsoDay(ctx.now)
    const end = bis && bis < today ? bis : today
    const start =
      von ?? (zeitraum === 'lfd_jahr' ? `${Number(today.slice(0, 4)) - 1}-12-30` : isoDaysAgo(RANGES[(zeitraum ?? '1J') as keyof typeof RANGES], ctx.now))
    if (start >= end) throw new ToolError('Der Startzeitpunkt liegt nach dem Ende.')

    const pick = (b: DailyBar) => (mit_dividenden ? b.adjClose || b.close : b.close)
    const loaded = await Promise.all(symbole.map(async s => ({ symbol: s, bars: await getDailyHistory(s, start, end) })))
    const ok = loaded.filter(l => l.bars.length >= 2)
    if (ok.length === 0) throw new ToolError(`Keine Kurse für ${symbole.join(', ')} in diesem Zeitraum.`)

    const single = ok.length === 1
    const id = ctx.nextBlockId()
    const block: AiBlock = {
      id,
      type: 'linie',
      titel: single ? `${ok[0].symbol}, Kursverlauf` : 'Wertentwicklung in Prozent',
      einheit: single ? '' : '%',
      nachkommastellen: single ? 2 : 1,
      ohneNull: single,
      serien: ok.map(l => {
        const base = pick(l.bars[0])
        return {
          name: l.symbol,
          punkte: thinOut(l.bars.map(b => [b.date, single ? pick(b) : (pick(b) / base - 1) * 100] as [string, number])),
        }
      }),
    }
    return {
      data: {
        werte: ok.map(l => ({
          symbol: l.symbol,
          ...performance(l.bars, pick),
          ...(mit_dividenden
            ? l.symbol === '^GDAXI'
              ? { dividenden: 'enthalten (Performanceindex)' }
              : l.bars.some(b => Math.abs(b.adjClose / b.close - 1) > 0.001)
                ? { dividenden: 'enthalten' }
                : { dividenden: 'NICHT enthalten, reine Kursentwicklung. Für einen Index mit Dividenden den ETF nehmen (SPY statt ^GSPC, QQQ statt ^NDX).' }
            : {}),
        })),
        mit_dividenden: !!mit_dividenden,
        hinweis: 'Kurse in der jeweiligen Notierungswährung, um Aktiensplits bereinigt. Hoch, Tief und Rückgang beruhen auf Schlusskursen; das Jahreshoch im Werkzeug kurs ist der höchste Kurs im Tagesverlauf und liegt deshalb etwas höher.',
        ohne_daten: loaded.filter(l => l.bars.length < 2).map(l => l.symbol),
        grafik: id,
      },
      blocks: [block],
      sources: [{ label: 'Tageskurse', stand: `bis ${germanDate(ok[0].bars[ok[0].bars.length - 1].date)}` }],
    }
  },
})

const SECTOR_ETF: Record<string, string> = {
  Technology: 'XLK', 'Financial Services': 'XLF', Healthcare: 'XLV', Energy: 'XLE', Industrials: 'XLI',
  'Consumer Cyclical': 'XLY', 'Consumer Defensive': 'XLP', Utilities: 'XLU', 'Real Estate': 'XLRE',
  'Basic Materials': 'XLB', 'Communication Services': 'XLC',
}

function benchmarksFor(symbol: string, sector: string | null, industry: string | null): Array<{ symbol: string; name: string }> {
  if (/\.(DE|F)$/.test(symbol)) return [{ symbol: '^GDAXI', name: 'DAX' }, { symbol: '^STOXX50E', name: 'Euro Stoxx 50' }]
  if (/\.(PA|AS|MI|MC|BR|VI|HE|CO|ST|OL|SW|L)$/.test(symbol)) return [{ symbol: '^STOXX50E', name: 'Euro Stoxx 50' }, { symbol: '^GDAXI', name: 'DAX' }]
  const list: Array<{ symbol: string; name: string }> = []
  if (industry && /semiconductor/i.test(industry)) list.push({ symbol: 'SMH', name: 'Halbleiter (SMH)' })
  else if (sector && SECTOR_ETF[sector]) list.push({ symbol: SECTOR_ETF[sector], name: `Branche (${SECTOR_ETF[sector]})` })
  list.push({ symbol: 'QQQ', name: 'Nasdaq-100 (QQQ)' }, { symbol: 'SPY', name: 'S&P 500 (SPY)' })
  return list
}

export const kursbewegung = defineTool({
  name: 'kursbewegung',
  description:
    'Alles für die Frage, warum eine Aktie heute (oder an einem bestimmten Tag) gestiegen oder gefallen ist: Kurs und Volumen, Tagesverlauf, Vergleich mit Markt und Branche, Nachrichten mit Uhrzeit, Analystenänderungen, Quartalszahlen. Immer dieses Werkzeug statt einzelner Abfragen.',
  schema: z.object({ symbol: symbolSchema, datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  inputSchema: {
    type: 'object',
    properties: { symbol: SYMBOL_PROP, datum: { type: 'string', description: 'YYYY-MM-DD, weglassen für den letzten Handelstag' } },
    required: ['symbol'],
    additionalProperties: false,
  },
  label: i => `Kursbewegung von ${i.symbol} untersuchen`,
  async run({ symbol, datum }, ctx) {
    const today = berlinIsoDay(ctx.now)
    const profile = (await fmpList('/api/v3/profile/' + encodeURIComponent(symbol), {}, { revalidate: 86400 }))[0]
    const benchmarks = benchmarksFor(symbol, profile?.sector ?? null, profile?.industry ?? null)

    let tag = datum && datum < today ? datum : null
    let kopf: Record<string, unknown>
    let vergleich: Array<{ name: string; symbol: string; prozent: number | null }>
    const blocks: AiBlock[] = []

    if (!tag) {
      const quotes = await getQuotes([symbol, ...benchmarks.map(b => b.symbol)])
      const q = quotes.get(symbol)
      if (!q) throw new ToolError(`Kein Kurs für ${symbol} gefunden.`)
      const time = quoteTime(q)
      tag = time ? berlinIsoDay(time) : today
      kopf = quoteSummary(q)
      // Vorbörslich stehen Indizes schon auf heute, die Aktie noch auf gestern.
      // Verglichen wird nur derselbe Handelstag, sonst aus den Tageskursen.
      const day = tag
      const benchmarkMove = async (s: string): Promise<number | null> => {
        const b = quotes.get(s)
        const t = b ? quoteTime(b) : null
        if (b && t && berlinIsoDay(t) === day) return round(b.changePercent, 2)
        const bars = await getDailyHistory(s, isoDaysAgo(12, new Date(`${day}T12:00:00Z`)), day)
        const i = bars.findIndex(x => x.date === day)
        return i > 0 ? round((bars[i].close / bars[i - 1].close - 1) * 100, 2) : null
      }
      vergleich = [
        { name: q.name ?? symbol, symbol, prozent: round(q.changePercent, 2) },
        ...(await Promise.all(benchmarks.map(async b => ({ ...b, prozent: await benchmarkMove(b.symbol) })))),
      ]
      if (day !== today) kopf.achtung = `Letzter Handelstag ist ${germanDate(day)}, heute (${germanDate(today)}) gibt es noch keinen Kurs.`
      const vol = finite(q.raw?.volume)
      const avg = finite(q.raw?.avgVolume)
      if (vol && avg) kopf.volumen_vielfaches = round(vol / avg, 1)

      // Tagesverlauf (nur US-Werte in deutscher Zeit)
      if (!symbol.includes('.') && !symbol.startsWith('^')) {
        const ref = benchmarks.find(b => b.symbol === 'QQQ') ?? benchmarks[benchmarks.length - 1]
        const load = (s: string) => fmpList('/stable/historical-chart/5min', { symbol: s, from: tag!, to: tag! }, { revalidate: 120 })
        const [own, other] = await Promise.all([load(symbol), load(ref.symbol)])
        const line = (rows: any[], base: number | undefined): Array<[string, number]> =>
          base
            ? [...rows].filter(r => String(r.date).startsWith(tag!)).sort((a, b) => String(a.date).localeCompare(String(b.date)))
                .map(r => [newYorkToBerlin(r.date), (Number(r.close) / base - 1) * 100] as [string, number])
            : []
        const ownLine = line(own, q.previousClose)
        const refLine = line(other, quotes.get(ref.symbol)?.previousClose)
        if (ownLine.length > 5) {
          const id = ctx.nextBlockId()
          blocks.push({
            id, type: 'linie', titel: 'Tagesverlauf, Prozent zum Vortag (deutsche Zeit)', einheit: '%', nachkommastellen: 1, uhrzeit: true,
            serien: [{ name: symbol, punkte: ownLine }, ...(refLine.length > 5 ? [{ name: ref.name, punkte: refLine }] : [])],
          })
          kopf.grafik_tagesverlauf = id
          const open = ownLine[0]
          const high = ownLine.reduce((m, p) => (p[1] > m[1] ? p : m), open)
          const low = ownLine.reduce((m, p) => (p[1] < m[1] ? p : m), open)
          kopf.erste_kerze = { uhrzeit: open[0], prozent: round(open[1], 1) }
          kopf.hoch_im_tagesverlauf = { uhrzeit: high[0], prozent: round(high[1], 1) }
          kopf.tief_im_tagesverlauf = { uhrzeit: low[0], prozent: round(low[1], 1) }
        }
      }
    } else {
      const from = isoDaysAgo(12, new Date(`${tag}T12:00:00Z`))
      const all = await Promise.all([symbol, ...benchmarks.map(b => b.symbol)].map(s => getDailyHistory(s, from, tag!)))
      const move = (bars: DailyBar[]) => {
        const i = bars.findIndex(b => b.date === tag)
        return i > 0 ? { prozent: round((bars[i].close / bars[i - 1].close - 1) * 100, 2), bar: bars[i], prev: bars[i - 1] } : null
      }
      const own = move(all[0])
      if (!own) throw new ToolError(`Am ${germanDate(tag)} wurde ${symbol} nicht gehandelt oder es fehlen Kurse.`)
      kopf = {
        symbol, name: profile?.companyName ?? null, datum: tag, schlusskurs: round(own.bar.close, 2), vortagesschluss: round(own.prev.close, 2),
        veraenderung_prozent: own.prozent, volumen: own.bar.volume || null,
      }
      vergleich = [
        { name: profile?.companyName ?? symbol, symbol, prozent: own.prozent },
        ...benchmarks.map((b, i) => ({ ...b, prozent: move(all[i + 1])?.prozent ?? null })),
      ]
    }

    const shown = vergleich.filter((v): v is { name: string; symbol: string; prozent: number } => v.prozent != null)
    if (shown.length > 1) {
      const id = ctx.nextBlockId()
      blocks.push({
        id, type: 'balken', titel: `Vergleich am ${germanDate(tag)}`, einheit: '%', nachkommastellen: 1,
        werte: shown.map((v, i) => ({ name: v.name, wert: v.prozent, hervor: i === 0 })),
      })
      kopf.grafik_vergleich = id
      kopf.abstand_zum_markt_prozentpunkte = Object.fromEntries(
        shown.slice(1).map(v => [v.name, round(shown[0].prozent - v.prozent, 2)])
      )
    }

    const dayStart = new Date(`${tag}T00:00:00Z`).getTime()
    const [news, grades, earnings] = await Promise.all([
      loadNews({ symbol, name: String(kopf.name ?? profile?.companyName ?? ''), from: new Date(dayStart - 3 * 86_400_000), to: new Date(dayStart + 36 * 3_600_000), limit: 30 }),
      fmpList('/stable/grades', { symbol }, { revalidate: 3600 }),
      fmpList(`/api/v3/historical/earning_calendar/${encodeURIComponent(symbol)}`, { limit: 8 }, { revalidate: 3600 }),
    ])
    // Handelsschluss des Vortags (22 Uhr deutscher Zeit) als Beginn der neuen Meldungen
    const sinceClose = new Date(dayStart - 3 * 3_600_000)
    const erste = firstReports(news.all, String(kopf.name ?? profile?.companyName ?? symbol), symbol, sinceClose)
    const near = (iso: string, spread: number) => Math.abs(Date.parse(iso.slice(0, 10)) - Date.parse(tag!)) <= spread * 86_400_000

    return {
      data: {
        kursdaten: kopf,
        vergleich: shown,
        nachrichten: news.items.map(n => ({
          zeit: berlinShort(n.publishedAt), datum: berlinIsoDay(n.publishedAt), titel: n.title, quelle: n.source, inhalt: n.summary,
          ...(n.rolling ? { achtung: 'laufend aktualisierter Artikel, Uhrzeit liegt evtl. vor dem Ereignis' } : {}),
        })),
        nachrichten_gesamt: news.total,
        erste_meldungen_zum_thema: erste.map(n => ({ zeit: berlinShort(n.publishedAt), titel: n.title, quelle: n.source })),
        analysten: grades.filter(g => g?.date && near(g.date, 4)).slice(0, 8).map(g => ({
          datum: g.date, haus: g.gradingCompany, vorher: g.previousGrade, neu: g.newGrade, art: g.action,
        })),
        quartalszahlen: earnings.filter(e => e?.date && near(e.date, 3)).slice(0, 2).map(e => ({
          datum: e.date, zeit: e.time, eps: e.eps, eps_erwartet: e.epsEstimated, umsatz: e.revenue, umsatz_erwartet: e.revenueEstimated,
        })),
        hinweis: 'Ein zeitlicher Zusammenhang ist kein Beweis für die Ursache. Uhrzeiten in deutscher Zeit.',
      },
      blocks,
      sources: [
        { label: 'Kurse', stand: (kopf.stand as string) ?? germanDate(tag) },
        ...[...erste.slice(0, 3), ...news.items.slice(-4)].map(n => ({ label: n.source, url: n.url, stand: berlinShort(n.publishedAt) })),
      ],
    }
  },
})

export const marktHeute = defineTool({
  name: 'markt_heute',
  description: 'Überblick über den Markt heute: große Indizes, Zinsen, Gold, Öl, Bitcoin, Euro/Dollar, Branchen, stärkste Gewinner und Verlierer, wichtigste Nachrichten. Für Fragen wie "Was ist heute an der Börse los?" oder "Warum fällt der DAX?".',
  schema: z.object({}),
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  label: () => 'Marktlage laden',
  async run(_input, ctx) {
    const names: Record<string, string> = {
      '^GSPC': 'S&P 500', '^NDX': 'Nasdaq-100', '^DJI': 'Dow Jones', '^GDAXI': 'DAX', '^STOXX50E': 'Euro Stoxx 50', '^N225': 'Nikkei 225',
      '^VIX': 'VIX', '^TNX': 'US-Zins 10 Jahre', GCUSD: 'Gold', BZUSD: 'Öl (Brent)', BTCUSD: 'Bitcoin', EURUSD: 'Euro in US-Dollar',
    }
    const [quotes, sectors, gainers, losers, news] = await Promise.all([
      getQuotes(Object.keys(names)),
      fmpList('/api/v3/sector-performance', {}, { revalidate: 600 }),
      fmpList('/api/v3/stock_market/gainers', {}, { revalidate: 600 }),
      fmpList('/api/v3/stock_market/losers', {}, { revalidate: 600 }),
      loadNews({ from: new Date(ctx.now.getTime() - 18 * 3_600_000), to: ctx.now, limit: 20, minRelevance: 0.7 }),
    ])
    const indizes = Object.entries(names).flatMap(([s, name]) => {
      const q = quotes.get(s)
      if (!q) return []
      const t = quoteTime(q)
      const europe = /^\^(GDAXI|STOXX50E)$/.test(s)
      const hour = t ? Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(t)) : 12
      return [{
        name, stand: round(q.price, 2), veraenderung_prozent: round(q.changePercent, 2), zeit: t ? berlin(t) : null,
        ...(europe && hour < 9 ? { achtung: 'vorbörslich, der Handel beginnt erst um 9 Uhr' } : {}),
        ...(t && berlinIsoDay(t) !== berlinIsoDay(ctx.now) ? { achtung: `Stand vom ${germanDate(berlinIsoDay(t))}, nicht von heute` } : {}),
      }]
    })
    const big = (rows: any[]) =>
      rows.filter(r => Number(r.price) > 5).slice(0, 8).map(r => ({ symbol: r.symbol, name: r.name, veraenderung_prozent: round(finite(r.changesPercentage), 1) }))
    const id = ctx.nextBlockId()
    const shown = indizes.filter(i => !['VIX', 'US-Zins 10 Jahre', 'Euro in US-Dollar'].includes(i.name) && i.veraenderung_prozent != null)
    return {
      data: {
        indizes, branchen_usa: sectors.map(s => ({ branche: s.sector, veraenderung: s.changesPercentage })),
        gewinner_usa: big(gainers), verlierer_usa: big(losers),
        nachrichten: news.items.map(n => ({ zeit: berlinShort(n.publishedAt), titel: n.title, quelle: n.source, inhalt: n.summary })),
        grafik: id,
      },
      blocks: [{ id, type: 'balken', titel: 'Märkte heute', einheit: '%', nachkommastellen: 1, werte: shown.map(i => ({ name: i.name, wert: i.veraenderung_prozent! })) }],
      sources: [{ label: 'Kurse', stand: berlin(ctx.now) }, ...news.items.slice(0, 3).map(n => ({ label: n.source, url: n.url, stand: berlinShort(n.publishedAt) }))],
    }
  },
})
