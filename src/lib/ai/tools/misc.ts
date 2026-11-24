// src/lib/ai/tools/misc.ts
// Nachrichten, ETFs, Termine, Rechner.

import { z } from 'zod'
import { getQuotes } from '@/lib/marketData/quoteService'
import { getInstrumentsForSymbols } from '@/lib/marketData/instrumentStore'
import { getETFBySymbol } from '@/lib/etfUtils'
import { getEarningsFromDb } from '@/lib/earningsCalendarDb'
import type { AiBlock } from '../types'
import { etfCost } from '../data/etfCost'
import { fmpList, finite, round } from '../data/fmp'
import { loadNews } from '../data/news'
import { evaluateExpression } from '../calc'
import { berlin, berlinIsoDay, berlinShort, defineTool, germanDate, ToolError } from './base'
import { SYMBOL_PROP, symbolSchema } from './market'

export const nachrichten = defineTool({
  name: 'nachrichten',
  description: 'Nachrichten zu einer Aktie oder einem Suchwort der letzten Tage (bis 60). Für "Was gibt es Neues zu X?". Bei Fragen nach dem Grund einer Kursbewegung stattdessen kursbewegung.',
  schema: z.object({ symbol: symbolSchema.optional(), suchwort: z.string().trim().min(3).max(60).optional(), tage: z.number().int().min(1).max(60).optional() })
    .refine(v => v.symbol || v.suchwort, 'symbol oder suchwort angeben'),
  inputSchema: {
    type: 'object',
    properties: { symbol: SYMBOL_PROP, suchwort: { type: 'string', description: 'Wort im Titel, z. B. "Zinsentscheid"' }, tage: { type: 'integer', minimum: 1, maximum: 60, description: 'Standard 7' } },
    additionalProperties: false,
  },
  label: i => `Nachrichten zu ${i.symbol ?? i.suchwort} lesen`,
  async run({ symbol, suchwort, tage = 7 }, ctx) {
    const { items, total } = await loadNews({ symbol, search: suchwort, from: new Date(ctx.now.getTime() - tage * 86_400_000), to: ctx.now, limit: 22 })
    if (items.length === 0) throw new ToolError(`Keine Nachrichten zu ${symbol ?? suchwort} in den letzten ${tage} Tagen.`)
    return {
      data: { anzahl_gefunden: total, nachrichten: items.map(n => ({ datum: berlinIsoDay(n.publishedAt), zeit: berlinShort(n.publishedAt), titel: n.title, quelle: n.source, inhalt: n.summary })) },
      sources: items.slice(-5).reverse().map(n => ({ label: n.source, url: n.url, stand: berlinShort(n.publishedAt) })),
    }
  },
})

