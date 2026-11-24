// src/lib/ai/tools/fundamentals.ts
// Bewertung im Zeitverlauf, Finanzzahlen, Schätzungen, Quartalszahlen,
// Dividenden, Vergleich, Unternehmensprofil.

import { z } from 'zod'
import { getQuotes } from '@/lib/marketData/quoteService'
import { getDailyHistory } from '@/lib/marketData/history'
import { getReportingCurrencyInfo, isForeignReporting } from '@/lib/fmpCurrency'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AiBlock } from '../types'
import { finite, fmp, fmpList, isoDaysAgo, round } from '../data/fmp'
import { getValuationSeries, seriesStats, thinOut, VALUATION_METRICS, yearlyValues, type ValuationMetric } from '../data/valuation'
import { berlinIsoDay, defineTool, germanDate, ToolError } from './base'
import { SYMBOL_PROP, symbolSchema } from './market'

const METRIC_KEYS = Object.keys(VALUATION_METRICS) as [ValuationMetric, ...ValuationMetric[]]

export const kennzahlVerlauf = defineTool({
  name: 'kennzahl_verlauf',
  description:
    'Bewertungskennzahl einer Aktie über die Jahre auf Tagesbasis: Durchschnitt, Median, Minimum, Maximum, heutiger Wert, Jahresmittel, Grafik. Für jede Frage nach KGV, KUV, KBV, Kurs-Cashflow oder EV-Kennzahlen, auch nur für den heutigen Wert. Umrechnung bei ADRs (z. B. TSM) ist enthalten.',
  schema: z.object({ symbol: symbolSchema, kennzahl: z.enum(METRIC_KEYS), jahre: z.number().int().min(1).max(20).optional() }),
  inputSchema: {
    type: 'object',
    properties: {
      symbol: SYMBOL_PROP,
      kennzahl: { type: 'string', enum: METRIC_KEYS, description: 'kgv, kuv, kbv, kcv (operativer Cashflow), kfcv (freier Cashflow), ev_ebitda, ev_ebit, ev_umsatz' },
      jahre: { type: 'integer', minimum: 1, maximum: 20, description: 'Zeitraum in Jahren, Standard 10' },
    },
    required: ['symbol', 'kennzahl'],
    additionalProperties: false,
  },
  label: i => `${VALUATION_METRICS[i.kennzahl].label} von ${i.symbol} berechnen`,
  async run({ symbol, kennzahl, jahre = 10 }, ctx) {
    const today = berlinIsoDay(ctx.now)
    const from = `${Number(today.slice(0, 4)) - jahre}${today.slice(4)}`
    const series = await getValuationSeries(symbol, kennzahl, from, today)
    if (!series) throw new ToolError(`Für ${symbol} fehlen Kurse oder Quartalszahlen, um die Kennzahl zu berechnen.`)
    const stats = seriesStats(series.points)
    const metric = VALUATION_METRICS[kennzahl]
    if (!stats) throw new ToolError(`${metric.label} von ${symbol}: im Zeitraum durchgehend Verlust, kein sinnvoller Wert.`)

    const outliers = stats.max > 5 * stats.median || stats.mean > 1.6 * stats.median
    // Letzter Wert zu alt ⇒ seitdem Verlust, es gibt derzeit keinen sinnvollen Wert
    const current = Date.parse(today) - Date.parse(stats.lastDate) <= 10 * 86_400_000
    const id = ctx.nextBlockId()
    const block: AiBlock = {
      id, type: 'linie', titel: `${metric.label} von ${symbol}`, einheit: '', nachkommastellen: 1,
      serien: [{ name: metric.label, punkte: thinOut(series.points) }],
      referenz: outliers ? { label: 'Median', wert: round(stats.median, 1)! } : { label: 'Ø', wert: round(stats.mean, 1)! },
    }
    return {
      data: {
        symbol, kennzahl: metric.label,
        zeitraum: { von: stats.firstDate, bis: stats.lastDate, handelstage: stats.count },
        durchschnitt: round(stats.mean, 1), median: round(stats.median, 1),
        minimum: { wert: round(stats.min, 1), datum: stats.minDate },
        maximum: { wert: round(stats.max, 1), datum: stats.maxDate },
        ...(current
          ? {
              aktuell: { wert: round(stats.last, 1), datum: stats.lastDate },
              abstand_zum_durchschnitt_prozent: round((stats.last / stats.mean - 1) * 100, 1),
              abstand_zum_median_prozent: round((stats.last / stats.median - 1) * 100, 1),
              tage_mit_niedrigerem_wert: { tage: stats.daysBelow, von: stats.count, prozent: round((stats.daysBelow / stats.count) * 100, 1) },
            }
          : { aktuell: null, aktuell_hinweis: `Derzeit kein sinnvoller Wert, die letzten zwölf Monate ergeben einen Verlust. Letzter Wert vom ${stats.lastDate}.` }),
        ...(outliers
          ? { jahresmediane: yearlyValues(series.points).map(y => ({ jahr: y.jahr, wert: round(y.median, 1) })) }
          : { jahresmittel: yearlyValues(series.points).map(y => ({ jahr: y.jahr, wert: round(y.mittel, 1) })) }),
        tage_ohne_wert_wegen_verlust: series.excludedDays,
        ...(outliers ? { warnung: 'Der Durchschnitt ist durch Ausreißer verzerrt (Gewinn zeitweise nahe null). Median verwenden und das sagen.' } : {}),
        ...(stats.firstDate > from.replace(/-\d\d$/, '-28') ? { warnung_zeitraum: `Daten reichen nur bis ${stats.firstDate} zurück.` } : {}),
        rechenweg: metric.formel + '. Jedes Quartal zählt ab Veröffentlichung.' +
          (series.converted ? ` Gewinne in ${series.reportedCurrency} zum Tageskurs in ${series.tradingCurrency} umgerechnet.` : '') +
          (series.estimatedDates ? ' Wo das Veröffentlichungsdatum fehlt, ist es geschätzt.' : ''),
        letztes_quartal_bis: series.latestPeriodEnd,
        grafik: id,
      },
      blocks: [block],
      sources: [{ label: `${stats.count.toLocaleString('de-DE')} Tageskurse, Quartalsberichte bis ${germanDate(series.latestPeriodEnd ?? stats.lastDate)}`, stand: germanDate(stats.lastDate) }],
    }
  },
})

