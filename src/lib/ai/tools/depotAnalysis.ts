// src/lib/ai/tools/depotAnalysis.ts
// Eigenes Depot: Rendite gegen den Markt, Risiko, Durchsicht durch ETFs,
// Themen-Anteil, Termine, Superinvestoren mit denselben Aktien.

import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { loadEarningsForSymbols } from '@/lib/earningsRadar'
import { detectTickerCurrency } from '@/lib/fmp'
import { getExchangeRate } from '@/lib/exchangeRates'
import { getInstrumentsForSymbols } from '@/lib/marketData/instrumentStore'
import type { EffectiveExposure, LookthroughResult } from '@/lib/portfolio/lookthrough'
import type { AiBlock } from '../types'
import { fmp, isoDaysAgo, round } from '../data/fmp'
import { thinOut } from '../data/valuation'
import type { DepotData } from '../depot/access'
import { companySymbol, loadTheme, MAGNIFICENT_7, THEMES, THEME_IDS, type Theme, type ThemeId } from '../depot/themes'
import { berlinIsoDay, defineTool, germanDate, ToolError, type ToolContext } from './base'
import { DEPOT_PROP, depotSchema, depotSource, eur, pct, priceNote, staleNotes } from './depot'
import { symbolSchema } from './market'

// ── Rendite und Risiko ──────────────────────────────────────────────────────

const PERIODS = ['1M', '3M', '6M', 'YTD', '1J', '3J', '5J', 'max'] as const
type Period = (typeof PERIODS)[number]
const PERIOD_LABEL: Record<Period, string> = { '1M': 'letzter Monat', '3M': 'letzte 3 Monate', '6M': 'letzte 6 Monate', YTD: 'seit Jahresanfang', '1J': 'letztes Jahr', '3J': 'letzte 3 Jahre', '5J': 'letzte 5 Jahre', max: 'seit Beginn' }

function periodDays(period: Period, now: Date): number {
  if (period === 'YTD') {
    const today = berlinIsoDay(now)
    return Math.max(7, Math.round((Date.parse(today) - Date.parse(`${today.slice(0, 4)}-01-01`)) / 86_400_000) + 1)
  }
  return { '1M': 30, '3M': 91, '6M': 182, '1J': 365, '3J': 1096, '5J': 1826, max: 5475 }[period]
}

interface HistoryPoint { date: string; value: number; invested: number; contributed: number }
interface PerformancePoint { date: string; portfolioPerformance: number; spyPerformance: number; msciWorldPerformance: number; ftseAllWorldPerformance: number }

const historyMemo = new WeakMap<DepotData, Map<string, Promise<any>>>()

/** Wertentwicklung wie auf der Depotseite, je Frage nur einmal gerechnet */
async function history(d: DepotData, ctx: ToolContext, days: number, quant = false): Promise<any> {
  const memo = historyMemo.get(d) ?? new Map<string, Promise<any>>()
  historyMemo.set(d, memo)
  const key = `${days}|${quant}`
  let pending = memo.get(key)
  if (!pending) {
    pending = (async () => {
      const { computePortfolioHistory } = await import('@/lib/portfolio/history')
      const result = await computePortfolioHistory(ctx.depot.owner, {
        portfolioIds: d.depots.map(x => x.id),
        holdings: d.holdings.map(h => ({ portfolio_id: h.portfolio_id, symbol: h.symbol, quantity: h.quantity, purchase_date: h.purchase_date, purchase_price: h.purchase_price })),
        cashPosition: d.cash, days, quant,
      })
      if (result.status !== 200) throw new Error('Wertentwicklung nicht berechenbar')
      return result.body
    })()
    memo.set(key, pending)
  }
  return pending
}

/** Negatives Guthaben ab 1 % der Wertpapiere, also ein Kredit oder fehlende Einzahlungen */
function borrowed(d: DepotData): number {
  return d.cash < 0 && -d.cash >= d.stockValue * 0.01 ? -d.cash : 0
}