export const etf = defineTool({
  name: 'etf',
  description: 'Was in einem ETF steckt: Kosten (TER), größte Aktien, Regionen, Branchen. Auch für "Wie viel Nvidia steckt im MSCI World?".',
  schema: z.object({ symbol: symbolSchema, aktie: symbolSchema.optional() }),
  inputSchema: {
    type: 'object',
    properties: { symbol: { ...SYMBOL_PROP, description: 'ETF-Symbol wie EUNL.DE, VWCE.DE, SPY' }, aktie: { type: 'string', description: 'optional: Symbol einer Aktie, deren Anteil gesucht ist' } },
    required: ['symbol'],
    additionalProperties: false,
  },
  label: i => `ETF ${i.symbol} zerlegen`,
  async run({ symbol, aktie }, ctx) {
    const { computeLookthrough } = await import('@/lib/portfolio/lookthrough')
    const [instruments, quotes] = await Promise.all([getInstrumentsForSymbols([symbol]), getQuotes([symbol])])
    const instrument = instruments.get(symbol) ?? null
    const known = getETFBySymbol(symbol)
    const name = known?.name ?? instrument?.name ?? quotes.get(symbol)?.name ?? symbol
    const isin = instrument?.isin ?? known?.isin ?? null
    const [look, ter] = await Promise.all([computeLookthrough([{ symbol, name, isin, value: 100 }]), etfCost(symbol, isin)])
    const coverage = look.etfCoverage[0]
    if (!coverage || look.topExposures.length === 0) throw new ToolError(`Zu ${symbol} ist keine Zusammensetzung verfügbar.`)
    const share = aktie ? look.topExposures.find(e => e.symbol === aktie) : null
    const id = ctx.nextBlockId()
    const blocks: AiBlock[] = [{
      id, type: 'balken', titel: `Größte Aktien in ${name}`, einheit: '%', nachkommastellen: 1,
      werte: look.topExposures.slice(0, 10).map(e => ({ name: e.name, wert: e.percent, hervor: aktie ? e.symbol === aktie : false })),
    }]
    return {
      data: {
        symbol, name, isin: instrument?.isin ?? known?.isin ?? null, kosten_ter_prozent: ter,
        zerlegung: coverage.status === 'exact' ? 'genau' : coverage.status === 'approximated' ? `angenähert über ${coverage.proxyLabel}` : coverage.status,
        // Die Anmerkung beschreibt den Ersatzfonds, nicht diesen ETF
        anmerkung_zum_ersatzfonds_nicht_zu_diesem_etf: coverage.note ?? null,
        abgedeckt_prozent: round(look.coveragePercent, 1),
        groesste_aktien: look.topExposures.slice(0, 15).map(e => ({ symbol: e.symbol, name: e.name, anteil_prozent: round(e.percent, 2) })),
        regionen: look.regions.slice(0, 8).map(r => ({ name: r.label, anteil_prozent: round(r.percent, 1) })),
        branchen: look.sectors.slice(0, 11).map(s => ({ name: s.label, anteil_prozent: round(s.percent, 1) })),
        ...(aktie ? { gesuchte_aktie: share ? { symbol: aktie, name: share.name, anteil_prozent: round(share.percent, 2) } : { symbol: aktie, ergebnis: 'nicht unter den 30 größten Positionen' } } : {}),
        grafik: id,
      },
      blocks,
      sources: [{ label: `Zusammensetzung ${name}`, stand: coverage.status === 'approximated' ? `angenähert über ${coverage.proxyLabel}` : null }],
    }
  },
})

const IMPACT: Record<string, number> = { High: 3, Medium: 2, Low: 1 }

