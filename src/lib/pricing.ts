// src/lib/pricing.ts
// Angezeigte Premium-Preise — eine Quelle für Preisseite, Startseite und Checkout.
// Die tatsächlich abgerechneten Beträge kommen aus den Stripe-Preisen; welcher
// Stripe-Preis gerade gilt, entscheidet der Checkout serverseitig über getPriceKey().

export const PREMIUM_TRIAL_DAYS = 14

// Preise bis einschließlich 31.12.2026
const MONTHLY_EUR_2026 = 9
const YEARLY_EUR_2026 = 79

// Neue Preise für Neukunden ab 1.1.2027. Laufende Abos behalten ihren Preis:
// Stripe lässt bestehende Abos auf dem Preis, mit dem sie abgeschlossen wurden.
export const PRICE_CHANGE_AT = new Date('2027-01-01T00:00:00+01:00')
const MONTHLY_EUR_2027 = 12.99
const YEARLY_EUR_2027 = 119

// Black Friday 2026: Gründerpreis fürs Jahresabo. Bleibt dauerhaft, solange das
// Abo läuft (eigener Stripe-Preis, der nicht mehr geändert wird).
export const FOUNDER_PROMO_START = new Date('2026-11-27T00:00:00+01:00')
export const FOUNDER_PROMO_END = new Date('2026-11-30T23:59:59+01:00')
export const FOUNDER_YEARLY_EUR = 69

export type PlanInterval = 'monthly' | 'yearly'

// Schlüssel der Stripe-Preise; die Zuordnung zu Env-Variablen steht in der Checkout-Route.
export type PriceKey = 'monthly' | 'yearly' | 'yearly_founder' | 'monthly_2027' | 'yearly_2027'

export function isFounderPromoActive(now: Date = new Date()): boolean {
  return now >= FOUNDER_PROMO_START && now <= FOUNDER_PROMO_END
}

export function isFounderPromoUpcoming(now: Date = new Date()): boolean {
  return now < FOUNDER_PROMO_START
}

export function isNewPricing(now: Date = new Date()): boolean {
  return now >= PRICE_CHANGE_AT
}

export interface Pricing {
  /** Monatspreis für Neukunden */
  monthly: number
  /** Regulärer Jahrespreis ohne Aktion */
  yearlyRegular: number
  /** Jahrespreis, den Neukunden gerade zahlen (während Black Friday der Gründerpreis) */
  yearly: number
  founderPromoActive: boolean
  founderPromoUpcoming: boolean
  /** Die Preiserhöhung zum 1.1.2027 steht noch bevor */
  priceIncreaseUpcoming: boolean
  /** Preise für Neukunden ab 1.1.2027 */
  upcoming: { monthly: number; yearly: number }
}

export function getPricing(now: Date = new Date()): Pricing {
  const newPricing = isNewPricing(now)
  const founderActive = isFounderPromoActive(now)
  const monthly = newPricing ? MONTHLY_EUR_2027 : MONTHLY_EUR_2026
  const yearlyRegular = newPricing ? YEARLY_EUR_2027 : YEARLY_EUR_2026

  return {
    monthly,
    yearlyRegular,
    yearly: founderActive ? FOUNDER_YEARLY_EUR : yearlyRegular,
    founderPromoActive: founderActive,
    founderPromoUpcoming: isFounderPromoUpcoming(now),
    priceIncreaseUpcoming: !newPricing,
    upcoming: { monthly: MONTHLY_EUR_2027, yearly: YEARLY_EUR_2027 },
  }
}

// Welcher Stripe-Preis für einen Checkout gilt. Wird nur serverseitig genutzt,
// damit die Uhrzeit des Browsers keinen Einfluss auf den abgerechneten Preis hat.
export function getPriceKey(plan: PlanInterval, now: Date = new Date()): PriceKey {
  if (plan === 'yearly' && isFounderPromoActive(now)) return 'yearly_founder'
  if (isNewPricing(now)) return plan === 'yearly' ? 'yearly_2027' : 'monthly_2027'
  return plan
}

// 9 → "9", 12.99 → "12,99", 79 / 12 → "6,58"
export function formatEur(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface PlanFeature {
  name: string
  included: boolean
  highlight?: boolean
}

// Leistungsumfang je Plan — angezeigt auf Preisseite und Startseite.
export const PLAN_FEATURES: Record<'free' | 'premium', PlanFeature[]> = {
  free: [
    { name: 'Kennzahlen & Charts (5 Jahre Historie)', included: true },
    { name: 'Bilanz, Cashflow & GuV bis 5 Jahre', included: true },
    { name: 'Superinvestor-Portfolios aller Investoren', included: true },
    { name: 'Kongress-Aktien (Politiker-Trades)', included: true },
    { name: 'Neueste Quartalszahlen', included: true },
    { name: 'Watchlist (bis zu 5 Aktien)', included: true },
    { name: 'Portfolio-Tracking inkl. Durchblick-Kurzhinweise', included: true },
    { name: 'Durchblick: ETFs in Einzelaktien zerlegt', included: false },
    { name: 'Risiko-Kennzahlen (Sharpe, Max Drawdown …)', included: false },
    { name: 'KI-Zusammenfassung Quartalszahlen', included: false },
    { name: 'Vollständige Historie 20+ Jahre', included: false },
    { name: 'Alerts & E-Mail-Benachrichtigungen', included: false },
    { name: 'Dividenden-Kalender & -Übersicht', included: false },
    { name: 'Anpassbare Charts & Presets', included: false },
  ],
  premium: [
    { name: 'Alle Free Features', included: true },
    { name: 'Durchblick: ETF-Zerlegung, Überschneidungen & echtes Exposure', included: true, highlight: true },
    { name: 'Risiko-Kennzahlen: Sharpe, Sortino, Max Drawdown & Beta', included: true, highlight: true },
    { name: 'Superinvestor-Abgleich mit deinem Depot', included: true },
    { name: 'KI-Portfolio-Analyse & KI-Zusammenfassung der Quartalszahlen', included: true, highlight: true },
    { name: 'Vollständige Historie 20+ Jahre', included: true },
    { name: 'Anpassbare Charts & Presets speichern', included: true },
    { name: 'Alerts bei Kursrückgängen & neuen Filings', included: true },
    { name: 'Dividenden-Kalender & wöchentliche Übersicht per Mail', included: true },
    { name: 'Unbegrenzte Watchlist', included: true },
    { name: 'Priority E-Mail Support', included: true },
  ]
}