export const depotRendite = defineTool({
  name: 'depot_rendite',
  description: 'Rendite des Depots in einem Zeitraum: zeitgewichtet (TWR) gegen FTSE All-World, MSCI World und S&P 500, Gewinn in Euro, Depotwert am Anfang und Ende, Anteil durch Einzahlungen. Auch für "Schlagen meine Einzelaktien meine ETFs?": zeigt, was beide Gruppen gegen den All-World gebracht haben.',
  schema: z.object({ depot: depotSchema, zeitraum: z.enum(PERIODS) }),
  inputSchema: { type: 'object', properties: { depot: DEPOT_PROP, zeitraum: { type: 'string', enum: [...PERIODS], description: 'YTD = seit Jahresanfang, max = seit Beginn' } }, required: ['zeitraum'], additionalProperties: false },
  label: i => `Rendite berechnen (${PERIOD_LABEL[i.zeitraum]})`,
  async run({ depot, zeitraum }, ctx) {
    const d = await ctx.depot.load(depot)
    if (d.positions.length === 0) throw new ToolError(`Im Depot "${d.label}" sind keine Positionen.`)
    const h = await history(d, ctx, periodDays(zeitraum, ctx.now))
    const points = (h.data ?? []) as HistoryPoint[]
    const perf = (h.performanceData ?? []) as PerformancePoint[]
    const cmp = h.benchmarkComparison
    if (points.length < 2) throw new ToolError('Für diesen Zeitraum gibt es zu wenige Kurse im Depot.')
    const first = points[0]
    const last = points[points.length - 1]
    const contributed = last.contributed - first.contributed
    const gain = last.value - first.value - contributed
    const blocks: AiBlock[] = []
    if (perf.length > 2) {
      const series = (name: string, key: keyof PerformancePoint) => ({ name, punkte: thinOut(perf.map(p => [p.date, p[key] as number] as [string, number])) })
      blocks.push({
        id: ctx.nextBlockId(), type: 'linie', titel: `Rendite ${PERIOD_LABEL[zeitraum]}`, einheit: '%', nachkommastellen: 1, ohneNull: true,
        serien: [series('Dein Depot', 'portfolioPerformance'), series('FTSE All-World', 'ftseAllWorldPerformance'), series('S&P 500', 'spyPerformance')],
      })
    }
    const num = (v: number | null | undefined) => (v == null ? null : pct(v))
    const leveraged = borrowed(d) > 0
    // Firmennamen statt nur Kürzel
    for (const side of [cmp?.attribution?.best, cmp?.attribution?.worst]) {
      const name = side?.symbol ? d.positions.find(p => p.symbol === side.symbol)?.name ?? d.transactions.find(t => t.symbol === side.symbol)?.name : null
      if (name) side.name = name
    }
    const bench = (b: any) => b ? {
      name: b.label, rendite_prozent: num(b.totalReturnPct), rendite_pro_jahr_prozent: num(b.annualizedPct),
      depot_besser_um_prozentpunkte: num(b.diffTotalPct), depot_besser_pro_jahr_prozentpunkte: num(b.diffPaPct),
      // Zeit- und geldgewichteter Vergleich können verschiedene Vorzeichen haben,
      // die Depotseite zeigt den Euro-Betrag dann auch nicht
      ...(b.euroDiff !== null && (b.euroDiff >= 0) === ((b.diffPaPct ?? b.diffTotalPct) >= 0) ? { gleiches_geld_im_index_vorteil_depot_eur: b.euroDiff } : {}),
    } : null
    return {
      data: {
        depot: d.label, zeitraum: PERIOD_LABEL[zeitraum], von: first.date, bis: last.date, jahre: cmp?.periodYears ?? null,
        rendite_prozent: num(cmp?.portfolio?.totalReturnPct), rendite_pro_jahr_prozent: num(cmp?.portfolio?.annualizedPct),
        vergleich: cmp ? [bench(cmp.benchmarks?.ftseAllWorld), bench(cmp.benchmarks?.msciWorld), bench(cmp.benchmarks?.sp500)].filter(Boolean) : [],
        wert_am_anfang_eur: eur(first.value), wert_am_ende_eur: eur(last.value), ...(leveraged ? { davon_wertpapiere_am_ende_eur: eur(d.stockValue), davon_negatives_guthaben_eur: eur(d.cash) } : {}), eingezahlt_im_zeitraum_eur: eur(contributed), gewinn_im_zeitraum_eur: eur(gain),
        ...(cmp?.attribution ? { woher_der_unterschied_zum_all_world_kommt_eur: cmp.attribution.buckets?.map((b: any) => ({ teil: b.key === 'fees' ? 'Ordergebühren und Steuern auf Verkäufe' : b.label, eur: b.euroDiff })), bester_beitrag: cmp.attribution.best, schwaechster_beitrag: cmp.attribution.worst } : {}),
        hinweise: [
          'rendite_prozent ist zeitgewichtet (TWR): Einzahlungen verändern sie nicht, deshalb ist sie mit einem Index vergleichbar. Alles in Euro, Indizes mit Dividenden.',
          `gewinn_im_zeitraum_eur = Wert am Ende minus Wert am Anfang minus eingezahltes Geld${h.meta?.investedMode === 'deposits' ? ', Guthaben eingerechnet' : ', nur Wertpapiere, Dividenden eingerechnet'}.`,
          ...(leveraged ? ['Das Guthaben ist negativ (Wertpapierkredit oder fehlende Einzahlungen). rendite_prozent misst vor allem die Wertpapiere, gewinn_im_zeitraum_eur gehört dagegen zum Wert nach Abzug des negativen Guthabens, samt Zinsen. Beide Zahlen getrennt nennen, nie als "X €, das sind Y %". wert_am_anfang_eur und wert_am_ende_eur sind der Wert nach Abzug des negativen Guthabens, nicht der Depotwert.'] : []),
          ...(h.meta?.cashLedger === 'missing' ? ['Einzahlungen sind nicht gebucht. Eingezahltes Geld ist deshalb aus Käufen, Verkäufen und Dividenden geschätzt.'] : []),
          ...(h.meta?.cashLedger === 'mismatch' ? ['Die gebuchten Einzahlungen passen nicht zum Guthaben. Eingezahltes Geld ist deshalb aus Käufen, Verkäufen und Dividenden geschätzt.'] : []),
          ...staleNotes(d, ctx.now),
          ...(cmp && cmp.periodYears < 0.95 ? ['Unter einem Jahr wird keine Rendite pro Jahr ausgewiesen.'] : []),
          ...(first.date > isoDaysAgo(periodDays(zeitraum, ctx.now) - 10, ctx.now) && zeitraum !== 'max' ? [`Das Depot hat erst ab ${germanDate(first.date)} Werte, der Zeitraum beginnt dort.`] : []),
        ],
        ...(blocks.length ? { grafik: blocks[0].id } : {}),
      },
      blocks,
      sources: [{ label: `Dein Depot (${d.label})`, stand: `${germanDate(first.date)} bis ${germanDate(last.date)}` }],
    }
  },
})

