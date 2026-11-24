// src/lib/ai/tools/depot.ts
// Eigenes Depot: Überblick, Positionen, Käufe je Monat, Buchungen, realisierte
// Gewinne, Dividenden. Alle Beträge in Euro. Freitext aus Buchungsnotizen geht
// nicht an die KI, nur daraus abgeleitete Merkmale (Sparplan, Wiederanlage).

import { z } from 'zod'
import { cashFlowKind, isCashFlow, orderCosts, signedCashAmount, sumCashFlows, sumOrderCosts, type CashFlowKind } from '@/lib/portfolio/cashFlows'
import { projectDividends, type Transaction } from '@/lib/portfolio/metrics'
import type { AiBlock } from '../types'
import { round } from '../data/fmp'
import { buyAmount, depotTotals, sellAmount, type DepotData, type Position } from '../depot/access'
import type { Art } from '../depot/classify'
import { berlin, berlinIsoDay, defineTool, germanDate, ToolError } from './base'

export const depotSchema = z.string().trim().min(1).max(80).optional()
export const DEPOT_PROP = { type: 'string', description: 'Name des Depots oder "alle". Weglassen: das geöffnete Depot, sonst alle.' }
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const ISO_MONTH = /^\d{4}-\d{2}$/
const ARTEN: Art[] = ['ETF', 'Aktie', 'Fonds', 'Krypto', 'Rohstoff']
const ART_LABEL: Record<Art, string> = { ETF: 'ETFs', Aktie: 'Aktien', Fonds: 'Fonds', Krypto: 'Krypto', Rohstoff: 'Rohstoffe' }

/** Auswertungen ab 100 € ohne Cent, so wie man sie auch ausspricht */
export const eur = (v: number) => round(v, Math.abs(v) >= 100 ? 0 : 2)
/** Einzelne Buchungen auf den Cent */
const cent = (v: number) => round(v, 2)
export const pct = (v: number) => round(v, Math.abs(v) >= 1 ? 1 : 2)

export function depotSource(d: DepotData) {
  return { label: `Dein Depot (${d.label})`, stand: `Kurse von ${berlin(d.quotedAt)}` }
}

export function priceNote(d: DepotData): string[] {
  return d.missingPrices.length > 0
    ? [`Ohne aktuellen Kurs und deshalb mit 0 € gezählt: ${d.missingPrices.slice(0, 10).join(', ')}${d.missingPrices.length > 10 ? ` und ${d.missingPrices.length - 10} weitere` : ''}.`]
    : []
}

/**
 * Letzte Tagesveränderung, nach Handelstag getrennt: Vor Börsenstart in New York
 * steht bei US-Aktien noch die Bewegung von gestern, bei deutschen schon die von heute.
 */
function dayMoves(d: DepotData, today: string, total: { dayChange: number; dayChangePercent: number }) {
  const groups = new Map<string, { sum: number; before: number; count: number }>()
  for (const p of d.positions) {
    if (!p.hasPrice) continue
    const key = p.priceDay ?? 'unbekannt'
    const g = groups.get(key) ?? { sum: 0, before: 0, count: 0 }
    g.sum += p.dayChange
    g.before += p.value - p.dayChange
    g.count++
    groups.set(key, g)
  }
  const row = (g: { sum: number; before: number; count: number }) => ({ positionen: g.count, eur: eur(g.sum), prozent: g.before > 0 ? pct((g.sum / g.before) * 100) : null })
  const all = { eur: eur(total.dayChange), prozent: pct(total.dayChangePercent) }
  if (groups.size <= 1) {
    const day = [...groups.keys()][0] ?? today
    return day === today ? { heute_ganzes_depot: all } : { letzter_handelstag: day, veraenderung_ganzes_depot_an_diesem_tag: all }
  }
  const todayGroup = groups.get(today)
  return {
    ...(todayGroup ? { heute_gehandelte_positionen: row(todayGroup) } : {}),
    noch_auf_frueherem_handelstag: [...groups].filter(([day]) => day !== today).map(([day, g]) => ({ handelstag: day, ...row(g) })),
  }
}

/** Depots, deren letzte Buchung lange her ist: dort fehlt vermutlich der neueste Export */
export function staleNotes(d: DepotData, now: Date): string[] {
  const limit = berlinIsoDay(now.getTime() - 45 * 86_400_000)
  const last = new Map<string, string>()
  for (const t of d.transactions) {
    const id = t.portfolio_id ?? ''
    if (t.date > (last.get(id) ?? '')) last.set(id, t.date)
  }
  const stale = d.depots.filter(x => !x.sample && last.has(x.id) && last.get(x.id)! < limit).map(x => `${x.name} (letzte Buchung ${germanDate(last.get(x.id)!)})`)
  return stale.length > 0 ? [`Seit längerem ohne neue Buchungen, der neueste Export des Brokers fehlt vielleicht: ${stale.join(', ')}. Erwähne das, wenn die Antwort davon abhängt.`] : []
}

const share = (value: number, total: number) => (total > 0 ? pct((value / total) * 100) : null)

function positionRow(p: Position, total: number, withDepots: boolean) {
  return {
    symbol: p.symbol, name: p.name, art: p.art.art, stueck: round(p.quantity, 4), wert_eur: eur(p.value), anteil_prozent: share(p.value, total),
    einstand_je_stueck_eur: p.quantity > 0 ? round(p.cost / p.quantity, 4) : null, kurs_eur: p.hasPrice ? round(p.priceEur, 4) : null,
    kursgewinn_eur: p.hasPrice ? eur(p.gain) : null, kursgewinn_prozent: p.hasPrice && p.cost > 0 ? pct((p.gain / p.cost) * 100) : null,
    tagesveraenderung_eur: p.hasPrice ? eur(p.dayChange) : null, tagesveraenderung_prozent: p.hasPrice ? pct(p.dayChangePercent) : null, handelstag: p.priceDay,
    ...(withDepots && p.depots.length > 0 ? { depots: p.depots } : {}),
  }
}

