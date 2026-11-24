// src/lib/ai/tools/investors.ts
// Superinvestoren (13F), Insider, Politiker.

//
// Die 13F-Historie ist rund 38 MB groß. Sie wird erst geladen, wenn die KI sie
// braucht, damit die übrigen Fragen schnell starten.

import { z } from 'zod'
import { investorNames, splitInvestorName } from '@/data/investorNames'
import type { AiBlock } from '../types'
import { isoDaysAgo, round } from '../data/fmp'
import { defineTool, germanDate, ToolError } from './base'
import { SYMBOL_PROP, symbolSchema } from './market'

const CHANGE = { new: 'neu gekauft', increased: 'aufgestockt', reduced: 'reduziert', unchanged: 'unverändert' } as const
const KIND = { new: 'neu gekauft', increased: 'aufgestockt', reduced: 'reduziert', sold: 'ganz verkauft' } as const
const NOTE_13F = '13F-Meldungen zeigen nur US-gelistete Aktien zum Quartalsende, sie kommen bis zu 45 Tage später.'

export const superinvestorenAktie = defineTool({
  name: 'superinvestoren_aktie',
  description: 'Welche der rund 90 Superinvestoren eine Aktie halten, wer zuletzt gekauft, aufgestockt, reduziert oder verkauft hat (13F-Meldungen).',
  schema: z.object({ symbol: symbolSchema }),
  inputSchema: { type: 'object', properties: { symbol: SYMBOL_PROP }, required: ['symbol'], additionalProperties: false },
  label: i => `Superinvestoren mit ${i.symbol} suchen`,
  async run({ symbol }, ctx) {
    const [{ getStockSuperinvestors }, { US_LISTING_BY_LOCAL }] = await Promise.all([
      import('@/lib/stockSuperinvestors'), import('@/lib/superinvestorMatch'),
    ])
    const us = US_LISTING_BY_LOCAL[symbol] ?? symbol
    const d = getStockSuperinvestors(us)
    const holders = [...d.holders].sort((a, b) => b.value - a.value)
    const count = (k: keyof typeof CHANGE) => holders.filter(h => h.change === k).length
    const id = ctx.nextBlockId()
    const top = holders.slice(0, 8)
    const blocks: AiBlock[] = top.length > 0 ? [{
      id, type: 'tabelle', titel: `Größte Halter von ${us} unter den Superinvestoren`, spalten: ['Investor', 'Wert', 'Anteil am Depot', 'Letztes Quartal'],
      zeilen: top.map(h => [
        h.name, `${(h.value / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 0 })} Mio. $`,
        `${(h.portfolioShare * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`,
        (h.change === 'increased' || h.change === 'reduced') && h.pctChange != null
          ? Math.abs(h.pctChange) < 0.5
            ? 'kaum verändert'
            : `${CHANGE[h.change]} (${h.pctChange > 0 ? '+' : ''}${h.pctChange.toLocaleString('de-DE', { maximumFractionDigits: 0 })} %)`
          : CHANGE[h.change],
      ]),
    }] : []
    return {
      data: {
        symbol: us, halter: holders.length, verfolgte_investoren: d.trackedInvestors, gesamtwert_mio_usd: round(d.totalValue / 1e6, 0),
        neu_gekauft: count('new'), aufgestockt: count('increased'), reduziert: count('reduced'), unveraendert: count('unchanged'), ganz_verkauft: d.soldOut.length,
        liste: holders.slice(0, 20).map(h => ({
          name: h.name, firma: h.firm, quartal: h.periodLabel, wert_mio_usd: round(h.value / 1e6, 0), anteil_am_depot_prozent: round(h.portfolioShare * 100, 2),
          veraenderung: CHANGE[h.change], veraenderung_stueck_prozent: round(h.pctChange, 1),
        })),
        ausgestiegen: d.soldOut.slice(0, 10).map(s => ({ name: s.name, vorher_wert_mio_usd: round(s.previousValue / 1e6, 0), quartal: s.periodLabel })),
        hinweis: NOTE_13F, ...(blocks[0] ? { grafik: id } : {}),
      },
      blocks,
      sources: [{ label: `13F-Meldungen ${holders[0]?.periodLabel ?? ''}`.trim(), url: `https://finclue.de/aktie/${us.toLowerCase()}` }],
    }
  },
})