export const depotRisiko = defineTool({
  name: 'depot_risiko',
  description: 'Risiko des Depots: Schwankung, größter Rückgang, Beta, Sharpe gegen Indizes. Mit stresstest: was die heutige Aufteilung in echten Krisen (2008, Corona, 2022) verloren hätte, dazu Gleichlauf der Positionen.',
  schema: z.object({ depot: depotSchema, zeitraum: z.enum(['1J', '3J', 'max']).optional(), stresstest: z.boolean().optional() }),
  inputSchema: { type: 'object', properties: { depot: DEPOT_PROP, zeitraum: { type: 'string', enum: ['1J', '3J', 'max'], description: 'Standard 3J' }, stresstest: { type: 'boolean' } }, additionalProperties: false },
  label: i => (i.stresstest ? 'Krisen durchrechnen' : 'Risiko berechnen'),
  async run({ depot, zeitraum = '3J', stresstest = false }, ctx) {
    const d = await ctx.depot.load(depot)
    if (d.positions.length === 0) throw new ToolError(`Im Depot "${d.label}" sind keine Positionen.`)
    const h = await history(d, ctx, periodDays(zeitraum, ctx.now), stresstest)
    if (h.riskMeasuresLocked) throw new ToolError('Risiko-Kennzahlen und Stresstests gehören zu Finclue Premium. Sage das freundlich und biete die Rendite (depot_rendite) an.')
    const r = h.riskMeasures
    const measures = (m: any) => m ? {
      zeitraum_tage: m.periodDays, rendite_pro_jahr_prozent: pct(m.annualizedReturnPct), schwankung_pro_jahr_prozent: pct(m.volatilityPct), groesster_rueckgang_prozent: pct(m.maxDrawdownPct),
      rueckgang_von: m.maxDrawdownPeak, rueckgang_bis: m.maxDrawdownValley, erholt_nach_monaten: m.recoveryMonths, sharpe: round(m.sharpe, 2), beta_zum_all_world: round(m.beta, 2),
      monate_im_plus: m.positiveMonths, monate_im_minus: m.negativeMonths,
    } : null
    if (!r?.portfolio && !stresstest) throw new ToolError('Für Risiko-Kennzahlen ist die Kurshistorie des Depots zu kurz (etwa sechs Monate nötig).')
    const blocks: AiBlock[] = []
    const q = h.quant
    if (stresstest && q?.stressTests?.length) {
      blocks.push({
        id: ctx.nextBlockId(), type: 'saeulen', titel: 'Deine heutige Aufteilung in echten Krisen', einheit: '%', nachkommastellen: 1,
        kategorien: q.stressTests.map((s: any) => s.label), serien: [{ name: 'Dein Depot', werte: q.stressTests.map((s: any) => round(s.portfolioReturnPct, 1)) }, { name: 'S&P 500', werte: q.stressTests.map((s: any) => round(s.marketReturnPct, 1)) }],
      })
    }
    const credit = borrowed(d)
    const corr = q?.correlation
    const pairs: Array<{ a: string; b: string; gleichlauf: number }> = []
    if (corr) {
      for (let i = 0; i < corr.symbols.length; i++) for (let j = i + 1; j < corr.symbols.length; j++) {
        const v = corr.matrix[i][j]
        if (v != null) pairs.push({ a: corr.symbols[i], b: corr.symbols[j], gleichlauf: round(v, 2) ?? 0 })
      }
      pairs.sort((x, y) => y.gleichlauf - x.gleichlauf)
    }
    return {
      data: {
        depot: d.label, wertpapiere_eur: eur(d.stockValue),
        kennzahlen: r ? { depot: measures(r.portfolio), ftse_all_world: measures(r.ftseAllWorld), msci_world: measures(r.msciWorld), sp500: measures(r.sp500), risikofreier_zins_prozent: r.riskFreePct } : null,
        ...(stresstest ? {
          krisen: (q?.stressTests ?? []).map((s: any) => ({ name: s.label, von: s.from, bis: s.to, depot_prozent: pct(s.portfolioReturnPct), depot_eur: eur(s.portfolioImpactEur), ...(credit > 0 && d.stockValue > credit ? { anteil_am_eigenen_geld_prozent: pct((s.portfolioImpactEur / (d.stockValue - credit)) * 100) } : {}), sp500_prozent: pct(s.marketReturnPct), anteil_mit_echten_kursen_prozent: pct(s.realDataWeightPct), anteil_ueber_aehnlichen_indexfonds_prozent: pct(s.proxyDataWeightPct ?? 0), rest_geschaetzt_ueber_beta_prozent: pct(Math.max(0, 100 - s.realDataWeightPct - (s.proxyDataWeightPct ?? 0))) })),
          gleichlauf_durchschnitt: corr?.avgPairwise == null ? null : round(corr.avgPairwise, 2), gleichlauf_am_staerksten: pairs.slice(0, 5), gleichlauf_am_schwaechsten: pairs.slice(-3).reverse(),
        } : {}),
        hinweise: [
          'Rückblick, keine Vorhersage. Schwankung = Volatilität der Tagesrenditen aufs Jahr gerechnet.',
          ...(stresstest ? ['Krisen: heutige Aufteilung mit den echten Kursen von damals. Für ETFs, die es damals nicht gab, gelten die echten Kurse eines ähnlichen Indexfonds, für Aktien ohne damalige Kurse eine Schätzung über ihr Beta. Gleichlauf = Korrelation, 1 heißt völlig gleich.'] : []),
          ...(stresstest && credit > 0 ? [`Das Guthaben ist negativ (${eur(d.cash)} €): Ist das ein Wertpapierkredit, trifft der Verlust allein das eigene Geld (${eur(d.stockValue - credit)} €). depot_prozent gilt für die Wertpapiere, anteil_am_eigenen_geld_prozent für das eigene Geld. Nenne beide.`] : []),
        ],
        ...(blocks.length ? { grafik: blocks[0].id } : {}),
      },
      blocks,
      sources: [{ label: `Dein Depot (${d.label})`, stand: r?.portfolio ? `${r.portfolio.periodDays} Tage` : null }],
    }
  },
})