/** Kosten aus den Buchungen: Ordergebühren, Konto und Abo, gezahlte Zinsen, Steuern auf Verkäufe */
export function costs(d: DepotData) {
  const { fees: order, taxes } = sumOrderCosts(d.transactions)
  const account = Math.max(0, -sumCashFlows(d.transactions).fees)
  const interest = d.transactions.filter(t => t.type === 'cash_withdrawal' && cashFlowKind(t) === 'interest').reduce((s, t) => s - signedCashAmount(t), 0)
  return { ordergebuehren_eur: eur(order), konto_und_abogebuehren_eur: eur(account), gezahlte_zinsen_eur: eur(interest), summe_eur: eur(order + account + interest), ...(taxes > 0 ? { zusaetzlich_steuern_auf_verkaeufe_eur: eur(taxes) } : {}) }
}

/** Aufteilung nach Art, ETFs zusätzlich nach Klasse */
function splitByArt(d: DepotData) {
  const byArt = new Map<Art, number>()
  const byClass = new Map<string, number>()
  for (const p of d.positions) {
    byArt.set(p.art.art, (byArt.get(p.art.art) ?? 0) + p.value)
    if (p.art.art === 'ETF') byClass.set(p.art.klasse ?? 'Aktien', (byClass.get(p.art.klasse ?? 'Aktien') ?? 0) + p.value)
  }
  return {
    nach_art: ARTEN.filter(a => (byArt.get(a) ?? 0) > 0).map(a => ({ art: ART_LABEL[a], wert_eur: eur(byArt.get(a)!), anteil_prozent: share(byArt.get(a)!, d.stockValue) })),
    etfs_nach_klasse: [...byClass].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([klasse, v]) => ({ klasse, wert_eur: eur(v), anteil_prozent: share(v, d.stockValue) })),
  }
}

export const depotUebersicht = defineTool({
  name: 'depot_uebersicht',
  description: 'Überblick über das eigene Depot des Nutzers: Wert, Gewinn, Gesamtrendite, heutige Veränderung, Aufteilung nach ETFs/Aktien/Krypto, größte Positionen, Liste der Depots.',
  schema: z.object({ depot: depotSchema }),
  inputSchema: { type: 'object', properties: { depot: DEPOT_PROP }, additionalProperties: false },
  label: () => 'Depot bewerten',
  async run({ depot }, ctx) {
    const d = await ctx.depot.load(depot)
    const all = await ctx.depot.list()
    if (d.positions.length === 0) throw new ToolError(`Im Depot "${d.label}" sind keine Positionen. Vorhandene Depots: ${all.map(x => x.name).join(', ')}.`)
    const t = depotTotals(d)
    const movers = d.positions.filter(p => p.hasPrice && Math.abs(p.dayChange) >= 0.01).sort((a, b) => b.dayChange - a.dayChange)
    const id = ctx.nextBlockId()
    const top = d.positions.slice(0, 10)
    const rest = d.positions.slice(10).reduce((s, p) => s + p.value, 0)
    const block: AiBlock = {
      id, type: 'balken', titel: `Größte Positionen, ${d.label}`, einheit: '%', nachkommastellen: 1,
      werte: [...top.map(p => ({ name: p.name, wert: d.stockValue > 0 ? (p.value / d.stockValue) * 100 : 0 })), ...(rest > 0 ? [{ name: `${d.positions.length - 10} weitere`, wert: (rest / d.stockValue) * 100 }] : [])],
    }
    return {
      data: {
        depot: d.label, stand: berlin(d.quotedAt),
        wertpapiere_eur: eur(d.stockValue), guthaben_eur: eur(d.cash), gesamt_eur: eur(d.stockValue + d.cash),
        ...(d.credit ? { wertpapierkredit_eur: eur(d.credit) } : {}),
        positionen: d.positions.length,
        einstand_eur: eur(d.invested), kursgewinn_eur: eur(t.gain), kursgewinn_prozent: pct(t.gainPercent),
        realisierte_gewinne_eur: eur(t.realized), dividenden_eur: eur(t.dividends), zinsen_netto_eur: eur(t.interest), kontogebuehren_eur: eur(t.accountFees), steuerausgleich_eur: eur(t.taxBookings), uebertraege_eur: eur(t.transfers), kosten: costs(d),
        gesamtrendite_eur: eur(t.totalReturn), gesamtrendite_prozent: pct(t.totalReturnPercent),
        xirr_prozent_pro_jahr: t.xirr == null ? null : pct(t.xirr),
        ...dayMoves(d, berlinIsoDay(ctx.now), t),
        groesste_gewinner_am_letzten_handelstag: movers.slice(0, 3).filter(p => p.dayChange > 0).map(p => ({ name: p.name, symbol: p.symbol, eur: eur(p.dayChange), prozent: pct(p.dayChangePercent), handelstag: p.priceDay })),
        groesste_verlierer_am_letzten_handelstag: movers.slice(-3).reverse().filter(p => p.dayChange < 0).map(p => ({ name: p.name, symbol: p.symbol, eur: eur(p.dayChange), prozent: pct(p.dayChangePercent), handelstag: p.priceDay })),
        ...splitByArt(d),
        groesste_positionen: top.slice(0, 8).map(p => positionRow(p, d.stockValue, false)),
        alle_depots: all.map(x => ({ name: x.name, ...(x.sample ? { beispieldepot: true } : {}) })),
        hinweise: [
          'Anteile beziehen sich auf die Wertpapiere ohne Guthaben. Kursgewinn = Wert minus Einstand der heutigen Positionen. Gesamtrendite = Kursgewinn + realisierte Gewinne (nach Gebühren und Steuern) + Dividenden + Zinsen + Kontogebühren + Steuerausgleich + Überträge (Wertzuwachs abgegebener Anteile bis zum Übertrag). Kaufgebühren stecken im Einstand. XIRR berücksichtigt, wann wie viel Geld floss.',
          ...(d.cash < 0 ? ['Das Guthaben ist negativ: entweder ein Wertpapierkredit oder Einzahlungen fehlen im Import. Nur erwähnen, wenn nach Guthaben, Gesamtwert oder Kosten gefragt ist, und nicht entscheiden, was zutrifft. Depotwert = Wert der Wertpapiere.'] : []),
          ...(new Set(d.positions.filter(p => p.hasPrice).map(p => p.priceDay)).size > 1 ? ['US-Aktien stehen vor 15:30 Uhr noch auf dem letzten US-Handelstag. Heute = heute_gehandelte_positionen. Die Veränderung der übrigen gilt nur für diese Positionen an jenem Tag, nie für das ganze Depot.'] : []),
          ...(all.some(x => x.sample) && d.id === 'all' && all.length > d.depots.length ? ['Das Beispieldepot zählt nicht mit.'] : []),
          ...priceNote(d), ...staleNotes(d, ctx.now),
        ],
        grafik: id,
      },
      blocks: [block],
      sources: [depotSource(d)],
    }
  },
})

