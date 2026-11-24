// src/lib/ai/data/earningsQuality.ts
// Wie viel vom Gewinn der letzten zwölf Monate nicht aus dem Geschäft stammt.
// Alphabet Q4 2026: 45 % des Vorsteuergewinns sind Bewertungsgewinne auf
// Beteiligungen. Das KGV von 14,5 sah damit halb so teuer aus wie im Schnitt,
// ohne diese Gewinne liegt es bei rund 26.

import { finite, fmpList, round } from './fmp'

export interface EarningsQuality {
  /** Erträge (+) oder Belastungen (−) außerhalb des Geschäfts, ohne Zinsen, in Berichtswährung */
  amount: number
  /** Anteil am Vorsteuergewinn in Prozent */
  sharePercent: number
  currency: string
  /** Faktor vom gemeldeten zum bereinigten KGV, null = ohne die Erträge kein Gewinn */
  peFactor: number | null
  /** Quartal mit dem größten Betrag */
  largest: { until: string; amount: number }
}

/** Darunter ist es üblicher Kleinkram */
const MIN_SHARE = 20

export async function earningsQuality(symbol: string): Promise<EarningsQuality | null> {
  const rows = await fmpList<any>(`/api/v3/income-statement/${symbol}`, { period: 'quarter', limit: 4 }, { revalidate: 6 * 3600 })
  if (rows.length < 4) return null
  const total = (pick: (r: any) => number | null) => rows.reduce((s, r) => s + (pick(r) ?? 0), 0)
  const revenue = total(r => finite(r.revenue))
  const before = total(r => finite(r.incomeBeforeTax))
  const net = total(r => finite(r.netIncome))
  const interestIncome = total(r => finite(r.interestIncome))
  const operating = total(r => finite(r.operatingIncome))
  if (!(before > 0) || !(net > 0) || !(revenue > 0) || operating === 0) return null
  // Banken und Versicherer: Zinsen gehören zum Geschäft, die Zerlegung passt nicht
  if (interestIncome > 0.2 * revenue) return null
  // Immobilien und andere stark Fremdfinanzierte: Der Anbieter ordnet die Posten dort zu ungenau zu
  if (total(r => finite(r.interestExpense)) > 0.4 * operating) return null
  const outside = (r: any) => (finite(r.incomeBeforeTax) ?? 0) - (finite(r.operatingIncome) ?? 0) - ((finite(r.interestIncome) ?? 0) - (finite(r.interestExpense) ?? 0))
  const amount = rows.reduce((s, r) => s + outside(r), 0)
  const sharePercent = (amount / before) * 100
  if (Math.abs(sharePercent) < MIN_SHARE) return null
  const taxRate = Math.min(0.35, Math.max(0, total(r => finite(r.incomeTaxExpense)) / before))
  const adjusted = net - amount * (1 - taxRate)
  const largestRow = [...rows].sort((a, b) => Math.abs(outside(b)) - Math.abs(outside(a)))[0]
  return {
    amount, sharePercent, currency: rows[0].reportedCurrency ?? 'USD',
    peFactor: adjusted > 0 ? net / adjusted : null,
    largest: { until: largestRow.date, amount: outside(largestRow) },
  }
}

/** Hinweis für die Antwort, mit überschlägigem KGV ohne den Einfluss, wo er belastbar ist */
export function qualityNote(q: EarningsQuality, pe: number | null = null) {
  const positive = q.amount > 0
  const solid = q.peFactor != null && q.peFactor < 3 && q.peFactor > 0.4
  return {
    betrag_letzte_12_monate_mrd: round(q.amount / 1e9, 1), waehrung: q.currency, anteil_am_vorsteuergewinn_prozent: round(q.sharePercent, 0),
    groesstes_quartal: { bis: q.largest.until, mrd: round(q.largest.amount / 1e9, 1) },
    ...(pe != null && solid ? { kgv_ohne_diesen_einfluss_ueberschlaegig: round(pe * q.peFactor!, 1) } : {}),
    hinweis: positive
      ? 'Der Gewinn enthält hohe Erträge außerhalb des laufenden Geschäfts (meist Bewertungsgewinne auf Beteiligungen). Sage das spätestens im zweiten Satz und nenne das KGV ohne diesen Einfluss daneben. "Günstig" oder der Abstand zum Durchschnitt nie ohne diese Einschränkung, nie allein in der ersten Zeile. Verzerrt sind auch Nettomarge, Eigenkapitalrendite, Ausschüttungsquote und Nettoschulden zu EBITDA. Nicht verzerrt: operative Marge, EV/EBITDA, EV/EBIT, KUV, Cashflow.'
      : 'Der Gewinn ist durch hohe Belastungen außerhalb des laufenden Geschäfts gedrückt (zum Beispiel Abschreibungen, Rechtsstreitigkeiten, Verluste auf Beteiligungen). Sage das spätestens im zweiten Satz. "Teuer" nie ohne diese Einschränkung.',
  }
}