// ── Durchsicht durch ETFs ───────────────────────────────────────────────────

const lookMemo = new WeakMap<DepotData, Promise<LookthroughResult>>()

function lookthrough(d: DepotData): Promise<LookthroughResult> {
  let pending = lookMemo.get(d)
  if (!pending) {
    pending = (async () => {
      const { computeLookthrough } = await import('@/lib/portfolio/lookthrough')
      return computeLookthrough(
        d.positions.filter(p => p.value > 0 && p.art.art !== 'Krypto').map(p => ({ symbol: p.symbol, name: p.name, isin: p.isin, value: p.value })),
        { maxExposures: Infinity, withSize: false }
      )
    })()
    lookMemo.set(d, pending)
  }
  return pending
}

const SECTOR_DE: Record<string, string> = {
  Technology: 'Technologie', 'Financial Services': 'Finanzen', Healthcare: 'Gesundheit', 'Consumer Discretionary': 'Zyklischer Konsum', 'Consumer Staples': 'Basiskonsum',
  'Communication Services': 'Kommunikation', Industrials: 'Industrie', Energy: 'Energie', Utilities: 'Versorger', 'Real Estate': 'Immobilien', Materials: 'Rohstoffe', Other: 'Sonstige',
}

/** Nicht in Einzelaktien zerlegbare Teile */
function opaque(d: DepotData, look: LookthroughResult) {
  const list = look.etfCoverage.filter(e => e.status === 'no-proxy' || e.status === 'non-equity').map(e => ({ name: e.name, symbol: e.symbol, wert: e.value, grund: e.status === 'non-equity' ? 'keine Aktien' : 'Bestände unbekannt' }))
  for (const p of d.positions) if (p.art.art === 'Krypto' && p.value > 0) list.push({ name: p.name, symbol: p.symbol, wert: p.value, grund: 'Krypto' })
  return list
}

function exposureRow(e: EffectiveExposure, total: number) {
  return {
    symbol: e.symbol, name: e.name, wert_eur: eur(e.value), anteil_prozent: total > 0 ? pct((e.value / total) * 100) : null,
    direkt_eur: eur(e.directValue), ueber_etfs_eur: eur(e.etfValue), in_etfs: e.sources.slice(0, 5).map(s => ({ etf: s.etfName, eur: eur(s.value) })),
  }
}