const FOLD = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function findInvestor(query: string, slugs: string[]): string | null {
  const q = FOLD(query)
  if (slugs.includes(q.replace(/ /g, ''))) return q.replace(/ /g, '')
  const tokens = q.split(' ').filter(t => t.length > 2)
  let best: { slug: string; score: number } | null = null
  for (const slug of slugs) {
    const name = FOLD(investorNames[slug] ?? slug)
    const hits = tokens.filter(t => name.includes(t) || slug.includes(t)).length
    const score = tokens.length ? hits / tokens.length : 0
    if (score > 0.5 && (!best || score > best.score)) best = { slug, score }
  }
  return best?.slug ?? null
}

export const superinvestor = defineTool({
  name: 'superinvestor',
  description: 'Depot eines Superinvestors (z. B. Buffett, Burry, Ackman, Klarman) laut letzter 13F-Meldung: größte Positionen, Käufe und Verkäufe des Quartals, Depotwert.',
  schema: z.object({ name: z.string().trim().min(2).max(60) }),
  inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Name des Investors oder der Firma' } }, required: ['name'], additionalProperties: false },
  label: i => `Depot von ${i.name} laden`,
  async run({ name }, ctx) {
    const [{ default: holdingsHistory }, { buildInvestorQuarterSummary }, { getPositionTicker }] = await Promise.all([
      import('@/data/holdings'), import('@/lib/investorQuarterSummary'), import('@/lib/holdingsTicker'),
    ])
    const slug = findInvestor(name, Object.keys(holdingsHistory).filter(s => (holdingsHistory as any)[s]?.length))
    if (!slug) throw new ToolError(`Der Investor „${name}“ ist bei Finclue nicht erfasst.`)
    const snapshots = (holdingsHistory as any)[slug]
    const summary = buildInvestorQuarterSummary(slug, snapshots)
    if (!summary) throw new ToolError(`Zu „${name}“ liegt keine aktuelle Meldung vor.`)
    const latest = snapshots[snapshots.length - 1].data
    const merged = new Map<string, { name: string; ticker: string | null; value: number }>()
    for (const p of latest.positions) {
      const ticker = getPositionTicker(p)
      const key = ticker ?? p.cusip
      const e = merged.get(key) ?? { name: p.name, ticker, value: 0 }
      e.value += p.value || 0
      merged.set(key, e)
    }
    const { stocks } = await import('@/data/stocks')
    const { shortCompanyName } = await import('@/lib/displayFormat')
    const top = [...merged.values()].sort((a, b) => b.value - a.value).slice(0, 12).map(p => {
      const known = p.ticker ? stocks.find(s => s.ticker === p.ticker) : undefined
      return { ...p, name: known?.name ? shortCompanyName(known.name) : p.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) }
    })
    const person = splitInvestorName(investorNames[slug] ?? slug)
    const id = ctx.nextBlockId()
    const stale = summary.filingDate ? summary.filingDate < isoDaysAgo(150, ctx.now) : true
    return {
      data: {
        investor: person, quartal: summary.periodLabel, eingereicht: summary.filingDate, depotwert_mio_usd: round(summary.totalValue / 1e6, 0),
        positionen: summary.positionCount, anteil_der_drei_groessten_prozent: round(summary.top3Share * 100, 1),
        groesste_positionen: top.map(p => ({ name: p.name, symbol: p.ticker, wert_mio_usd: round(p.value / 1e6, 0), anteil_prozent: round((p.value / summary.totalValue) * 100, 1) })),
        zahl_der_aenderungen: { neu: summary.counts.new, aufgestockt: summary.counts.increased, reduziert: summary.counts.reduced, verkauft: summary.counts.sold },
        groesste_kaeufe: summary.topBuys.map(m => ({ name: m.name, symbol: m.ticker, art: KIND[m.kind], veraenderung_stueck_prozent: round(m.pctChange, 1), volumen_mio_usd: round(m.deltaValue / 1e6, 0) })),
        groesste_verkaeufe: summary.topSells.map(m => ({ name: m.name, symbol: m.ticker, art: KIND[m.kind], veraenderung_stueck_prozent: round(m.pctChange, 1), volumen_mio_usd: round(m.deltaValue / 1e6, 0) })),
        ...(stale ? { achtung: 'Die letzte Meldung ist älter als ein Quartal.' } : {}),
        hinweis: NOTE_13F, grafik: id,
      },
      blocks: [{
        id, type: 'balken', titel: `Größte Positionen, ${summary.periodLabel}`, einheit: '%', nachkommastellen: 1,
        werte: top.slice(0, 8).map(p => ({ name: p.ticker ?? p.name, wert: (p.value / summary.totalValue) * 100 })),
      }],
      sources: [{ label: `13F-Meldung ${summary.periodLabel}`, url: summary.filingUrl, stand: summary.filingDate ? germanDate(summary.filingDate) : null }],
    }
  },
})

