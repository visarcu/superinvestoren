// src/lib/economic/economicEvents.ts
// Kuratierte Liste der wichtigsten Wirtschaftstermine
// Diese Termine wiederholen sich jährlich – wir pflegen die konkreten Daten.
// Langfristig: FRED API für automatische Updates.

export interface EconomicEvent {
  id: string
  name: string
  nameDE: string
  country: 'US' | 'EU' | 'DE' | 'UK' | 'CN' | 'JP'
  category: 'central-bank' | 'employment' | 'inflation' | 'gdp' | 'retail' | 'housing' | 'manufacturing' | 'trade'
  impact: 'high' | 'medium' | 'low'
  frequency: 'monthly' | 'quarterly' | 'annual' | '8x-year' // Fed meets 8x/year
  description: string
}

// Die wichtigsten wiederkehrenden Wirtschaftsereignisse
export const ECONOMIC_EVENTS: EconomicEvent[] = [
  // ── US Federal Reserve ──────────────────────────────────────────────────
  { id: 'fed-rate', name: 'FOMC Interest Rate Decision', nameDE: 'Fed Zinsentscheid', country: 'US', category: 'central-bank', impact: 'high', frequency: '8x-year', description: 'Federal Reserve Leitzins-Entscheidung' },
  { id: 'fed-minutes', name: 'FOMC Minutes', nameDE: 'Fed Protokoll', country: 'US', category: 'central-bank', impact: 'high', frequency: '8x-year', description: 'Protokoll der letzten Fed-Sitzung' },
  { id: 'fed-speech', name: 'Fed Chair Speech', nameDE: 'Fed-Vorsitzender Rede', country: 'US', category: 'central-bank', impact: 'high', frequency: 'monthly', description: 'Rede des Fed-Vorsitzenden' },

  // ── US Employment ───────────────────────────────────────────────────────
  { id: 'nfp', name: 'Non-Farm Payrolls', nameDE: 'US Arbeitsmarktbericht', country: 'US', category: 'employment', impact: 'high', frequency: 'monthly', description: 'Monatlicher US Arbeitsmarktbericht (erster Freitag)' },
  { id: 'unemployment', name: 'Unemployment Rate', nameDE: 'Arbeitslosenquote', country: 'US', category: 'employment', impact: 'high', frequency: 'monthly', description: 'US Arbeitslosenquote' },
  { id: 'jobless-claims', name: 'Initial Jobless Claims', nameDE: 'Erstanträge Arbeitslosenhilfe', country: 'US', category: 'employment', impact: 'medium', frequency: 'monthly', description: 'Wöchentliche Erstanträge auf Arbeitslosenhilfe' },

  // ── US Inflation ────────────────────────────────────────────────────────
  { id: 'cpi', name: 'CPI (Consumer Price Index)', nameDE: 'Verbraucherpreisindex (CPI)', country: 'US', category: 'inflation', impact: 'high', frequency: 'monthly', description: 'US Verbraucherpreisindex – wichtigster Inflationsindikator' },
  { id: 'pce', name: 'PCE Price Index', nameDE: 'PCE Preisindex', country: 'US', category: 'inflation', impact: 'high', frequency: 'monthly', description: 'Fed-bevorzugter Inflationsindikator' },
  { id: 'ppi', name: 'PPI (Producer Price Index)', nameDE: 'Erzeugerpreisindex (PPI)', country: 'US', category: 'inflation', impact: 'medium', frequency: 'monthly', description: 'US Erzeugerpreisindex' },

  // ── US GDP ──────────────────────────────────────────────────────────────
  { id: 'gdp', name: 'GDP Growth Rate', nameDE: 'BIP Wachstumsrate', country: 'US', category: 'gdp', impact: 'high', frequency: 'quarterly', description: 'US Bruttoinlandsprodukt (Quartalsbericht)' },

  // ── US Other ────────────────────────────────────────────────────────────
  { id: 'retail-sales', name: 'Retail Sales', nameDE: 'Einzelhandelsumsätze', country: 'US', category: 'retail', impact: 'medium', frequency: 'monthly', description: 'US Einzelhandelsumsätze' },
  { id: 'ism-mfg', name: 'ISM Manufacturing PMI', nameDE: 'ISM Einkaufsmanagerindex', country: 'US', category: 'manufacturing', impact: 'medium', frequency: 'monthly', description: 'ISM Einkaufsmanagerindex Produktion' },

  // ── EZB / Eurozone ─────────────────────────────────────────────────────
  { id: 'ecb-rate', name: 'ECB Interest Rate Decision', nameDE: 'EZB Zinsentscheid', country: 'EU', category: 'central-bank', impact: 'high', frequency: '8x-year', description: 'EZB Leitzins-Entscheidung' },
  { id: 'eu-cpi', name: 'Eurozone CPI', nameDE: 'Eurozone Inflation (HVPI)', country: 'EU', category: 'inflation', impact: 'high', frequency: 'monthly', description: 'Harmonisierter Verbraucherpreisindex Eurozone' },
  { id: 'eu-gdp', name: 'Eurozone GDP', nameDE: 'Eurozone BIP', country: 'EU', category: 'gdp', impact: 'high', frequency: 'quarterly', description: 'Eurozone Bruttoinlandsprodukt' },

  // ── Deutschland ─────────────────────────────────────────────────────────
  { id: 'ifo', name: 'Ifo Business Climate', nameDE: 'Ifo Geschäftsklimaindex', country: 'DE', category: 'manufacturing', impact: 'medium', frequency: 'monthly', description: 'Ifo Geschäftsklimaindex Deutschland' },
  { id: 'zew', name: 'ZEW Economic Sentiment', nameDE: 'ZEW Konjunkturerwartungen', country: 'DE', category: 'manufacturing', impact: 'medium', frequency: 'monthly', description: 'ZEW Konjunkturerwartungen für Deutschland' },
  { id: 'de-cpi', name: 'German CPI', nameDE: 'Deutsche Inflation (VPI)', country: 'DE', category: 'inflation', impact: 'medium', frequency: 'monthly', description: 'Deutscher Verbraucherpreisindex' },
]

