// src/lib/earningsQualityRules.ts
// Reine Rechenregeln zu lib/earningsQuality (ohne Abruf, auch im Browser nutzbar).

import { formatCompactAmount, formatIsoDate } from '@/lib/displayFormat'

export interface IncomeRow {
  date: string
  currency: string
  revenue: number | null
  operatingIncome: number | null
  incomeBeforeTax: number | null
  incomeTax: number | null
  netIncome: number | null
  interestIncome: number | null
  interestExpense: number | null
}

export interface EarningsQuality {
  /** Erträge (+) oder Belastungen (−) außerhalb des Geschäfts, ohne Zinsen, in Berichtswährung */
  amount: number
  /** Anteil am Vorsteuergewinn in Prozent */
  sharePercent: number
  currency: string
  /** Faktor vom gemeldeten zum bereinigten KGV, null = ohne die Erträge kein Gewinn */
  peFactor: number | null
  /** KGV auf genau diesen Gewinn der letzten zwölf Monate; null = nicht geladen */
  trailingPe: number | null
  /** Berichtszeitraum mit dem größten Betrag */
  largest: { until: string; amount: number; span: 'quarter' | 'half' | 'year' }
}

/** Darunter ist es üblicher Kleinkram */
const MIN_SHARE = 20
/** Lag der Anteil in den drei Jahren davor darüber, passt die Zerlegung zur Firma nicht */
const MAX_PRIOR_SHARE = 75
/** Ab diesem Anteil in den Vorjahren bei durchgehend gleichem Vorzeichen: wiederkehrend */
const RECURRING_SHARE = 15

const DAY = 86_400_000

export function classifyEarnings(all: IncomeRow[]): EarningsQuality | null {
  if (all.length < 2) return null
  const newest = Date.parse(all[0].date)
  const gap = (newest - Date.parse(all[1].date)) / DAY
  // Halbjahresberichte (viele Europäer): zwei Zeilen sind ein Jahr, nicht vier
  const perYear = gap > 300 ? 1 : gap > 130 ? 2 : 4
  const rows = all.slice(0, perYear)
  const span = (newest - Date.parse(rows[rows.length - 1].date)) / DAY
  if (rows.length < perYear || !(span < 300)) return null
  const prior = all.slice(perYear, perYear * 4)

  const sum = (list: IncomeRow[], pick: (r: IncomeRow) => number | null) => list.reduce((s, r) => s + (pick(r) ?? 0), 0)
  const revenue = sum(rows, r => r.revenue)
  const before = sum(rows, r => r.incomeBeforeTax)
  const net = sum(rows, r => r.netIncome)
  const operating = sum(rows, r => r.operatingIncome)
  if (!(before > 0) || !(net > 0) || !(revenue > 0) || operating === 0) return null
  // Banken und Versicherer: Zinsen gehören zum Geschäft, die Zerlegung passt nicht
  if (sum(rows, r => r.interestIncome) > 0.2 * revenue) return null
  // Immobilien und andere stark Fremdfinanzierte: Der Anbieter ordnet die Posten dort zu ungenau zu
  if (sum(rows, r => r.interestExpense) > 0.4 * operating) return null

  // Fehlen die Zinsen in einem Bericht ganz, gilt der Schnitt der übrigen
  const netInterest = (r: IncomeRow) => (r.interestIncome ?? 0) - (r.interestExpense ?? 0)
  const known = all.filter(r => (r.interestIncome ?? 0) !== 0 || (r.interestExpense ?? 0) !== 0)
  const typical = known.length > 0 ? sum(known, netInterest) / known.length : 0
  const interest = (r: IncomeRow) => ((r.interestIncome ?? 0) === 0 && (r.interestExpense ?? 0) === 0 ? typical : netInterest(r))
  const outside = (r: IncomeRow) => (r.incomeBeforeTax ?? 0) - (r.operatingIncome ?? 0) - interest(r)

  const amount = sum(rows, outside)
  const sharePercent = (amount / before) * 100
  if (Math.abs(sharePercent) < MIN_SHARE) return null

  const largestRow = [...rows].sort((a, b) => Math.abs(outside(b)) - Math.abs(outside(a)))[0]
  const concentrated = Math.abs(outside(largestRow)) >= 0.5 * Math.abs(amount)
  if (prior.length >= perYear) {
    const priorBefore = sum(prior, r => r.incomeBeforeTax)
    const priorShare = priorBefore === 0 ? Infinity : (sum(prior, outside) / priorBefore) * 100
    if (Math.abs(priorShare) > MAX_PRIOR_SHARE) return null
    const sameSign = prior.filter(r => Math.sign(outside(r)) === Math.sign(amount)).length / prior.length
    if (sameSign >= 0.8 && Math.abs(priorShare) >= RECURRING_SHARE) return null
    // Schwankt es von jeher stark (Berkshire), zählt auch eine gleichmäßige Verteilung im Jahr
    const swings = prior.reduce((s, r) => s + Math.abs(outside(r)), 0) / prior.reduce((s, r) => s + Math.abs(r.incomeBeforeTax ?? 0), 0)
    if (!concentrated && !(sameSign < 0.8 && swings >= 0.2)) return null
  } else if (!concentrated) {
    return null
  }

  const taxRate = Math.min(0.35, Math.max(0, sum(rows, r => r.incomeTax) / before))
  const adjusted = net - amount * (1 - taxRate)
  return {
    amount,
    sharePercent,
    currency: rows[0].currency,
    peFactor: adjusted > 0 ? net / adjusted : null,
    trailingPe: null,
    largest: { until: largestRow.date, amount: outside(largestRow), span: perYear === 4 ? 'quarter' : perYear === 2 ? 'half' : 'year' },
  }
}