export const termine = defineTool({
  name: 'termine',
  description: 'Kommende oder vergangene Termine: Quartalszahlen (auch für bestimmte Aktien) oder wichtige Wirtschaftsdaten und Notenbanktermine.',
  schema: z.object({
    art: z.enum(['quartalszahlen', 'wirtschaft']), von: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    symbole: z.array(symbolSchema).max(20).optional(),
  }),
  inputSchema: {
    type: 'object',
    properties: {
      art: { type: 'string', enum: ['quartalszahlen', 'wirtschaft'] }, von: { type: 'string', description: 'YYYY-MM-DD' }, bis: { type: 'string', description: 'YYYY-MM-DD, höchstens 31 Tage nach von' },
      symbole: { type: 'array', items: SYMBOL_PROP, maxItems: 20 },
    },
    required: ['art', 'von', 'bis'],
    additionalProperties: false,
  },
  label: i => (i.art === 'wirtschaft' ? 'Wirtschaftskalender laden' : 'Termine für Quartalszahlen laden'),
  async run({ art, von, bis, symbole }) {
    if (Date.parse(bis) < Date.parse(von) || Date.parse(bis) - Date.parse(von) > 31 * 86_400_000) throw new ToolError('Der Zeitraum darf höchstens 31 Tage lang sein.')
    if (art === 'quartalszahlen') {
      const rows = await getEarningsFromDb(von, bis, symbole)
      let list = rows
      if (!symbole?.length) {
        // ohne Auswahl nur die größten Firmen mit US- oder deutscher Notierung
        // (andere Börsen melden den Umsatz in Landeswährung, das verzerrt die Reihenfolge)
        list = rows.filter(r => /^[A-Z-]+$/.test(r.symbol) || r.symbol.endsWith('.DE'))
          .sort((a, b) => (b.revenueEstimate ?? 0) - (a.revenueEstimate ?? 0)).slice(0, 40)
      }
      if (list.length === 0) throw new ToolError('Keine Termine im Zeitraum gefunden.')
      return {
        data: {
          gesamt: rows.length,
          termine: list.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 40).map(r => ({
            datum: r.date, symbol: r.symbol, firma: r.companyName, zeit: r.time === 'amc' ? 'nach Börsenschluss' : r.time === 'bmo' ? 'vor Börsenstart' : null,
            gewinn_je_aktie_erwartet: round(r.epsEstimate, 2), umsatz_erwartet_mio: r.revenueEstimate ? round(r.revenueEstimate / 1e6, 0) : null,
          })),
        },
        sources: [{ label: 'Finclue Earnings-Kalender' }],
      }
    }
    const rows = await fmpList('/api/v3/economic_calendar', { from: von, to: bis }, { revalidate: 1800 })
    const list = rows.filter(r => ['US', 'EU', 'DE', 'CN', 'GB', 'JP'].includes(r.country) && (IMPACT[r.impact] ?? 0) >= 2)
      .sort((a, b) => (IMPACT[b.impact] ?? 0) - (IMPACT[a.impact] ?? 0) || String(a.date).localeCompare(String(b.date))).slice(0, 40)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    if (list.length === 0) throw new ToolError('Keine wichtigen Termine im Zeitraum gefunden.')
    return {
      data: {
        termine: list.map(r => ({
          zeit: berlin(`${String(r.date).replace(' ', 'T')}Z`), land: r.country, termin: r.event, bedeutung: r.impact === 'High' ? 'hoch' : 'mittel',
          ist: finite(r.actual), erwartet: finite(r.estimate), vorher: finite(r.previous), einheit: r.unit ?? null,
        })),
      },
      sources: [{ label: 'Wirtschaftskalender (FMP)' }],
    }
  },
})

export const rechne = defineTool({
  name: 'rechne',
  description:
    'Rechner. Jede eigene Rechnung (Summe, Differenz, Anteil, Durchschnitt, Verhältnis, Umrechnung) damit machen, nie im Kopf. Beispiele: "(164.5/125.53-1)*100", "avg(12.1,14.3,9.8)". Dezimalpunkt verwenden.',
  schema: z.object({ rechnungen: z.array(z.object({ bezeichnung: z.string().max(80), ausdruck: z.string().min(1).max(300) })).min(1).max(12) }),
  inputSchema: {
    type: 'object',
    properties: {
      rechnungen: {
        type: 'array', minItems: 1, maxItems: 12,
        items: {
          type: 'object',
          properties: { bezeichnung: { type: 'string' }, ausdruck: { type: 'string', description: '+ - * / ^ ( ) und avg, sum, min, max, median, abs, sqrt, round' } },
          required: ['bezeichnung', 'ausdruck'],
          additionalProperties: false,
        },
      },
    },
    required: ['rechnungen'],
    additionalProperties: false,
  },
  label: () => 'Nachrechnen',
  async run({ rechnungen }) {
    return {
      data: {
        ergebnisse: rechnungen.map(r => {
          try {
            return { bezeichnung: r.bezeichnung, ausdruck: r.ausdruck, ergebnis: round(evaluateExpression(r.ausdruck), 4) }
          } catch (error) {
            return { bezeichnung: r.bezeichnung, ausdruck: r.ausdruck, fehler: error instanceof Error ? error.message : 'nicht berechenbar' }
          }
        }),
      },
    }
  },
})