const SORTS = ['wert', 'gewinn', 'verlust', 'gewinn_prozent', 'verlust_prozent', 'tagesgewinner', 'tagesverlierer'] as const

export const depotPositionen = defineTool({
  name: 'depot_positionen',
  description: 'Positionen im Depot mit Stück, Wert, Einstand, Kursgewinn und heutiger Veränderung, sortiert oder nach Art gefiltert. Mit suche Details zu einer Position (Käufe, Verkäufe, Dividenden, eigene Notiz zur Anlageidee).',
  schema: z.object({ depot: depotSchema, sortierung: z.enum(SORTS).optional(), art: z.enum(['ETF', 'Aktie', 'Fonds', 'Krypto', 'Rohstoff']).optional(), suche: z.string().trim().min(1).max(60).optional(), anzahl: z.number().int().min(1).max(60).optional() }),
  inputSchema: {
    type: 'object',
    properties: {
      depot: DEPOT_PROP, sortierung: { type: 'string', enum: [...SORTS], description: 'Standard wert' }, art: { type: 'string', enum: ['ETF', 'Aktie', 'Fonds', 'Krypto', 'Rohstoff'] },
      suche: { type: 'string', description: 'Name oder Symbol einer Position' }, anzahl: { type: 'integer', minimum: 1, maximum: 60, description: 'Standard 15' },
    },
    additionalProperties: false,
  },
  label: i => (i.suche ? `Position ${i.suche} suchen` : 'Positionen ansehen'),
  async run({ depot, sortierung = 'wert', art, suche, anzahl = 15 }, ctx) {
    const d = await ctx.depot.load(depot)
    let list = art ? d.positions.filter(p => p.art.art === art) : d.positions
    if (suche) {
      const q = suche.toLowerCase()
      list = list.filter(p => p.symbol.toLowerCase() === q || p.symbol.toLowerCase().startsWith(`${q}.`) || p.name.toLowerCase().includes(q) || p.isin?.toLowerCase() === q)
      if (list.length === 0) {
        const sold = d.transactions.some(t => t.symbol.toLowerCase() === q || (t.name ?? '').toLowerCase().includes(q))
        throw new ToolError(sold
          ? `"${suche}" ist nicht mehr im Depot "${d.label}", es gibt aber Buchungen dazu (depot_buchungen, depot_realisiert).`
          : `"${suche}" ist nicht direkt im Depot "${d.label}". Ob es über ETFs enthalten ist, zeigt depot_durchsicht.`)
      }
    }
    if (list.length === 0) throw new ToolError(`Im Depot "${d.label}" gibt es dazu keine Positionen.`)
    const ret = (p: Position) => (p.cost > 0 ? p.gain / p.cost : 0)
    const priced = list.filter(p => p.hasPrice)
    const sorted =
      sortierung === 'wert' ? [...list].sort((a, b) => b.value - a.value)
      : sortierung === 'gewinn' ? [...priced].sort((a, b) => b.gain - a.gain)
      : sortierung === 'verlust' ? [...priced].sort((a, b) => a.gain - b.gain)
      : sortierung === 'gewinn_prozent' ? [...priced].filter(p => p.cost > 0).sort((a, b) => ret(b) - ret(a))
      : sortierung === 'verlust_prozent' ? [...priced].filter(p => p.cost > 0).sort((a, b) => ret(a) - ret(b))
      : sortierung === 'tagesgewinner' ? [...priced].sort((a, b) => b.dayChange - a.dayChange)
      : [...priced].sort((a, b) => a.dayChange - b.dayChange)
    const shown = sorted.slice(0, anzahl)
    const measure = sortierung === 'wert' ? { titel: 'Anteil am Depot', einheit: '%', of: (p: Position) => (d.stockValue > 0 ? (p.value / d.stockValue) * 100 : 0) }
      : sortierung === 'gewinn_prozent' || sortierung === 'verlust_prozent' ? { titel: 'Kursgewinn in Prozent', einheit: '%', of: (p: Position) => ret(p) * 100 }
      : sortierung === 'tagesgewinner' || sortierung === 'tagesverlierer' ? { titel: 'Veränderung am letzten Handelstag', einheit: '€', of: (p: Position) => p.dayChange }
      : { titel: 'Kursgewinn', einheit: '€', of: (p: Position) => p.gain }
    const blocks: AiBlock[] = []
    if (shown.length > 2) {
      blocks.push({ id: ctx.nextBlockId(), type: 'balken', titel: `${measure.titel}, ${d.label}`, einheit: measure.einheit, nachkommastellen: measure.einheit === '%' ? 1 : 0, werte: shown.slice(0, 12).map(p => ({ name: p.name, wert: measure.of(p) })) })
    }
    const details = suche && list.length <= 3 ? list.map(p => {
      const txs = d.performanceTransactions.filter(t => d.holdings.some(h => h.symbol === t.symbol && (h.symbol === p.symbol || (p.isin && h.isin === p.isin))))
      const of = (type: Transaction['type']) => txs.filter(t => t.type === type)
      const buys = of('buy').sort((a, b) => a.date.localeCompare(b.date))
      return {
        symbol: p.symbol, erster_kauf: p.firstPurchase, kaeufe: buys.length, gekauft_eur: eur(buys.reduce((s, t) => s + buyAmount(t), 0)), letzter_kauf: buys.at(-1)?.date ?? null,
        verkaeufe: of('sell').length, realisiert_eur: eur(of('sell').reduce((s, t) => s + (d.realized.get(t.id)?.realizedGain ?? 0), 0)),
        dividenden_eur: eur(of('dividend').reduce((s, t) => s + (Number(t.total_value) || 0), 0)),
        eigene_notiz: p.investmentCase,
      }
    }) : undefined
    return {
      data: {
        depot: d.label, stand: berlin(d.quotedAt), wertpapiere_eur: eur(d.stockValue), anzahl_gefunden: list.length, sortiert_nach: sortierung,
        summe_der_auswahl_eur: eur(list.reduce((s, p) => s + p.value, 0)), anteil_der_auswahl_prozent: share(list.reduce((s, p) => s + p.value, 0), d.stockValue),
        ...(art ? { ganzes_depot_nach_art: splitByArt(d).nach_art } : {}),
        positionen: shown.map(p => positionRow(p, d.stockValue, d.id === 'all')),
        ...(details ? { details } : {}),
        hinweise: ['Anteile beziehen sich auf die Wertpapiere ohne Guthaben. Kursgewinn ohne Dividenden.', ...priceNote(d)],
        ...(blocks.length ? { grafik: blocks[0].id } : {}),
      },
      blocks,
      sources: [depotSource(d)],
    }
  },
})

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
export const monthLabel = (m: string) => `${MONTH_NAMES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`
function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + n
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}
export function monthRange(from: string, to: string): string[] {
  const list: string[] = []
  for (let m = from; m <= to && list.length < 240; m = addMonths(m, 1)) list.push(m)
  return list
}

