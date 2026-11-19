// src/lib/pricing.ts
// Angezeigte Premium-Preise — eine Quelle für Preisseite und Startseite.
// Die tatsächlich abgerechneten Beträge kommen aus den Stripe-Preisen.

export const PREMIUM_MONTHLY_EUR = 9
export const PREMIUM_YEARLY_EUR = 79
export const PREMIUM_TRIAL_DAYS = 14

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
