// src/lib/ai/data/earningsQuality.ts
// Hinweis der KI auf Sondereinflüsse im Gewinn. Die Prüfung selbst liegt in
// lib/earningsQuality, dieselbe wie auf den Aktienseiten.

import { adjustedPe, earningsQuality, type EarningsQuality } from '@/lib/earningsQuality'
import { round } from './fmp'

export { earningsQuality }
export type { EarningsQuality }

/** Hinweis für die Antwort, mit überschlägigem KGV ohne den Einfluss, wo er belastbar ist */
export function qualityNote(q: EarningsQuality, pe: number | null = null) {
  const positive = q.amount > 0
  const adjusted = adjustedPe(q, pe)
  return {
    betrag_letzte_12_monate_mrd: round(q.amount / 1e9, 1), waehrung: q.currency, anteil_am_vorsteuergewinn_prozent: round(q.sharePercent, 0),
    groesster_posten: { zeitraum: q.largest.span === 'half' ? 'Halbjahr' : 'Quartal', bis: q.largest.until, mrd: round(q.largest.amount / 1e9, 1) },
    ...(adjusted != null ? { kgv_ohne_diesen_einfluss_ueberschlaegig: round(adjusted, 1) } : {}),
    hinweis: positive
      ? 'Der Gewinn enthält hohe Erträge außerhalb des laufenden Geschäfts (meist Bewertungsgewinne auf Beteiligungen). Sage das spätestens im zweiten Satz und nenne das KGV ohne diesen Einfluss daneben. "Günstig" oder der Abstand zum Durchschnitt nie ohne diese Einschränkung, nie allein in der ersten Zeile. Verzerrt sind auch Nettomarge, Eigenkapitalrendite, Ausschüttungsquote und Nettoschulden zu EBITDA. Nicht verzerrt: operative Marge, EV/EBITDA, EV/EBIT, KUV, Cashflow.'
      : 'Der Gewinn ist durch hohe Belastungen außerhalb des laufenden Geschäfts gedrückt (zum Beispiel Abschreibungen, Rechtsstreitigkeiten, Verluste auf Beteiligungen). Sage das spätestens im zweiten Satz. "Teuer" nie ohne diese Einschränkung.',
  }
}