export const depotInvestiert = defineTool({
  name: 'depot_investiert',
  description: 'Wie viel der Nutzer pro Monat in ETFs, Aktien, Fonds, Krypto und Rohstoffe investiert hat (Käufe), mit Durchschnitt je Monat, Verkäufen, Sparplan-Anteil. Für "Wie viel investiere ich im Schnitt in ETFs und in Aktien?".',
  schema: z.object({ depot: depotSchema, monate: z.number().int().min(1).max(60).optional(), von: z.string().regex(ISO_MONTH).optional(), bis: z.string().regex(ISO_MONTH).optional() }),
  inputSchema: {
    type: 'object',
    properties: {
      depot: DEPOT_PROP, monate: { type: 'integer', minimum: 1, maximum: 60, description: 'Anzahl abgeschlossener Monate, Standard 12. "die letzten Monate" = 6' },
      von: { type: 'string', description: 'YYYY-MM, statt monate' }, bis: { type: 'string', description: 'YYYY-MM' },
    },
    additionalProperties: false,
  },
  label: () => 'Käufe je Monat auswerten',
  async run({ depot, monate = 12, von, bis }, ctx) {
    const d = await ctx.depot.load(depot)
    const current = berlinIsoDay(ctx.now).slice(0, 7)
    const buysAll = d.transactions.filter(t => t.type === 'buy')
    if (buysAll.length === 0) throw new ToolError(`Im Depot "${d.label}" sind keine Käufe gebucht.`)
    const first = buysAll.reduce((m, t) => (t.date < m ? t.date : m), buysAll[0].date).slice(0, 7)
    const lastComplete = addMonths(current, -1)
    const end = bis && bis < current ? bis : lastComplete
    const wantedStart = von ?? addMonths(end, -(monate - 1))
    const start = wantedStart < first ? first : wantedStart
    const months = monthRange(start, end)
    const includeCurrent = !bis || bis >= current
    if (months.length === 0 && !includeCurrent) throw new ToolError('In diesem Zeitraum gibt es keine Monate mit Buchungen.')

    const artOf = (t: Transaction): Art => d.classes.get(t.symbol.toUpperCase())?.art ?? 'Aktie'
    const klasseOf = (t: Transaction) => d.classes.get(t.symbol.toUpperCase())?.klasse ?? 'Aktien'
    const buys = new Map<string, Map<Art, number>>()
    const sells = new Map<string, number>()
    let plan = 0
    let reinvest = 0
    const klassen = new Map<string, number>()
    const perSymbol = new Map<string, { name: string; art: Art; sum: number; count: number }>()
    const soldByArt = new Map<Art, number>()
    const inRange = new Set(months)
    for (const t of d.transactions) {
      const m = t.date.slice(0, 7)
      if (t.type === 'sell' && (inRange.has(m) || (includeCurrent && m === current))) {
        sells.set(m, (sells.get(m) ?? 0) + sellAmount(t))
        if (inRange.has(m)) soldByArt.set(artOf(t), (soldByArt.get(artOf(t)) ?? 0) + sellAmount(t))
      }
      if (t.type !== 'buy' || (!inRange.has(m) && !(includeCurrent && m === current))) continue
      const amount = buyAmount(t)
      const row = buys.get(m) ?? new Map<Art, number>()
      row.set(artOf(t), (row.get(artOf(t)) ?? 0) + amount)
      buys.set(m, row)
      if (!inRange.has(m)) continue
      if (/sparplan/i.test(t.notes ?? '')) plan += amount
      if (/wiederanlage/i.test(t.notes ?? '')) reinvest += amount
      if (artOf(t) === 'ETF') klassen.set(klasseOf(t), (klassen.get(klasseOf(t)) ?? 0) + amount)
      const entry = perSymbol.get(t.symbol) ?? { name: t.name, art: artOf(t), sum: 0, count: 0 }
      entry.sum += amount
      entry.count++
      perSymbol.set(t.symbol, entry)
    }
    const n = months.length
    const sumOf = (a: Art) => months.reduce((s, m) => s + (buys.get(m)?.get(a) ?? 0), 0)
    const arten = ARTEN.filter(a => sumOf(a) > 0 || (includeCurrent && (buys.get(current)?.get(a) ?? 0) > 0))
    const total = arten.reduce((s, a) => s + sumOf(a), 0)
    const sold = months.reduce((s, m) => s + (sells.get(m) ?? 0), 0)
    const rowFor = (m: string) => ({
      monat: m, ...Object.fromEntries(arten.map(a => [ART_LABEL[a], eur(buys.get(m)?.get(a) ?? 0)])),
      kaeufe_gesamt_eur: eur(arten.reduce((s, a) => s + (buys.get(m)?.get(a) ?? 0), 0)), verkaeufe_eur: eur(sells.get(m) ?? 0),
    })

    const blocks: AiBlock[] = []
    if (n >= 2) {
      const id = ctx.nextBlockId()
      // Viele Monate werden zu Quartalen, sonst wird die Grafik unleserlich
      const quarterly = n > 18
      const buckets = new Map<string, string[]>()
      for (const m of months) {
        const key = quarterly ? `Q${Math.ceil(Number(m.slice(5, 7)) / 3)} ${m.slice(0, 4)}` : monthLabel(m)
        buckets.set(key, [...(buckets.get(key) ?? []), m])
      }
      blocks.push({
        id, type: 'saeulen', titel: quarterly ? 'Käufe je Quartal' : 'Käufe je Monat', einheit: '€', nachkommastellen: 0,
        kategorien: [...buckets.keys()],
        serien: arten.map(a => ({ name: ART_LABEL[a], werte: [...buckets.values()].map(ms => ms.reduce((s, m) => s + (buys.get(m)?.get(a) ?? 0), 0)) })),
      })
    }
    return {
      data: {
        depot: d.label,
        zeitraum: n > 0 ? { von: months[0], bis: months[n - 1], abgeschlossene_monate: n } : null,
        durchschnitt_je_monat_eur: n > 0 ? {
          ...Object.fromEntries(arten.map(a => [ART_LABEL[a], eur(sumOf(a) / n)])), gesamt: eur(total / n),
          ...(klassen.get('Geldmarkt') ? { ETFs_ohne_Geldmarkt: eur((sumOf('ETF') - klassen.get('Geldmarkt')!) / n) } : {}),
        } : null,
        summe_eur: n > 0 ? { ...Object.fromEntries(arten.map(a => [ART_LABEL[a], eur(sumOf(a))])), gesamt: eur(total) } : null,
        anteil_prozent: total > 0 ? Object.fromEntries(arten.map(a => [ART_LABEL[a], share(sumOf(a), total)])) : null,
        monate_mit_kauf: Object.fromEntries(arten.map(a => [ART_LABEL[a], months.filter(m => (buys.get(m)?.get(a) ?? 0) > 0).length])),
        etf_kaeufe_nach_klasse_eur: Object.fromEntries([...klassen].map(([k, v]) => [k, eur(v)])),
        davon_sparplan_eur: eur(plan), davon_wiederanlage_ausschuettungen_eur: eur(reinvest),
        verkaeufe_im_zeitraum_eur: eur(sold), verkaeufe_nach_art_eur: Object.fromEntries([...soldByArt].map(([a, v]) => [ART_LABEL[a], eur(v)])), netto_eur: eur(total - sold),
        netto_je_monat_eur: n > 0 ? eur((total - sold) / n) : null,
        monate: n <= 24 ? months.map(rowFor) : undefined,
        ...(n > 24 ? { jahre: [...new Set(months.map(m => m.slice(0, 4)))].map(y => ({ jahr: y, ...Object.fromEntries(arten.map(a => [ART_LABEL[a], eur(months.filter(m => m.startsWith(y)).reduce((s, m) => s + (buys.get(m)?.get(a) ?? 0), 0))])), kaeufe_gesamt_eur: eur(months.filter(m => m.startsWith(y)).reduce((s, m) => s + arten.reduce((x, a) => x + (buys.get(m)?.get(a) ?? 0), 0), 0)) })) } : {}),
        ...(includeCurrent ? { laufender_monat_nicht_im_durchschnitt: rowFor(current) } : {}),
        groesste_kaeufe: [...perSymbol.entries()].sort((a, b) => b[1].sum - a[1].sum).slice(0, 8).map(([symbol, e]) => ({ symbol, name: e.name, art: e.art, summe_eur: eur(e.sum), kaeufe: e.count })),
        hinweise: [
          'Käufe inklusive Gebühren. Depotüberträge, Spin-offs und Einzahlungen aufs Guthaben zählen nicht. Durchschnitt über abgeschlossene Monate, der laufende Monat steht getrennt.',
          ...staleNotes(d, ctx.now),
          ...(wantedStart < first ? [`Die erste Buchung ist vom ${monthLabel(first)}, der Zeitraum beginnt deshalb dort.`] : []),
          ...(klassen.get('Geldmarkt') ? ['In den ETF-Käufen stecken Geldmarkt-ETFs, die meist zum Parken von Geld dienen. Nenne den Betrag getrennt.'] : []),
        ],
        ...(blocks.length ? { grafik: blocks[0].id } : {}),
      },
      blocks,
      sources: [{ label: `Dein Depot (${d.label})`, stand: n > 0 ? `Käufe ${monthLabel(months[0])} bis ${monthLabel(months[n - 1])}` : null }],
    }
  },
})