function coverageNotes(d: DepotData, look: LookthroughResult): string[] {
  const approx = look.etfCoverage.filter(e => e.status === 'approximated')
  const dark = opaque(d, look).filter(o => o.grund === 'Bestände unbekannt')
  return [
    'Anteile beziehen sich auf alle Wertpapiere ohne Guthaben.',
    ...(approx.length ? [`Angenähert über ähnliche US-ETFs, weil Bestände europäischer ETFs nicht frei verfügbar sind: ${approx.slice(0, 6).map(e => `${e.name} (${e.proxyLabel})`).join(', ')}.`] : []),
    ...(dark.length ? [`Nicht zerlegbar: ${dark.slice(0, 6).map(o => o.name).join(', ')}.`] : []),
    ...priceNote(d),
  ]
}

export const depotDurchsicht = defineTool({
  name: 'depot_durchsicht',
  description: 'Was wirklich im Depot steckt, ETFs in Einzelaktien zerlegt: größte Firmen, Regionen und Branchen gegen den Weltmarkt, Überschneidungen der ETFs. Mit firmen: wie viel davon direkt und über ETFs im Depot ist ("Wie viel Nvidia habe ich insgesamt?").',
  schema: z.object({ depot: depotSchema, firmen: z.array(symbolSchema).min(1).max(20).optional() }),
  inputSchema: { type: 'object', properties: { depot: DEPOT_PROP, firmen: { type: 'array', items: { type: 'string', description: 'Symbol wie NVDA' }, maxItems: 20 } }, additionalProperties: false },
  label: i => (i.firmen ? `${i.firmen.slice(0, 3).join(', ')} im Depot suchen` : 'ETFs im Depot zerlegen'),
  async run({ depot, firmen }, ctx) {
    const d = await ctx.depot.load(depot)
    if (d.positions.length === 0) throw new ToolError(`Im Depot "${d.label}" sind keine Positionen.`)
    const look = await lookthrough(d)
    const total = d.stockValue
    const dark = opaque(d, look)
    const blocks: AiBlock[] = []
    const base = {
      depot: d.label, wertpapiere_eur: eur(total), zerlegt_prozent: pct((look.analyzedValue / total) * 100),
      nicht_zerlegbar: dark.slice(0, 8).map(o => ({ name: o.name, wert_eur: eur(o.wert), grund: o.grund })),
    }
    if (firmen) {
      const wanted = new Set(firmen.map(companySymbol))
      const instruments = await getInstrumentsForSymbols(firmen)
      const isins = new Set([...instruments.values()].map(i => i.isin.toUpperCase()))
      const hits = look.topExposures.filter(e => wanted.has(companySymbol(e.symbol)) || (e.isin != null && isins.has(e.isin)))
      const sum = hits.reduce((s, e) => s + e.value, 0)
      return {
        data: {
          ...base, gesucht: firmen, gefunden: hits.map(e => exposureRow(e, total)), nicht_enthalten: firmen.filter(f => !hits.some(e => companySymbol(e.symbol) === companySymbol(f) || (instruments.get(f)?.isin && e.isin === instruments.get(f)!.isin.toUpperCase()))),
          ...(hits.length > 1 ? { summe_eur: eur(sum), summe_anteil_prozent: pct((sum / total) * 100) } : {}), hinweise: coverageNotes(d, look),
        },
        sources: [depotSource(d)],
      }
    }
    // Weltmarkt als Maßstab, damit "viel" und "wenig" einen Bezug haben. Der
    // All-World-ETF wird über VT zerlegt.
    const { computeLookthrough } = await import('@/lib/portfolio/lookthrough')
    const world = await computeLookthrough([{ symbol: 'VWCE.DE', name: 'Vanguard FTSE All-World UCITS ETF', isin: 'IE00BK5BQT80', value: 100 }], { withSize: false }).catch(() => null)
    const worldShare = (list: Array<{ label: string; percent: number }> | undefined, label: string) => { const hit = list?.find(x => x.label === label); return hit ? pct(hit.percent) : null }
    const id = ctx.nextBlockId()
    blocks.push({ id, type: 'balken', titel: 'Größte Firmen im Depot, ETFs eingerechnet (kräftig: auch direkt gehalten)', einheit: '%', nachkommastellen: 1, werte: look.topExposures.slice(0, 12).map(e => ({ name: e.name, wert: (e.value / total) * 100, hervor: e.directValue > 0 })) })
    return {
      data: {
        ...base, groesste_firmen: look.topExposures.slice(0, 20).map(e => exposureRow(e, total)),
        top_10_anteil_prozent: pct((look.topExposures.slice(0, 10).reduce((s, e) => s + e.value, 0) / total) * 100), firmen_gesamt: look.topExposures.length,
        regionen_prozent_der_aktien: look.regions.slice(0, 9).map(r => ({ name: r.label, prozent: pct(r.percent), weltmarkt_prozent: worldShare(world?.regions, r.label) })),
        branchen_prozent_der_aktien: look.sectors.slice(0, 12).map(s => ({ name: SECTOR_DE[s.label] ?? s.label, prozent: pct(s.percent), weltmarkt_prozent: worldShare(world?.sectors, s.label) })),
        technologie_und_kommunikation_zusammen: {
          prozent: pct(['Technology', 'Communication Services'].reduce((s, l) => s + (look.sectors.find(x => x.label === l)?.percent ?? 0), 0)),
          weltmarkt_prozent: world ? pct(['Technology', 'Communication Services'].reduce((s, l) => s + (world.sectors.find(x => x.label === l)?.percent ?? 0), 0)) : null,
        },
        etf_ueberschneidungen: look.overlaps.slice(0, 6).map(o => ({ a: o.nameA, b: o.nameB, ueberschneidung_prozent: pct(o.overlapPercent), gemeinsame_firmen: o.sharedCount })),
        hinweise: [...coverageNotes(d, look), 'Regionen und Branchen sind fertig gerechnet, ETFs eingerechnet. Weltmarkt = Vanguard Total World (VT).'], grafik: id,
      },
      blocks,
      sources: [depotSource(d)],
    }
  },
})