const STATEMENT_ITEMS = {
  umsatz: 'Umsatz', bruttogewinn: 'Bruttogewinn', operatives_ergebnis: 'Operatives Ergebnis', ebitda: 'EBITDA', nettogewinn: 'Nettogewinn',
  eps: 'Gewinn je Aktie', operativer_cashflow: 'Operativer Cashflow', investitionen: 'Investitionen', freier_cashflow: 'Freier Cashflow',
  forschung: 'Forschung und Entwicklung', barmittel: 'Barmittel', schulden: 'Finanzschulden', nettoschulden: 'Nettofinanzschulden', eigenkapital: 'Eigenkapital',
  aktien: 'Verwässerte Aktien', aktienrueckkaeufe: 'Aktienrückkäufe', gezahlte_dividenden: 'Gezahlte Dividenden',
  bruttomarge: 'Bruttomarge', operative_marge: 'Operative Marge', nettomarge: 'Nettomarge', fcf_marge: 'FCF-Marge', eigenkapitalrendite: 'Eigenkapitalrendite',
} as const
type StatementItem = keyof typeof STATEMENT_ITEMS
const ITEM_KEYS = Object.keys(STATEMENT_ITEMS) as [StatementItem, ...StatementItem[]]
const PERCENT_ITEMS = new Set<StatementItem>(['bruttomarge', 'operative_marge', 'nettomarge', 'fcf_marge', 'eigenkapitalrendite'])

function statementValue(item: StatementItem, i: any, c: any, b: any): number | null {
  const ratio = (a: unknown, d: unknown) => {
    const x = finite(a), y = finite(d)
    return x != null && y ? (x / y) * 100 : null
  }
  switch (item) {
    case 'umsatz': return finite(i.revenue)
    case 'bruttogewinn': return finite(i.grossProfit)
    case 'operatives_ergebnis': return finite(i.operatingIncome)
    case 'ebitda': return finite(i.ebitda)
    case 'nettogewinn': return finite(i.netIncome)
    case 'eps': return finite(i.epsdiluted ?? i.eps)
    case 'forschung': return finite(i.researchAndDevelopmentExpenses)
    case 'aktien': return finite(i.weightedAverageShsOutDil)
    case 'operativer_cashflow': return finite(c?.operatingCashFlow)
    case 'investitionen': return finite(c?.capitalExpenditure) == null ? null : Math.abs(c.capitalExpenditure)
    case 'freier_cashflow': return finite(c?.freeCashFlow)
    case 'aktienrueckkaeufe': return finite(c?.commonStockRepurchased) == null ? null : Math.abs(c.commonStockRepurchased)
    case 'gezahlte_dividenden': return finite(c?.dividendsPaid) == null ? null : Math.abs(c.dividendsPaid)
    case 'barmittel': return finite(b?.cashAndShortTermInvestments ?? b?.cashAndCashEquivalents)
    case 'schulden': return finite(b?.totalDebt)
    case 'nettoschulden': return finite(b?.netDebt)
    case 'eigenkapital': return finite(b?.totalStockholdersEquity)
    case 'bruttomarge': return ratio(i.grossProfit, i.revenue)
    case 'operative_marge': return ratio(i.operatingIncome, i.revenue)
    case 'nettomarge': return ratio(i.netIncome, i.revenue)
    case 'fcf_marge': return ratio(c?.freeCashFlow, i.revenue)
    case 'eigenkapitalrendite': return ratio(i.netIncome, b?.totalStockholdersEquity)
  }
}