const TYPES = { kauf: 'buy', verkauf: 'sell', dividende: 'dividend', einzahlung: 'cash_deposit', auszahlung: 'cash_withdrawal', uebertrag_ein: 'transfer_in', uebertrag_aus: 'transfer_out' } as const
const TYPE_LABEL: Record<Transaction['type'], string> = { buy: 'Kauf', sell: 'Verkauf', dividend: 'Dividende', cash_deposit: 'Einzahlung', cash_withdrawal: 'Auszahlung', transfer_in: 'Übertrag ein', transfer_out: 'Übertrag aus' }

function tag(t: Transaction): string | null {
  const n = t.notes ?? ''
  return /sparplan/i.test(n) ? 'Sparplan' : /wiederanlage/i.test(n) ? 'Wiederanlage' : /spin-?off/i.test(n) ? 'Spin-off' : /entgelt|gebühr:|gebühr ·/i.test(n) ? 'Gebühr' : /steuerausgleich|steuererstattung ·/i.test(n) ? 'Steuer' : /^zinsen|· zinsen/i.test(n) ? 'Zinsen' : /aktiensplit/i.test(n) ? 'Split' : null
}

const KIND_LABEL: Record<Exclude<CashFlowKind, 'external'>, string> = { interest: 'Zinsen', fee: 'Kontogebühr', tax: 'Steuerbuchung', dividend_correction: 'Zurückgebuchte Dividende' }