export const depotThema = defineTool({
  name: 'depot_thema',
  description: 'Anteil eines Themas am Depot, ETFs eingerechnet, zum Beispiel "Wie groß ist mein AI Exposure?". Abgegrenzt über die Bestände echter Themen-ETFs (eng: in mindestens der Hälfte, weit: in mindestens einem). Für andere Themen firmen mit eigener Liste angeben.',
  schema: z.object({ depot: depotSchema, thema: z.enum(['magnificent_7', ...THEME_IDS] as [string, ...string[]]).optional(), eigenes_thema: z.string().trim().min(2).max(60).optional(), firmen: z.array(symbolSchema).min(1).max(60).optional() })
    .refine(v => v.thema || (v.eigenes_thema && v.firmen), 'thema angeben oder eigenes_thema mit firmen'),
  inputSchema: {
    type: 'object',
    properties: {
      depot: DEPOT_PROP, thema: { type: 'string', enum: ['magnificent_7', ...THEME_IDS] },
      eigenes_thema: { type: 'string', description: 'nur wenn keines der Themen passt' }, firmen: { type: 'array', items: { type: 'string' }, maxItems: 60, description: 'Symbole, die zum eigenen Thema zählen. In der Antwort nennen.' },
    },
    additionalProperties: false,
  },
  label: i => `Anteil ${i.thema === 'magnificent_7' ? 'Magnificent 7' : i.thema ? THEMES[i.thema as ThemeId].name : i.eigenes_thema} berechnen`,
  async run({ depot, thema, eigenes_thema, firmen }, ctx) {
    const d = await ctx.depot.load(depot)
    if (d.positions.length === 0) throw new ToolError(`Im Depot "${d.label}" sind keine Positionen.`)
    const isFixed = !thema || thema === 'magnificent_7'
    const [look, members] = await Promise.all([lookthrough(d), isFixed ? null : loadTheme(thema as ThemeId)])
    if (!isFixed && !members) throw new ToolError('Die Bestände der Themen-ETFs sind gerade nicht abrufbar.')
    const total = d.stockValue
    const theme: Theme | null = isFixed ? null : THEMES[thema as ThemeId]
    const name = theme?.name ?? (thema === 'magnificent_7' ? 'Magnificent 7' : eigenes_thema!)
    const fixed = isFixed ? new Set((thema === 'magnificent_7' ? MAGNIFICENT_7 : firmen!).map(companySymbol)) : null

    const scored = look.topExposures
      .map(e => ({ e, hits: fixed ? (fixed.has(companySymbol(e.symbol)) ? 1 : 0) : members!.treffer(e.symbol, e.isin) }))
      .filter(x => x.hits > 0)
    const eng = fixed ? 1 : members!.eng
    const narrow = scored.filter(x => x.hits >= eng)
    // Themen-ETFs, deren Bestände unbekannt sind, zählen mit ihrem ganzen Wert
    const wholeEtfs = theme?.etfName ? look.etfCoverage.filter(c => c.status === 'no-proxy' && theme.etfName!.test(c.name)) : []
    const whole = wholeEtfs.reduce((s, c) => s + c.value, 0)
    const sum = (list: typeof scored) => {
      const value = list.reduce((s, x) => s + x.e.value, 0) + whole
      const direct = list.reduce((s, x) => s + x.e.directValue, 0)
      return { anteil_prozent: pct((value / total) * 100), wert_eur: eur(value), firmen: list.length, direkt_gehalten_eur: eur(direct), direkt_gehalten_prozent: pct((direct / total) * 100), ueber_etfs_eur: eur(value - direct), ueber_etfs_prozent: pct(((value - direct) / total) * 100) }
    }
    const byEtf = new Map<string, number>()
    for (const x of narrow) for (const s of x.e.sources) byEtf.set(s.etfName, (byEtf.get(s.etfName) ?? 0) + s.value)
    const blocks: AiBlock[] = []
    if (narrow.length > 0) {
      blocks.push({ id: ctx.nextBlockId(), type: 'balken', titel: `${name}${fixed || members!.koerbe.length === 1 ? '' : ', eng gefasst'}: größte Beiträge (kräftig: auch direkt gehalten)`, einheit: '%', nachkommastellen: 1, werte: narrow.slice(0, 12).map(x => ({ name: x.e.name, wert: (x.e.value / total) * 100, hervor: x.e.directValue > 0 })) })
    }
    const dark = opaque(d, look).filter(o => o.grund === 'Bestände unbekannt' && !wholeEtfs.some(w => w.symbol === o.symbol))
    return {
      data: {
        depot: d.label, thema: name, wertpapiere_eur: eur(total),
        ...(fixed
          ? { ergebnis: sum(narrow), gezaehlte_firmen: [...fixed] }
          : members!.koerbe.length === 1
          ? { ergebnis: sum(scored), abgrenzung: { themen_etf: members!.koerbe[0], regel: 'Firma steckt in diesem ETF' } }
          : {
              eng_gefasst: sum(narrow), weit_gefasst: sum(scored),
              abgrenzung: { themen_etfs: members!.koerbe, eng: `Firma steckt in mindestens ${eng} von ${members!.koerbe.length} dieser ETFs`, weit: 'Firma steckt in mindestens einem dieser ETFs' },
            }),
        groesste_beitraege: narrow.slice(0, 12).map(x => ({ ...exposureRow(x.e, total), ...(fixed ? {} : { in_themen_etfs: x.hits }) })),
        ...(fixed ? {} : { nur_weit_gefasst_groesste: scored.filter(x => x.hits < eng).slice(0, 6).map(x => ({ name: x.e.name, anteil_prozent: pct((x.e.value / total) * 100), in_themen_etfs: x.hits })) }),
        beitrag_je_etf: [...byEtf].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([etf, v]) => ({ etf, eur: eur(v), prozent: pct((v / total) * 100) })),
        ...(whole > 0 ? { themen_etfs_ganz_gezaehlt: wholeEtfs.map(w => ({ name: w.name, wert_eur: eur(w.value) })) } : {}),
        nicht_zerlegbar_prozent: pct((dark.reduce((s, o) => s + o.wert, 0) / total) * 100),
        hinweise: [
          ...coverageNotes(d, look),
          'Jede Firma zählt mit ihrem ganzen Wert, auch wenn das Thema nur einen Teil ihres Geschäfts ausmacht (zum Beispiel Microsoft oder Amazon). Das in der Antwort erwähnen.',
          ...(thema === 'magnificent_7' ? [] : fixed ? ['Die Liste der Firmen stammt von dir. Nenne sie in der Antwort.'] : []),
        ],
        ...(blocks.length ? { grafik: blocks[0].id } : {}),
      },
      blocks,
      sources: [depotSource(d), ...(members ? [{ label: `Bestände von ${members.koerbe.map(k => k.symbol).join(', ')}` }] : [])],
    }
  },
})