export const finanzzahlen = defineTool({
  name: 'finanzzahlen',
  description:
    'Gemeldete Geschäftszahlen aus Gewinn- und Verlustrechnung, Cashflow und Bilanz nach Jahren oder Quartalen, mit Wachstum und Grafik. Beträge in Millionen der Berichtswährung. Nicht für Bewertungskennzahlen wie KGV (dafür kennzahl_verlauf).',
  schema: z.object({
    symbol: symbolSchema,
    posten: z.array(z.enum(ITEM_KEYS)).min(1).max(8),
    zeitraum: z.enum(['jahr', 'quartal']).optional(),
    anzahl: z.number().int().min(1).max(20).optional(),
  }),
  inputSchema: {
    type: 'object',
    properties: {
      symbol: SYMBOL_PROP,
      posten: { type: 'array', items: { type: 'string', enum: ITEM_KEYS }, minItems: 1, maxItems: 8 },
      zeitraum: { type: 'string', enum: ['jahr', 'quartal'], description: 'Standard jahr' },
      anzahl: { type: 'integer', minimum: 1, maximum: 20, description: 'Zahl der Perioden, Standard 5 Jahre bzw. 8 Quartale' },
    },
    required: ['symbol', 'posten'],
    additionalProperties: false,
  },
  label: i => `Geschäftszahlen von ${i.symbol} laden`,
  async run({ symbol, posten, zeitraum = 'jahr', anzahl }, ctx) {
    const quarterly = zeitraum === 'quartal'
    const n = anzahl ?? (quarterly ? 8 : 5)
    const params = { period: quarterly ? 'quarter' : 'annual', limit: n + (quarterly ? 4 : 1) }
    const opts = { revalidate: 6 * 3600 }
    const [income, cash, balance] = await Promise.all([
      fmpList(`/api/v3/income-statement/${symbol}`, params, opts),
      fmpList(`/api/v3/cash-flow-statement/${symbol}`, params, opts),
      fmpList(`/api/v3/balance-sheet-statement/${symbol}`, params, opts),
    ])
    if (income.length === 0) throw new ToolError(`Für ${symbol} liegen keine Geschäftszahlen vor.`)
    const cashBy = new Map(cash.map(r => [r.date, r]))
    const balanceBy = new Map(balance.map(r => [r.date, r]))
    const all = [...income].sort((a, b) => String(a.date).localeCompare(String(b.date))).map(i => ({
      ende: i.date as string,
      periode: quarterly ? `${i.period} ${i.calendarYear}` : String(i.calendarYear ?? String(i.date).slice(0, 4)),
      gemeldet: typeof i.fillingDate === 'string' && i.fillingDate.slice(0, 10) > i.date ? i.fillingDate.slice(0, 10) : null,
      werte: Object.fromEntries(posten.map(p => [p, statementValue(p, i, cashBy.get(i.date), balanceBy.get(i.date))])) as Record<StatementItem, number | null>,
    }))
    const shown = all.slice(-n)
    const lag = quarterly ? 4 : 1
    const currency = income[0]?.reportedCurrency ?? 'USD'
    const scale = (p: StatementItem, v: number | null) =>
      v == null ? null : PERCENT_ITEMS.has(p) ? round(v, 1) : p === 'eps' ? round(v, 2) : round(v / 1e6, 1)

    const reihen = posten.map(p => {
      const values = shown.map(r => scale(p, r.werte[p]))
      const growth = shown.map(r => {
        const i = all.indexOf(r)
        const prev = all[i - lag]?.werte[p]
        const cur = r.werte[p]
        return !PERCENT_ITEMS.has(p) && cur != null && prev != null && prev > 0 ? round((cur / prev - 1) * 100, 1) : null
      })
      const first = shown[0]?.werte[p]
      const last = shown[shown.length - 1]?.werte[p]
      const years = shown.length > 1 ? (Date.parse(shown[shown.length - 1].ende) - Date.parse(shown[0].ende)) / (365.25 * 86_400_000) : 0
      return {
        posten: STATEMENT_ITEMS[p],
        einheit: PERCENT_ITEMS.has(p) ? 'Prozent' : p === 'eps' ? `${currency} je Aktie` : p === 'aktien' ? 'Mio. Stück' : `Mio. ${currency}`,
        werte: Object.fromEntries(shown.map((r, i) => [r.periode, values[i]])),
        ...(PERCENT_ITEMS.has(p) ? {} : { wachstum_zum_vorjahr_prozent: Object.fromEntries(shown.map((r, i) => [r.periode, growth[i]])) }),
        ...(!PERCENT_ITEMS.has(p) && years >= 1.5 && first != null && last != null && first > 0 && last > 0
          ? { wachstum_pro_jahr_prozent: round(((last / first) ** (1 / years) - 1) * 100, 1) }
          : {}),
      }
    })

    const chartItems = posten.filter(p => p !== 'aktien' && shown.some(r => r.werte[p] != null))
    const percent = chartItems.filter(p => PERCENT_ITEMS.has(p))
    const money = chartItems.filter(p => !PERCENT_ITEMS.has(p) && p !== 'eps')
    const eps = chartItems.filter(p => p === 'eps')
    const group = money.length > 0 ? money.slice(0, 3) : eps.length > 0 ? eps : percent.slice(0, 3)
    const blocks: AiBlock[] = []
    if (group.length > 0 && shown.length > 1) {
      const isMoney = group === money || money.length > 0
      blocks.push({
        id: ctx.nextBlockId(), type: 'saeulen', titel: `${symbol}: ${group.map(p => STATEMENT_ITEMS[p]).join(', ')}`,
        einheit: isMoney ? `Mrd. ${currency}` : group[0] === 'eps' ? currency : '%', nachkommastellen: 1,
        kategorien: shown.map(r => r.periode),
        serien: group.map(p => ({ name: STATEMENT_ITEMS[p], werte: shown.map(r => (r.werte[p] == null ? null : isMoney ? r.werte[p]! / 1e9 : r.werte[p])) })),
      })
    }
    return {
      data: {
        symbol, berichtswaehrung: currency, perioden: shown.map(r => ({ periode: r.periode, geschaeftsjahr_bis: r.ende, gemeldet: r.gemeldet })), reihen,
        ...(blocks[0] ? { grafik: blocks[0].id } : {}),
      },
      blocks,
      sources: [{ label: `Geschäftsberichte ${symbol}`, stand: germanDate(shown[shown.length - 1].ende) }],
    }
  },
})