/** Die Importe speichern Zinsen, Gebühren und Steuern als Ein- oder Auszahlung */
function bookingLabel(t: Transaction): string {
  const kind = isCashFlow(t) ? cashFlowKind(t) : 'external'
  if (kind === 'external') return TYPE_LABEL[t.type] ?? t.type
  if (kind === 'dividend_correction') return KIND_LABEL[kind]
  return `${KIND_LABEL[kind]}, ${t.type === 'cash_deposit' ? 'Gutschrift' : 'Abbuchung'}`
}

export const depotBuchungen = defineTool({
  name: 'depot_buchungen',
  description: 'Einzelne Buchungen im Depot (Käufe, Verkäufe, Dividenden, Ein- und Auszahlungen) mit Datum, Stück, Kurs und Summen. Für "Wann habe ich X gekauft?" oder "Wie viel habe ich eingezahlt?".',
  schema: z.object({ depot: depotSchema, suche: z.string().trim().min(1).max(60).optional(), typ: z.enum(Object.keys(TYPES) as [keyof typeof TYPES, ...Array<keyof typeof TYPES>]).optional(), von: z.string().regex(ISO_DAY).optional(), bis: z.string().regex(ISO_DAY).optional(), anzahl: z.number().int().min(1).max(50).optional() }),
  inputSchema: {
    type: 'object',
    properties: {
      depot: DEPOT_PROP, suche: { type: 'string', description: 'Name oder Symbol' }, typ: { type: 'string', enum: Object.keys(TYPES) },
      von: { type: 'string', description: 'YYYY-MM-DD' }, bis: { type: 'string', description: 'YYYY-MM-DD' }, anzahl: { type: 'integer', minimum: 1, maximum: 50, description: 'so viele der neuesten Buchungen, Standard 20' },
    },
    additionalProperties: false,
  },
  label: i => (i.suche ? `Buchungen zu ${i.suche} lesen` : 'Buchungen lesen'),
  async run({ depot, suche, typ, von, bis, anzahl = 20 }, ctx) {
    const d = await ctx.depot.load(depot)
    const q = suche?.toLowerCase()
    const list = d.transactions.filter(t =>
      (!typ || t.type === TYPES[typ]) && (!von || t.date >= von) && (!bis || t.date <= bis) &&
      (!q || t.symbol.toLowerCase() === q || t.symbol.toLowerCase().startsWith(`${q}.`) || (t.name ?? '').toLowerCase().includes(q)))
    if (list.length === 0) throw new ToolError('Dazu gibt es keine Buchungen.')
    const names = new Map(d.depots.map(x => [x.id, x.name]))
    const sums: Record<string, { anzahl: number; summe_eur: number }> = {}
    for (const t of list) {
      const key = bookingLabel(t)
      const amount = t.type === 'buy' ? buyAmount(t) : t.type === 'sell' ? sellAmount(t) : Number(t.total_value) || 0
      const s = (sums[key] ??= { anzahl: 0, summe_eur: 0 })
      s.anzahl++
      s.summe_eur += amount
    }
    for (const s of Object.values(sums)) s.summe_eur = eur(s.summe_eur) ?? 0
    const order = sumOrderCosts(list)
    const flows = sumCashFlows(d.transactions.filter(t => (!von || t.date >= von) && (!bis || t.date <= bis)))
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date))
    return {
      data: {
        depot: d.label, anzahl_gesamt: list.length, von: sorted.at(-1)!.date, bis: sorted[0].date, summen: sums,
        ...(!suche && (!typ || typ === 'einzahlung' || typ === 'auszahlung') && flows.deposits + flows.withdrawals > 0 ? { vom_und_zum_bankkonto: { eingezahlt_eur: eur(flows.deposits), ausgezahlt_eur: eur(flows.withdrawals), netto_eingezahlt_eur: eur(flows.deposits - flows.withdrawals), ohne: 'Zinsen, Kontogebühren, Steuerbuchungen, Depotüberträge' } } : {}),
        ...(suche || typ || von || bis ? { gebuehren_dieser_kaeufe_und_verkaeufe_eur: eur(order.fees), ...(order.taxes > 0 ? { steuern_auf_diese_verkaeufe_eur: eur(order.taxes) } : {}) } : { kosten_gesamt: costs(d) }),
        buchungen: sorted.slice(0, anzahl).map(t => ({
          datum: t.date, typ: bookingLabel(t), ...(t.symbol && t.symbol !== 'CASH' ? { symbol: t.symbol, name: t.name, stueck: round(Number(t.quantity), 4) } : {}),
          betrag_eur: cent(t.type === 'buy' ? buyAmount(t) : t.type === 'sell' ? sellAmount(t) : Number(t.total_value) || 0),
          ...(t.type === 'buy' || t.type === 'sell' ? { kurs_eur: round(Number(t.price), 4) } : {}),
          ...((t.type === 'buy' || t.type === 'sell') && orderCosts(t).fee > 0 ? { gebuehr_eur: cent(orderCosts(t).fee) } : {}), ...(orderCosts(t).tax > 0 ? { steuer_eur: cent(orderCosts(t).tax) } : {}),
          ...(t.type === 'sell' && d.realized.has(t.id) ? { gewinn_eur: cent(d.realized.get(t.id)!.realizedGain), gewinn_prozent: pct(d.realized.get(t.id)!.realizedGainPercent) } : {}),
          ...(tag(t) ? { art: tag(t) } : {}), ...(d.id === 'all' && names.size > 1 ? { depot: names.get(t.portfolio_id ?? '') } : {}),
        })),
        hinweise: ['Käufe inklusive Gebühren, Verkäufe nach Gebühren und abgezogenen Steuern. Dividenden so, wie der Broker sie gutgeschrieben hat. Einzelne Buchungen stecken schon in den Summen und kommen nicht dazu.', ...(list.length > anzahl ? [`Gezeigt werden die ${anzahl} neuesten von ${list.length}, die Summen gelten für alle.`] : [])],
      },
      sources: [{ label: `Dein Depot (${d.label})`, stand: `${list.length} Buchungen` }],
    }
  },
})