// ── Termine und Superinvestoren ─────────────────────────────────────────────

export const depotTermine = defineTool({
  name: 'depot_termine',
  description: 'Anstehende Quartalszahlen und angekündigte Dividenden der Positionen im Depot.',
  schema: z.object({ depot: depotSchema, tage: z.number().int().min(1).max(90).optional() }),
  inputSchema: { type: 'object', properties: { depot: DEPOT_PROP, tage: { type: 'integer', minimum: 1, maximum: 90, description: 'Standard 30' } }, additionalProperties: false },
  label: () => 'Termine im Depot suchen',
  async run({ depot, tage = 30 }, ctx) {
    const d = await ctx.depot.load(depot)
    const today = berlinIsoDay(ctx.now)
    const until = berlinIsoDay(ctx.now.getTime() + tage * 86_400_000)
    const bySymbol = new Map(d.positions.map(p => [p.symbol.toUpperCase(), p]))
    const stocks = d.positions.filter(p => p.art.art === 'Aktie')
    const payers = d.positions.filter(p => p.art.art === 'Aktie' || p.art.art === 'ETF').slice(0, 60)
    const currencies = [...new Set(payers.map(p => detectTickerCurrency(p.symbol)))]
    const [events, rates, dividends] = await Promise.all([
      loadEarningsForSymbols(supabaseAdmin as any, stocks.map(p => p.symbol), today, until, process.env.FMP_API_KEY),
      Promise.all(currencies.map(async c => [c, c === 'EUR' ? 1 : await getExchangeRate(c, 'EUR')] as const)).then(e => new Map<string, number | null>(e)),
      Promise.all(payers.map(async p => {
        const data = await fmp(`/api/v3/historical-price-full/stock_dividend/${encodeURIComponent(p.symbol)}`, {}, { revalidate: 3600 })
        const rows = Array.isArray(data?.historical) ? data.historical.slice(0, 6) : []
        return rows
          .map((r: any) => ({ p, ex: String(r.date ?? ''), zahltag: String(r.paymentDate || r.date || ''), amount: Number(r.dividend ?? r.adjDividend) || 0 }))
          .filter((r: any) => r.amount > 0 && ((r.ex >= today && r.ex <= until) || (r.zahltag >= today && r.zahltag <= until)))
      })).then(l => l.flat()),
    ])
    const total = d.stockValue
    const list = events.map(e => ({ e, p: bySymbol.get(e.symbol.toUpperCase()) })).filter((x): x is { e: (typeof events)[number]; p: NonNullable<typeof x.p> } => !!x.p)
    const pays = dividends.map((r: any) => {
      const currency = detectTickerCurrency(r.p.symbol)
      const rate = rates.get(currency)
      const perShare = rate ? (currency === 'GBP' ? r.amount / 100 : r.amount) * rate : null
      return { symbol: r.p.symbol, name: r.p.name, ex_tag: r.ex, zahltag: r.zahltag, ex_tag_vorbei: r.ex < today, erwartet_eur: perShare == null ? null : eur(perShare * r.p.quantity) }
    }).sort((a, b) => a.zahltag.localeCompare(b.zahltag))
    if (list.length === 0 && pays.length === 0) throw new ToolError(`In den nächsten ${tage} Tagen sind für die Positionen im Depot "${d.label}" keine Termine bekannt.`)
    return {
      data: {
        depot: d.label, von: today, bis: until,
        quartalszahlen: list.slice(0, 25).map(({ e, p }) => ({ datum: e.date, symbol: e.symbol, name: p.name, zeit: e.time === 'amc' ? 'nach Börsenschluss' : e.time === 'bmo' ? 'vor Börsenstart' : null, anteil_am_depot_prozent: pct((p.value / total) * 100), uebliche_bewegung_prozent_ohne_richtung: round(e.typicalMovePct, 1), uebliche_bewegung_eur_ohne_richtung: e.typicalMovePct == null ? null : eur((p.value * e.typicalMovePct) / 100) })),
        dividenden: pays.slice(0, 25), dividenden_summe_eur: eur(pays.reduce((s, p) => s + (p.erwartet_eur ?? 0), 0)),
        hinweise: ['Dividenden brutto, vor Steuern. Nur angekündigte Zahlungen. Ist der Ex-Tag vorbei, zählt die Stückzahl von damals.'],
      },
      sources: [{ label: `Dein Depot (${d.label})` }, { label: 'Finclue Earnings-Kalender' }],
    }
  },
})