export const schaetzungen = defineTool({
  name: 'schaetzungen',
  description: 'Analystenschätzungen für Umsatz und Gewinn der nächsten Jahre, erwartetes KGV, Kursziele, Verteilung der Empfehlungen und jüngste Änderungen einzelner Häuser.',
  schema: z.object({ symbol: symbolSchema }),
  inputSchema: { type: 'object', properties: { symbol: SYMBOL_PROP }, required: ['symbol'], additionalProperties: false },
  label: i => `Schätzungen für ${i.symbol} laden`,
  async run({ symbol }, ctx) {
    const apiKey = process.env.FMP_API_KEY ?? ''
    const [rows, target, consensus, grades, quotes, currency] = await Promise.all([
      fmpList(`/api/v3/analyst-estimates/${symbol}`, { period: 'annual', limit: 12 }, { revalidate: 6 * 3600 }),
      fmpList('/api/v4/price-target-consensus', { symbol }, { revalidate: 3600 }),
      fmpList('/api/v4/upgrades-downgrades-consensus', { symbol }, { revalidate: 3600 }),
      fmpList('/stable/grades', { symbol }, { revalidate: 3600 }),
      getQuotes([symbol]),
      getReportingCurrencyInfo(symbol, apiKey).catch(() => ({ reportedCurrency: null, tradingCurrency: null, fxToTrading: null })),
    ])
    const today = berlinIsoDay(ctx.now)
    const price = quotes.get(symbol)?.price ?? null
    const foreign = isForeignReporting(currency)
    const fx = foreign ? currency.fxToTrading : 1
    const future = rows.filter(r => r?.date > today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
    if (future.length === 0 && target.length === 0 && grades.length === 0) throw new ToolError(`Für ${symbol} liegen keine Schätzungen vor.`)
    const t = target[0]
    return {
      data: {
        symbol, berichtswaehrung: currency.reportedCurrency, handelswaehrung: currency.tradingCurrency,
        kurs: round(price, 2),
        schaetzungen: future.map(r => {
          const eps = finite(r.estimatedEpsAvg)
          const epsTrading = eps != null && fx != null ? eps * fx : null
          return {
            geschaeftsjahr_bis: r.date,
            umsatz_mio: round((finite(r.estimatedRevenueAvg) ?? NaN) / 1e6, 0),
            umsatz_spanne_mio: [round((finite(r.estimatedRevenueLow) ?? NaN) / 1e6, 0), round((finite(r.estimatedRevenueHigh) ?? NaN) / 1e6, 0)],
            gewinn_je_aktie: round(eps, 2),
            zahl_analysten: finite(r.numberAnalystsEstimatedEps),
            erwartetes_kgv: price && epsTrading && epsTrading > 0 ? round(price / epsTrading, 1) : null,
          }
        }),
        kursziele: t ? {
          mittel: round(finite(t.targetConsensus), 2), median: round(finite(t.targetMedian), 2), tief: round(finite(t.targetLow), 2), hoch: round(finite(t.targetHigh), 2),
          abstand_median_zum_kurs_prozent: price && finite(t.targetMedian) ? round((t.targetMedian / price - 1) * 100, 1) : null,
        } : null,
        empfehlungen: consensus[0] ? { stark_kaufen: consensus[0].strongBuy, kaufen: consensus[0].buy, halten: consensus[0].hold, verkaufen: consensus[0].sell, stark_verkaufen: consensus[0].strongSell } : null,
        juengste_aenderungen: grades.filter(g => g?.date >= isoDaysAgo(60, ctx.now)).slice(0, 10).map(g => ({ datum: g.date, haus: g.gradingCompany, vorher: g.previousGrade, neu: g.newGrade, art: g.action })),
        hinweis: 'Meinungen von Analysten, keine Empfehlung von Finclue.',
      },
      sources: [{ label: 'Analystenschätzungen (FMP)', stand: germanDate(today) }],
    }
  },
})

export const quartalszahlen = defineTool({
  name: 'quartalszahlen',
  description: 'Letzte Quartalsberichte einer Aktie: Gewinn und Umsatz gegen Erwartung, Kursreaktion, nächster Termin und, falls vorhanden, Zusammenfassung der Analystenkonferenz.',
  schema: z.object({ symbol: symbolSchema, anzahl: z.number().int().min(1).max(12).optional() }),
  inputSchema: {
    type: 'object',
    properties: { symbol: SYMBOL_PROP, anzahl: { type: 'integer', minimum: 1, maximum: 12, description: 'Standard 4' } },
    required: ['symbol'],
    additionalProperties: false,
  },
  label: i => `Quartalszahlen von ${i.symbol} laden`,
  async run({ symbol, anzahl = 4 }, ctx) {
    const today = berlinIsoDay(ctx.now)
    const [rows, calendar, summaries] = await Promise.all([
      fmpList(`/api/v3/historical/earning_calendar/${symbol}`, { limit: 24 }, { revalidate: 3600 }),
      supabaseAdmin.from('SecEarningsCalendar').select('date, reaction_pct, typical_move_pct').eq('ticker', symbol.replace('-', '.')).eq('confirmed', true).order('date', { ascending: false }).limit(16),
      supabaseAdmin.from('earnings_summaries').select('year, quarter, summary').eq('ticker', symbol).order('year', { ascending: false }).order('quarter', { ascending: false }).limit(1),
    ])
    const past = rows.filter(r => r?.date <= today && (finite(r.eps) != null || finite(r.revenue) != null)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, anzahl)
    const next = rows.filter(r => r?.date > today).sort((a, b) => a.date.localeCompare(b.date))[0]
    if (past.length === 0 && !next) throw new ToolError(`Für ${symbol} liegen keine Quartalszahlen vor.`)
    const reactionFor = (date: string) => (calendar.data ?? []).find((c: any) => Math.abs(Date.parse(c.date) - Date.parse(date)) <= 86_400_000)
    const surprise = (actual: number | null, estimate: number | null) =>
      actual != null && estimate ? round((actual / estimate - 1) * 100, 1) : null
    const summary = summaries.data?.[0]
    return {
      data: {
        symbol,
        berichte: past.map(r => {
          const reaction = reactionFor(r.date)
          return {
            datum: r.date, zeit: r.time === 'amc' ? 'nach Börsenschluss' : r.time === 'bmo' ? 'vor Börsenstart' : null, quartal_bis: r.fiscalDateEnding,
            gewinn_je_aktie: round(finite(r.eps), 2), gewinn_je_aktie_erwartet: round(finite(r.epsEstimated), 2),
            gewinn_ueberraschung_prozent: finite(r.epsEstimated)! > 0 ? surprise(finite(r.eps), finite(r.epsEstimated)) : null,
            umsatz_mio: round((finite(r.revenue) ?? NaN) / 1e6, 0), umsatz_erwartet_mio: round((finite(r.revenueEstimated) ?? NaN) / 1e6, 0),
            umsatz_ueberraschung_prozent: surprise(finite(r.revenue), finite(r.revenueEstimated)),
            kursreaktion_prozent: round(finite(reaction?.reaction_pct), 2), uebliche_bewegung_nach_zahlen_prozent_ohne_richtung: round(finite(reaction?.typical_move_pct), 2),
          }
        }),
        naechster_termin: next ? { datum: next.date, zeit: next.time, gewinn_je_aktie_erwartet: round(finite(next.epsEstimated), 2), umsatz_erwartet_mio: round((finite(next.revenueEstimated) ?? NaN) / 1e6, 0) } : null,
        konferenz_zusammenfassung: summary ? { quartal: `Q${summary.quarter} ${summary.year}`, text: String(summary.summary).slice(0, 2500) } : null,
      },
      sources: [{ label: 'Quartalsberichte', stand: past[0] ? germanDate(past[0].date) : null }],
    }
  },
})

export const dividenden = defineTool({
  name: 'dividenden',
  description: 'Dividenden einer Aktie oder eines ETFs: Zahlungen je Jahr, Rendite, Wachstum, Ausschüttungsquote, nächster Ex-Tag.',
  schema: z.object({ symbol: symbolSchema, jahre: z.number().int().min(1).max(25).optional() }),
  inputSchema: {
    type: 'object',
    properties: { symbol: SYMBOL_PROP, jahre: { type: 'integer', minimum: 1, maximum: 25, description: 'Standard 10' } },
    required: ['symbol'],
    additionalProperties: false,
  },
  label: i => `Dividenden von ${i.symbol} laden`,
  async run({ symbol, jahre = 10 }, ctx) {
    const today = berlinIsoDay(ctx.now)
    const [hist, ratios, quotes, profile] = await Promise.all([
      fmp<{ historical?: any[] }>(`/api/v3/historical-price-full/stock_dividend/${symbol}`, {}, { revalidate: 6 * 3600 }),
      fmpList(`/api/v3/ratios-ttm/${symbol}`, {}, { revalidate: 6 * 3600 }),
      getQuotes([symbol]),
      fmpList(`/api/v3/profile/${symbol}`, {}, { revalidate: 86400 }),
    ])
    const rows = (hist?.historical ?? []).filter(r => r?.date && finite(r.adjDividend ?? r.dividend) != null)
    if (rows.length === 0) throw new ToolError(`Für ${symbol} sind keine Dividenden erfasst.`)
    const value = (r: any) => finite(r.adjDividend) ?? finite(r.dividend) ?? 0
    const past = rows.filter(r => r.date <= today)
    const yearAgo = isoDaysAgo(365, ctx.now)
    const ttm = past.filter(r => r.date > yearAgo).reduce((s, r) => s + value(r), 0)
    const year = Number(today.slice(0, 4))
    const perYear = new Map<number, number>()
    for (const r of past) perYear.set(Number(r.date.slice(0, 4)), (perYear.get(Number(r.date.slice(0, 4))) ?? 0) + value(r))
    const full = [...perYear.entries()].filter(([y]) => y < year && y >= year - jahre).sort((a, b) => a[0] - b[0])
    const growth = (n: number) => {
      const end = perYear.get(year - 1)
      const start = perYear.get(year - 1 - n)
      return end && start ? { prozent_pro_jahr: round(((end / start) ** (1 / n) - 1) * 100, 1), von_jahr: year - 1 - n, bis_jahr: year - 1 } : null
    }
    let streak = 0
    for (let y = year - 1; perYear.get(y) && perYear.get(y - 1) && perYear.get(y)! > perYear.get(y - 1)! * 1.0001; y--) streak++
    const q = quotes.get(symbol)
    const price = q ? (q.currency === 'GBX' || q.currency === 'GBp' ? q.price / 100 : q.price) : null
    const id = ctx.nextBlockId()
    const blocks: AiBlock[] = full.length > 1 ? [{
      id, type: 'saeulen', titel: `${symbol}: Dividende je Aktie`, einheit: profile[0]?.currency ?? '', nachkommastellen: 2,
      kategorien: full.map(([y]) => String(y)), serien: [{ name: 'Dividende je Aktie', werte: full.map(([, v]) => round(v, 4)) }],
    }] : []
    return {
      data: {
        symbol, waehrung: profile[0]?.currency ?? null,
        letzte_12_monate_je_aktie: round(ttm, 4),
        rendite_prozent: price ? round((ttm / price) * 100, 2) : null,
        ausschuettungsquote_vom_gewinn_letzte_12_monate_prozent: round((finite(ratios[0]?.payoutRatioTTM) ?? NaN) * 100, 1),
        wachstum: { drei_jahre: growth(3), fuenf_jahre: growth(5), zehn_jahre: growth(10) },
        steigerungen_in_folge_jahre: streak,
        je_jahr: Object.fromEntries(full.map(([y, v]) => [y, round(v, 4)])),
        letzte_zahlungen: past.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(r => ({ ex_tag: r.date, betrag: round(value(r), 4), zahltag: r.paymentDate || null })),
        naechster_ex_tag: rows.filter(r => r.date > today).sort((a, b) => a.date.localeCompare(b.date)).map(r => ({ ex_tag: r.date, betrag: round(value(r), 4), zahltag: r.paymentDate || null }))[0] ?? null,
        hinweis: 'Beträge um Splits bereinigt, vor Steuern. Laufendes Jahr fehlt in je_jahr.',
        ...(blocks[0] ? { grafik: id } : {}),
      },
      blocks,
      sources: [{ label: `Dividenden ${symbol}`, stand: germanDate(today) }],
    }
  },
})

export const vergleich = defineTool({
  name: 'vergleich',
  description: 'Stellt 2 bis 5 Aktien nebeneinander: Börsenwert, KGV, Umsatzwachstum, Margen, Kapitalrendite, Verschuldung, Dividendenrendite, Kursentwicklung. Für "X oder Y"-Fragen und Branchenvergleiche.',
  schema: z.object({ symbole: z.array(symbolSchema).min(2).max(5) }),
  inputSchema: { type: 'object', properties: { symbole: { type: 'array', items: SYMBOL_PROP, minItems: 2, maxItems: 5 } }, required: ['symbole'], additionalProperties: false },
  label: i => `Vergleichen: ${i.symbole.join(', ')}`,
  async run({ symbole }, ctx) {
    const today = berlinIsoDay(ctx.now)
    const from = isoDaysAgo(366, ctx.now)
    const quotes = await getQuotes(symbole)
    const rows = await Promise.all(symbole.map(async symbol => {
      const [km, ratios, growth, kgv, evEbitda, bars] = await Promise.all([
        fmpList(`/api/v3/key-metrics-ttm/${symbol}`, {}, { revalidate: 6 * 3600 }),
        fmpList(`/api/v3/ratios-ttm/${symbol}`, {}, { revalidate: 6 * 3600 }),
        fmpList(`/api/v3/financial-growth/${symbol}`, { limit: 1 }, { revalidate: 6 * 3600 }),
        getValuationSeries(symbol, 'kgv', isoDaysAgo(14, ctx.now), today).catch(() => null),
        getValuationSeries(symbol, 'ev_ebitda', isoDaysAgo(14, ctx.now), today).catch(() => null),
        getDailyHistory(symbol, from, today),
      ])
      const q = quotes.get(symbol)
      const r = ratios[0] ?? {}
      const pct = (v: unknown) => { const n = finite(v); return n == null ? null : round(n * 100, 1) }
      return {
        symbol, name: q?.name ?? symbol, kurs: round(q?.price, 2), waehrung: q?.currency ?? null,
        boersenwert_mrd: round((finite(q?.raw?.marketCap) ?? NaN) / 1e9, 1),
        kgv: round(kgv?.points[kgv.points.length - 1]?.[1], 1), ev_ebitda: round(evEbitda?.points[evEbitda.points.length - 1]?.[1], 1),
        umsatzwachstum_letztes_geschaeftsjahr_prozent: pct(growth[0]?.revenueGrowth), gewinnwachstum_letztes_geschaeftsjahr_prozent: pct(growth[0]?.epsdilutedGrowth), letztes_geschaeftsjahr_bis: growth[0]?.date ?? null,
        bruttomarge_prozent: pct(r.grossProfitMarginTTM), operative_marge_prozent: pct(r.operatingProfitMarginTTM), nettomarge_prozent: pct(r.netProfitMarginTTM),
        eigenkapitalrendite_prozent: pct(r.returnOnEquityTTM), kapitalrendite_roic_prozent: pct(km[0]?.roicTTM),
        nettoschulden_zu_ebitda: round(finite(km[0]?.netDebtToEBITDATTM), 2), dividendenrendite_prozent: round(finite(r.dividendYielPercentageTTM), 2),
        kurs_ein_jahr_prozent: bars.length > 1 ? round((bars[bars.length - 1].close / bars[0].close - 1) * 100, 1) : null,
      }
    }))
    const found = rows.filter(r => r.kurs != null)
    if (found.length < 2) throw new ToolError('Für mindestens zwei der Aktien fehlen Daten.')
    const num = (v: number | null, d = 1) => (v == null ? 'k. A.' : v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }))
    const id = ctx.nextBlockId()
    const line = (label: string, get: (r: (typeof found)[number]) => string) => [label, ...found.map(get)]
    return {
      data: { werte: found, ohne_daten: symbole.filter(s => !found.some(f => f.symbol === s)), grafik: id, hinweis: 'Wachstum: letztes abgeschlossenes Geschäftsjahr. KGV, Margen und Renditen: letzte zwölf Monate. Börsenwert in der Notierungswährung.' },
      blocks: [{
        id, type: 'tabelle', titel: 'Vergleich', spalten: ['', ...found.map(r => r.symbol)],
        zeilen: [
          line('Börsenwert (Mrd.)', r => `${num(r.boersenwert_mrd)} ${r.waehrung ?? ''}`), line('KGV', r => num(r.kgv)), line('EV/EBITDA', r => num(r.ev_ebitda)),
          line('Umsatzwachstum (Geschäftsjahr)', r => `${num(r.umsatzwachstum_letztes_geschaeftsjahr_prozent)} %`), line('Operative Marge', r => `${num(r.operative_marge_prozent)} %`),
          line('Kapitalrendite (ROIC)', r => `${num(r.kapitalrendite_roic_prozent)} %`), line('Nettoschulden/EBITDA', r => num(r.nettoschulden_zu_ebitda)),
          line('Dividendenrendite', r => `${num(r.dividendenrendite_prozent)} %`), line('Kurs, ein Jahr', r => `${num(r.kurs_ein_jahr_prozent)} %`),
        ],
      }],
      sources: [{ label: 'Kennzahlen der letzten zwölf Monate', stand: germanDate(today) }],
    }
  },
})