export const depotRealisiert = defineTool({
  name: 'depot_realisiert',
  description: 'Realisierte Gewinne und Verluste aus Verkäufen, je Jahr und je Wertpapier.',
  schema: z.object({ depot: depotSchema, jahr: z.number().int().min(2000).max(2100).optional() }),
  inputSchema: { type: 'object', properties: { depot: DEPOT_PROP, jahr: { type: 'integer', description: 'nur dieses Jahr' } }, additionalProperties: false },
  label: () => 'Verkäufe auswerten',
  async run({ depot, jahr }, ctx) {
    const d = await ctx.depot.load(depot)
    const sales = d.performanceTransactions.filter(t => t.type === 'sell' && d.realized.has(t.id)).map(t => ({ t, gain: d.realized.get(t.id)!.realizedGain, pct: d.realized.get(t.id)!.realizedGainPercent }))
    if (sales.length === 0) throw new ToolError(`Im Depot "${d.label}" gibt es keine Verkäufe mit bekanntem Einstand.`)
    const years = [...new Set(sales.map(s => s.t.date.slice(0, 4)))].sort()
    const chosen = jahr ? sales.filter(s => s.t.date.startsWith(String(jahr))) : sales
    if (chosen.length === 0) throw new ToolError(`Im Jahr ${jahr} gab es keine Verkäufe. Jahre mit Verkäufen: ${years.join(', ')}.`)
    const bySymbol = new Map<string, { name: string; gain: number; proceeds: number; count: number; last: string }>()
    for (const s of chosen) {
      const e = bySymbol.get(s.t.symbol) ?? { name: s.t.name, gain: 0, proceeds: 0, count: 0, last: s.t.date }
      e.gain += s.gain
      e.proceeds += sellAmount(s.t)
      e.count++
      if (s.t.date > e.last) e.last = s.t.date
      bySymbol.set(s.t.symbol, e)
    }
    const ranked = [...bySymbol.entries()].sort((a, b) => b[1].gain - a[1].gain)
    const costsOfSales = sumOrderCosts(chosen.map(s => s.t))
    const row = ([symbol, e]: (typeof ranked)[number]) => ({ symbol, name: e.name, gewinn_eur: eur(e.gain), erloes_eur: eur(e.proceeds), verkaeufe: e.count, letzter_verkauf: e.last })
    const blocks: AiBlock[] = []
    if (!jahr && years.length > 1) {
      blocks.push({ id: ctx.nextBlockId(), type: 'saeulen', titel: 'Realisierte Gewinne je Jahr', einheit: '€', nachkommastellen: 0, kategorien: years, serien: [{ name: 'Gewinn', werte: years.map(y => sales.filter(s => s.t.date.startsWith(y)).reduce((x, s) => x + s.gain, 0)) }] })
    }
    return {
      data: {
        depot: d.label, zeitraum: jahr ?? `${years[0]} bis ${years.at(-1)}`,
        ergebnis_eur: eur(chosen.reduce((s, x) => s + x.gain, 0)), davon_gewinne_eur: eur(chosen.filter(x => x.gain > 0).reduce((s, x) => s + x.gain, 0)), davon_verluste_eur: eur(chosen.filter(x => x.gain < 0).reduce((s, x) => s + x.gain, 0)),
        verkaeufe: chosen.length, erloes_eur: eur(chosen.reduce((s, x) => s + sellAmount(x.t), 0)),
        je_jahr: years.map(y => ({ jahr: y, ergebnis_eur: eur(sales.filter(s => s.t.date.startsWith(y)).reduce((x, s) => x + s.gain, 0)), verkaeufe: sales.filter(s => s.t.date.startsWith(y)).length })),
        beste: ranked.filter(r => r[1].gain > 0).slice(0, 6).map(row), schlechteste: ranked.filter(r => r[1].gain < 0).slice(-6).reverse().map(row),
        schon_abgezogen: { verkaufsgebuehren_eur: eur(costsOfSales.fees), steuern_eur: eur(costsOfSales.taxes) },
        hinweise: [`Durchschnittskostenmethode, nach Gebühren${costsOfSales.taxes > 0 ? ' und nach den Steuern, die der Broker beim Verkauf abgezogen hat' : '. Steuern sind in den Buchungen nicht ausgewiesen'}. Das Finanzamt rechnet nach FIFO, die Steuerbescheinigung des Brokers kann abweichen.`],
        ...(blocks.length ? { grafik: blocks[0].id } : {}),
      },
      blocks,
      sources: [{ label: `Dein Depot (${d.label})`, stand: `${chosen.length} Verkäufe` }],
    }
  },
})

