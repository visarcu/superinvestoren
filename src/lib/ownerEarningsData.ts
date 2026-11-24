// src/lib/ownerEarningsData.ts
// Lädt Owner Earnings für Bewertungs-Tab, Finanzen-Tab und DCF-Rechner aus derselben Quelle.
//
// Alle Prüfungen sitzen hier, damit die drei Stellen nie verschiedene Zahlen zeigen:
//   - Banken, Versicherer und REITs: das Capex-Konzept greift nicht
//   - jüngster Abschluss zu alt: nicht mit dem heutigen Kurs verrechnen
//   - Währung: /api/financial-data rechnet ADRs (TSM, SONY, TM) in die Kurswährung um.
//     Passt die Währung trotzdem nicht zum Kurs, gibt es keine Rendite und keinen Wert je Aktie.

import {
  ownerEarningsFromFinancialData,
  ownerEarningsGrowth,
  ownerEarningsMultiples,
  type FinancialDataPayload,
  type OwnerEarningsYear,
} from '@/lib/ownerEarnings'

export interface OwnerEarningsData {
  status: 'ok'
  /** Alle Jahre der Historie, ältestes zuerst. ownerEarnings kann in einzelnen Jahren null sein. */
  years: OwnerEarningsYear[]
  /** Jüngstes Jahr mit schätzbaren Owner Earnings */
  latest: OwnerEarningsYear & { ownerEarnings: number; maintenanceCapex: number }
  currency: string
  /** Berichtswährung, falls umgerechnet wurde (z.B. TWD bei TSM), sonst null */
  convertedFrom: string | null
  /** null, wenn Kurs- und Abschlusswährung nicht sicher übereinstimmen */
  marketCap: number | null
  perShare: number | null
  growth: { rate: number; years: number } | null
  multiples: number[]
}

export interface OwnerEarningsUnavailable {
  status: 'unavailable'
  reason: 'sector' | 'data' | 'stale' | 'error'
  message: string
}

export type OwnerEarningsLoad = OwnerEarningsData | OwnerEarningsUnavailable

const EXCLUDED_INDUSTRIES = /\bbanks?\b|insurance|capital markets|mortgage|\breit\b/i

/** Älter als 18 Monate: ein Geschäftsjahr wurde übersprungen, die Zahl passt nicht mehr zum Kurs. */
const MAX_AGE_MS = 548 * 24 * 60 * 60 * 1000

const unavailable = (reason: OwnerEarningsUnavailable['reason'], message: string): OwnerEarningsUnavailable => ({
  status: 'unavailable',
  reason,
  message,
})

export async function loadOwnerEarnings(ticker: string): Promise<OwnerEarningsLoad> {
  const symbol = ticker.toUpperCase()
  try {
    const [dataRes, profileRes] = await Promise.all([
      fetch(`/api/financial-data/${symbol}?years=10&period=annual`),
      fetch(`/api/company-profile/${symbol}`),
    ])
    if (!dataRes.ok || !profileRes.ok) {
      return unavailable('error', 'Die Daten für Owner Earnings konnten gerade nicht geladen werden.')
    }
    const data: FinancialDataPayload = await dataRes.json()
    const profileJson = await profileRes.json()
    const profile = Array.isArray(profileJson) ? profileJson[0] : profileJson

    // Ohne Branche lässt sich eine Bank nicht ausschließen, dann lieber nichts zeigen
    if (!profile?.industry) {
      return unavailable('data', 'Für diese Aktie fehlt die Branche, Owner Earnings werden deshalb nicht geschätzt.')
    }
    if (EXCLUDED_INDUSTRIES.test(profile.industry)) {
      return unavailable(
        'sector',
        'Owner Earnings passen nicht zu Banken, Versicherern und REITs: Das Capex-Konzept greift dort nicht.'
      )
    }

    const years = ownerEarningsFromFinancialData(data)
    const latest = [...years].reverse().find(y => y.ownerEarnings !== null) as OwnerEarningsData['latest'] | undefined
    if (!latest || !data._currency?.currency) {
      return unavailable('data', 'Für diese Aktie fehlen Abschlussdaten, um Owner Earnings zu schätzen.')
    }
    if (!latest.date || Date.now() - new Date(latest.date).getTime() > MAX_AGE_MS) {
      return unavailable(
        'stale',
        `Der jüngste vollständige Abschluss ist von ${latest.period}. Das ist zu alt für eine Bewertung zum heutigen Kurs.`
      )
    }

    const currency = data._currency.currency
    const price = typeof profile.price === 'number' && profile.price > 0 ? profile.price : null
    const marketCap =
      profile.currency === currency && typeof profile.mktCap === 'number' && profile.mktCap > 0 ? profile.mktCap : null

    return {
      status: 'ok',
      years,
      latest,
      // Londoner Kurse laufen in Pence (GBp), Abschluss und Börsenwert aber in Pfund
      currency: currency === 'GBp' ? 'GBP' : currency,
      convertedFrom: data._currency.convertedFrom ?? null,
      marketCap,
      // Aktienzahl aus Börsenwert und Kurs: stimmt auch bei ADRs, Splits und mehreren Aktienklassen
      perShare: marketCap !== null && price !== null ? latest.ownerEarnings / (marketCap / price) : null,
      growth: ownerEarningsGrowth(years),
      multiples: ownerEarningsMultiples(years, data.keyMetrics),
    }
  } catch (error) {
    console.error('[OwnerEarnings] Laden fehlgeschlagen:', error)
    return unavailable('error', 'Die Daten für Owner Earnings konnten gerade nicht geladen werden.')
  }
}