export const depotSuperinvestoren = defineTool({
  name: 'depot_superinvestoren',
  description: 'Welche Superinvestoren dieselben Aktien halten wie der Nutzer und was sie im letzten Quartal damit gemacht haben (13F).',
  schema: z.object({ depot: depotSchema }),
  inputSchema: { type: 'object', properties: { depot: DEPOT_PROP }, additionalProperties: false },
  label: () => 'Mit Superinvestoren vergleichen',
  async run({ depot }, ctx) {
    const d = await ctx.depot.load(depot)
    const stocks = d.positions.filter(p => p.art.art === 'Aktie' && p.value > 0)
    if (stocks.length === 0) throw new ToolError(`Im Depot "${d.label}" sind keine Einzelaktien.`)
    const { getSuperinvestorActivity } = await import('@/lib/superinvestorMatch')
    const activity = getSuperinvestorActivity(stocks.map(p => p.symbol))
    const perStock = stocks.map(p => ({ p, a: activity[p.symbol.toUpperCase()] })).filter(x => x.a && x.a.count > 0)
    if (perStock.length === 0) throw new ToolError('Keine deiner Einzelaktien steht in den aktuellen 13F-Meldungen der Superinvestoren.')
    const people = new Map<string, string[]>()
    for (const { p, a } of perStock) for (const i of a.investors) people.set(i.name, [...(people.get(i.name) ?? []), p.symbol])
    const trend = (list: Array<{ trend: string }>, t: string) => list.filter(i => i.trend === t).length
    return {
      data: {
        depot: d.label, einzelaktien: stocks.length, davon_bei_superinvestoren: perStock.length,
        je_aktie: perStock.sort((a, b) => b.a.count - a.a.count).slice(0, 15).map(({ p, a }) => ({ symbol: p.symbol, name: p.name, halter: a.count, neu_gekauft: trend(a.investors, 'neu gekauft'), aufgestockt: trend(a.investors, 'aufgestockt'), reduziert: trend(a.investors, 'reduziert') })),
        groesste_ueberschneidung: [...people].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([name, symbols]) => ({ name, gemeinsame_aktien: symbols.length, symbole: symbols.slice(0, 10) })),
        hinweise: ['13F-Meldungen zeigen nur US-gelistete Aktien zum Quartalsende, sie kommen bis zu 45 Tage später.'],
      },
      sources: [{ label: `Dein Depot (${d.label})` }, { label: '13F-Meldungen' }],
    }
  },
})