export const unternehmensprofil = defineTool({
  name: 'unternehmensprofil',
  description: 'Was eine Firma macht: Beschreibung, Branche, Land, Chef, Mitarbeiter, Umsatz nach Sparten und Regionen.',
  schema: z.object({ symbol: symbolSchema }),
  inputSchema: { type: 'object', properties: { symbol: SYMBOL_PROP }, required: ['symbol'], additionalProperties: false },
  label: i => `Profil von ${i.symbol} laden`,
  async run({ symbol }) {
    const seg = (kind: string) => fmpList(`/api/v4/revenue-${kind}-segmentation`, { symbol, structure: 'flat', period: 'annual' }, { revalidate: 86400 })
    const [profile, product, geo, income] = await Promise.all([
      fmpList(`/api/v3/profile/${symbol}`, {}, { revalidate: 86400 }), seg('product'), seg('geographic'),
      fmpList(`/api/v3/income-statement/${symbol}`, { period: 'annual', limit: 1 }, { revalidate: 86400 }),
    ])
    const p = profile[0]
    if (!p) throw new ToolError(`Kein Profil zu ${symbol} gefunden.`)
    const segments = (rows: any[]) => rows.slice(0, 2).flatMap(row => Object.entries(row ?? {}).map(([bis, werte]) => {
      const entries = Object.entries(werte as Record<string, number>).filter(([, v]) => Number.isFinite(v) && v > 0)
      const sum = entries.reduce((s, [, v]) => s + v, 0)
      return { geschaeftsjahr_bis: bis, anteile: entries.sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, v]) => ({ name, umsatz_mio: round(v / 1e6, 0), anteil_prozent: round((v / sum) * 100, 1) })) }
    }))
    return {
      data: {
        symbol, name: p.companyName, branche: p.industry, sektor: p.sector, land: p.country, chef: p.ceo, mitarbeiter: finite(p.fullTimeEmployees), boersengang: p.ipoDate || null,
        beschreibung_englisch: String(p.description ?? '').slice(0, 1400), boersenwert: finite(p.mktCap), waehrung: p.currency,
        berichtswaehrung: income[0]?.reportedCurrency ?? null, umsatz_nach_sparten: segments(product), umsatz_nach_regionen: segments(geo),
      },
      sources: [{ label: `Firmenprofil ${p.companyName}` }],
    }
  },
})