/** Nur dann eine bereinigte Zahl nennen: Das Restgeschäft trägt genug Gewinn für ein sinnvolles KGV */
export function isSolid(q: EarningsQuality): boolean {
  return q.peFactor != null && q.peFactor > 0.4 && q.peFactor < 3 && Math.abs(q.sharePercent) < 100
}

/** KGV ohne den Einfluss, null = nicht belastbar. `pe` muss auf demselben Gewinn beruhen. */
export function adjustedPe(q: EarningsQuality, pe: number | null | undefined): number | null {
  return pe != null && pe > 0 && isSolid(q) ? pe * q.peFactor! : null
}

/**
 * Beruht das angezeigte KGV auf diesem Gewinn? Der Kursdienst rechnet bei manchen
 * Firmen schon mit bereinigten Gewinnen (Johnson & Johnson 25,8 statt 41,9) oder mit
 * veralteten. Dort erklärt der Hinweis nichts und eine Bereinigung zählte doppelt.
 */
export function affectsPe(q: EarningsQuality, pe: number | null | undefined): pe is number {
  return pe != null && pe > 0 && q.trailingPe != null && Math.abs(pe / q.trailingPe - 1) <= 0.25
}

/** Bereinigtes KGV neben einem angezeigten KGV, null = keine Zeile zeigen */
export function cleanPeFor(q: EarningsQuality | null, pe: number | null | undefined): number | null {
  return q && affectsPe(q, pe) ? adjustedPe(q, q.trailingPe) : null
}

export interface EarningsQualityText {
  /** Bezeichnung der bereinigten Zahl */
  label: string
  /** Eine Zeile unter der Kennzahl */
  short: string
  /** Erklärung, ganze Sätze */
  long: string
}

const SPAN_LABEL = { quarter: 'Quartal', half: 'Halbjahr', year: 'Geschäftsjahr' } as const

export function describeEarnings(q: EarningsQuality): EarningsQualityText {
  const positive = q.amount > 0
  const amount = formatCompactAmount(Math.abs(q.amount), q.currency)
  const largest = `Größter Posten: ${formatCompactAmount(Math.abs(q.largest.amount), q.currency)} im ${SPAN_LABEL[q.largest.span]} bis ${formatIsoDate(q.largest.until)}.`
  if (positive) {
    const share = q.sharePercent >= 100 ? 'Mehr als der gesamte Vorsteuergewinn' : `${Math.round(q.sharePercent)} % des Vorsteuergewinns`
    const verb = q.sharePercent >= 100 ? 'stammt' : 'stammen'
    return {
      label: 'KGV ohne Sondererträge',
      short: `${share} ${verb} nicht aus dem laufenden Geschäft.`,
      long: `${share} der letzten zwölf Monate (${amount}) ${verb} nicht aus dem laufenden Geschäft, sondern zum Beispiel aus Bewertungsgewinnen auf Beteiligungen oder aus Verkäufen. ${largest} ${
        isSolid(q) ? 'Das gemeldete KGV wirkt dadurch niedriger, als es ohne sie wäre.' : 'Ohne diese Erträge bliebe kaum Gewinn, das gemeldete KGV sagt deshalb wenig aus.'
      }`,
    }
  }
  return {
    label: 'KGV ohne Sonderbelastungen',
    short: `${amount} Belastungen außerhalb des laufenden Geschäfts drücken den Gewinn.`,
    long: `Belastungen außerhalb des laufenden Geschäfts haben den Vorsteuergewinn der letzten zwölf Monate um ${amount} gedrückt, zum Beispiel Abschreibungen, Rechtsstreitigkeiten oder Verluste auf Beteiligungen. ${largest} ${
      isSolid(q) ? 'Das gemeldete KGV wirkt dadurch höher, als es ohne sie wäre.' : 'Das gemeldete KGV sagt deshalb wenig aus.'
    }`,
  }
}