export const depotDividenden = defineTool({
  name: 'depot_dividenden',
  description: 'Erhaltene Dividenden und Ausschüttungen im Depot: je Jahr, letzte 12 Monate, je Zahler, dazu eine Hochrechnung für die nächsten 12 Monate.',
  schema: z.object({ depot: depotSchema, jahr: z.number().int().min(2000).max(2100).optional() }),
  inputSchema: { type: 'object', properties: { depot: DEPOT_PROP, jahr: { type: 'integer', description: 'Zahler und Monate nur für dieses Jahr' } }, additionalProperties: false },
  label: () => 'Dividenden zusammenzählen',
  async run({ depot, jahr }, ctx) {
    const d = await ctx.depot.load(depot)
    // Zurückgebuchte Dividenden zählen als negative Zahlung, wie auf der Depotseite
    const txs = d.transactions
      .filter(t => t.type === 'dividend' || (isCashFlow(t) && cashFlowKind(t) === 'dividend_correction'))
      .map(t => (t.type === 'dividend' ? t : { ...t, type: 'dividend' as const, total_value: signedCashAmount(t) }))
    const payments = txs.filter(t => Number(t.total_value) >= 0)
    if (payments.length === 0) throw new ToolError(`Im Depot "${d.label}" sind keine Dividenden gebucht.`)
    const amount = (t: Transaction) => Number(t.total_value) || 0
    const today = berlinIsoDay(ctx.now)
    const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`
    const twoYearsAgo = `${Number(today.slice(0, 4)) - 2}${today.slice(4)}`
    const years = [...new Set(txs.map(t => t.date.slice(0, 4)))].sort()
    const perYear = years.map(y => ({ jahr: y, summe_eur: eur(txs.filter(t => t.date.startsWith(y)).reduce((s, t) => s + amount(t), 0)), ...(y === today.slice(0, 4) ? { bisher: true } : {}) }))
    const chosen = jahr ? txs.filter(t => t.date.startsWith(String(jahr))) : txs.filter(t => t.date > yearAgo)
    const payers = new Map<string, { name: string; sum: number; count: number }>()
    for (const t of chosen) {
      const e = payers.get(t.symbol) ?? { name: t.name, sum: 0, count: 0 }
      e.sum += amount(t)
      if (amount(t) >= 0) e.count++
      payers.set(t.symbol, e)
    }
    const ranked = [...payers.entries()].sort((a, b) => b[1].sum - a[1].sum)
    const forward = projectDividends(txs, d.holdings, ctx.now, d.transactions)
    const last12 = txs.filter(t => t.date > yearAgo).reduce((s, t) => s + amount(t), 0)
    const prev12 = txs.filter(t => t.date > twoYearsAgo && t.date <= yearAgo).reduce((s, t) => s + amount(t), 0)
    const months = jahr ? monthRange(`${jahr}-01`, jahr === Number(today.slice(0, 4)) ? today.slice(0, 7) : `${jahr}-12`) : monthRange(addMonths(today.slice(0, 7), -11), today.slice(0, 7))
    const blocks: AiBlock[] = []
    if (!jahr && years.length > 2) {
      blocks.push({ id: ctx.nextBlockId(), type: 'saeulen', titel: 'Dividenden je Jahr', einheit: '€', nachkommastellen: 0, kategorien: years, serien: [{ name: 'Dividenden', werte: perYear.map(y => y.summe_eur) }] })
    } else if (chosen.length > 0) {
      blocks.push({ id: ctx.nextBlockId(), type: 'saeulen', titel: jahr ? `Dividenden ${jahr}` : 'Dividenden der letzten 12 Monate', einheit: '€', nachkommastellen: 0, kategorien: months.map(monthLabel), serien: [{ name: 'Dividenden', werte: months.map(m => txs.filter(t => t.date.startsWith(m)).reduce((s, t) => s + amount(t), 0)) }] })
    }
    return {
      data: {
        depot: d.label, gesamt_eur: eur(txs.reduce((s, t) => s + amount(t), 0)), erste_zahlung: payments.reduce((m, t) => (t.date < m ? t.date : m), payments[0].date), zahlungen: payments.length,
        ...(payments.length < txs.length ? { davon_zurueckgebucht_eur: eur(txs.filter(t => Number(t.total_value) < 0).reduce((s, t) => s + amount(t), 0)) } : {}),
        je_jahr: perYear, letzte_12_monate_eur: eur(last12), zwoelf_monate_davor_eur: eur(prev12), veraenderung_prozent: prev12 > 0 ? pct((last12 / prev12 - 1) * 100) : null,
        durchschnitt_je_monat_letzte_12_eur: eur(last12 / 12),
        zeitraum_der_zahler: jahr ?? 'letzte 12 Monate', summe_zeitraum_eur: eur(chosen.reduce((s, t) => s + amount(t), 0)),
        groesste_zahler: ranked.slice(0, 10).map(([symbol, e]) => ({ symbol, name: e.name, summe_eur: eur(e.sum), zahlungen: e.count, anteil_prozent: share(e.sum, chosen.reduce((s, t) => s + amount(t), 0)) })),
        monate: months.map(m => ({ monat: m, summe_eur: eur(txs.filter(t => t.date.startsWith(m)).reduce((s, t) => s + amount(t), 0)) })),
        hochrechnung_naechste_12_monate_eur: forward.annualExpected > 0 ? eur(forward.annualExpected) : null,
        hochrechnung_je_monat_eur: forward.annualExpected > 0 ? eur(forward.annualExpected / 12) : null,
        hochrechnung_groesste_zahler: forward.perHolding.slice(0, 6).map(p => ({ symbol: p.symbol, erwartet_eur: eur(p.annual), rendite_auf_einstand_prozent: pct(p.yieldOnCost), rendite_auf_kurs_prozent: pct(p.currentYield) })),
        hinweise: [
          'Beträge so, wie der Broker sie gutgeschrieben hat, bei den meisten Importen also nach Steuern.',
          'Die Hochrechnung schreibt die Zahlungen der letzten 12 Monate auf die heutige Stückzahl fort. Neue Positionen ohne bisherige Zahlung fehlen darin.',
          ...staleNotes(d, ctx.now),
        ],
        ...(blocks.length ? { grafik: blocks[0].id } : {}),
      },
      blocks,
      sources: [{ label: `Dein Depot (${d.label})`, stand: `${payments.length} Zahlungen seit ${germanDate(payments.reduce((m, t) => (t.date < m ? t.date : m), payments[0].date))}` }],
    }
  },
})