// Upcoming scheduled dates (manuell gepflegt, kann später automatisiert werden)
export interface ScheduledEconomicEvent {
  eventId: string
  date: string        // YYYY-MM-DD
  time?: string       // HH:MM (UTC)
  actual?: number
  forecast?: number
  previous?: number
}

// Beispiel-Daten für April 2026 (würde regelmäßig aktualisiert)
export const SCHEDULED_EVENTS_2026: ScheduledEconomicEvent[] = [
  // April 2026
  { eventId: 'cpi', date: '2026-04-10', time: '12:30' },
  { eventId: 'ppi', date: '2026-04-11', time: '12:30' },
  { eventId: 'retail-sales', date: '2026-04-15', time: '12:30' },
  { eventId: 'ecb-rate', date: '2026-04-16', time: '12:15' },
  { eventId: 'jobless-claims', date: '2026-04-17', time: '12:30' },
  { eventId: 'ifo', date: '2026-04-24', time: '08:00' },
  { eventId: 'gdp', date: '2026-04-29', time: '12:30' },
  { eventId: 'pce', date: '2026-04-30', time: '12:30' },
  // Mai 2026
  { eventId: 'nfp', date: '2026-05-01', time: '12:30' },
  { eventId: 'fed-rate', date: '2026-05-06', time: '18:00' },
  { eventId: 'cpi', date: '2026-05-12', time: '12:30' },
  { eventId: 'eu-cpi', date: '2026-05-15' },
  { eventId: 'zew', date: '2026-05-19', time: '09:00' },
  { eventId: 'fed-minutes', date: '2026-05-20', time: '18:00' },
  { eventId: 'ifo', date: '2026-05-22', time: '08:00' },
  { eventId: 'gdp', date: '2026-05-28', time: '12:30' },
  { eventId: 'pce', date: '2026-05-29', time: '12:30' },
]