export const insiderPolitiker = defineTool({
  name: 'insider_politiker',
  description: 'Käufe und Verkäufe von Vorständen und Großaktionären (Insider) sowie von US-Politikern in einer US-Aktie in den letzten zwölf Monaten.',
  schema: z.object({ symbol: symbolSchema, monate: z.number().int().min(1).max(24).optional() }),
  inputSchema: {
    type: 'object',
    properties: { symbol: SYMBOL_PROP, monate: { type: 'integer', minimum: 1, maximum: 24, description: 'Standard 12' } },
    required: ['symbol'],
    additionalProperties: false,
  },
  label: i => `Insider und Politiker zu ${i.symbol} laden`,
  async run({ symbol, monate = 12 }, ctx) {
    const since = isoDaysAgo(monate * 30, ctx.now)
    const { getCongressEvents, getInsiderEvents } = await import('@/lib/smartMoney')
    const insider = (await getInsiderEvents(symbol)).filter((e: any) => e.date >= since)
    const politics = getCongressEvents(symbol).filter((e: any) => e.date >= since)
    const sum = (list: any[], action: string) => {
      const l = list.filter(e => e.action === action)
      return { anzahl: l.length, wert_mio_usd: round(l.reduce((s, e) => s + (Number(e.valueUsd ?? e.value ?? e.amountMidUsd) || 0), 0) / 1e6, 1) }
    }
    return {
      data: {
        symbol, seit: since,
        insider: {
          kaeufe: sum(insider, 'buy'), verkaeufe: sum(insider, 'sell'),
          letzte: [...insider].sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))).slice(0, 12).map((e: any) => ({ datum: e.date, name: e.actor?.name, rolle: e.actor?.role, art: e.action === 'buy' ? 'Kauf' : 'Verkauf', stueck: e.shares ?? null, wert_usd: round(Number(e.valueUsd ?? e.value) || null, 0) })),
        },
        politiker: {
          kaeufe: sum(politics, 'buy').anzahl, verkaeufe: sum(politics, 'sell').anzahl,
          letzte: [...politics].sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))).slice(0, 10).map((e: any) => ({ datum: e.date, gemeldet: e.disclosedDate, name: e.actor?.name, partei: e.actor?.party, art: e.action === 'buy' ? 'Kauf' : 'Verkauf', betrag: String(e.amountRange ?? '').replace('–', ' bis ') })),
        },
        hinweis: 'Nur gemeldete Geschäfte. Verkäufe von Insidern folgen oft festen Plänen und sagen allein wenig aus.',
      },
      sources: [{ label: 'Insider-Meldungen (SEC) und Kongress-Meldungen' }],
    }
  },
})
