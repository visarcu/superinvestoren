// src/lib/economic/economicEvents.ts
// Wirtschaftskalender – Daten aus offiziellen Regierungsquellen
// Quellen:
// - Fed FOMC: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
// - BLS (CPI/NFP): https://www.bls.gov/schedule/
// - EZB: https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html
// - Ifo: https://www.ifo.de/en/survey/ifo-business-climate-index-germany

export interface EconomicEvent {
  id: string
  name: string
  nameDE: string
  country: 'US' | 'EU' | 'DE' | 'UK' | 'CN' | 'JP'
  category: 'central-bank' | 'employment' | 'inflation' | 'gdp' | 'retail' | 'housing' | 'manufacturing' | 'trade'
  impact: 'high' | 'medium' | 'low'
  description: string
}

export const ECONOMIC_EVENTS: EconomicEvent[] = [
  // US Federal Reserve
  { id: 'fed-rate', name: 'FOMC Interest Rate Decision', nameDE: 'Fed Zinsentscheid', country: 'US', category: 'central-bank', impact: 'high', description: 'Federal Reserve Leitzins-Entscheidung' },
  { id: 'fed-minutes', name: 'FOMC Minutes', nameDE: 'Fed Protokoll', country: 'US', category: 'central-bank', impact: 'high', description: 'Protokoll der letzten Fed-Sitzung' },
  // US Employment
  { id: 'nfp', name: 'Non-Farm Payrolls', nameDE: 'US Arbeitsmarktbericht', country: 'US', category: 'employment', impact: 'high', description: 'Monatlicher US Arbeitsmarktbericht' },
  { id: 'unemployment', name: 'Unemployment Rate', nameDE: 'US Arbeitslosenquote', country: 'US', category: 'employment', impact: 'high', description: 'US Arbeitslosenquote' },
  { id: 'jobless-claims', name: 'Initial Jobless Claims', nameDE: 'Erstanträge Arbeitslosenhilfe', country: 'US', category: 'employment', impact: 'medium', description: 'Wöchentliche Erstanträge' },
  // US Inflation
  { id: 'cpi', name: 'CPI (Consumer Price Index)', nameDE: 'Verbraucherpreisindex (CPI)', country: 'US', category: 'inflation', impact: 'high', description: 'US Verbraucherpreisindex' },
  { id: 'pce', name: 'PCE Price Index', nameDE: 'PCE Preisindex', country: 'US', category: 'inflation', impact: 'high', description: 'Fed-bevorzugter Inflationsindikator' },
  { id: 'ppi', name: 'PPI (Producer Price Index)', nameDE: 'Erzeugerpreisindex (PPI)', country: 'US', category: 'inflation', impact: 'medium', description: 'US Erzeugerpreisindex' },
  // US GDP
  { id: 'gdp', name: 'GDP Growth Rate', nameDE: 'BIP Wachstumsrate', country: 'US', category: 'gdp', impact: 'high', description: 'US Bruttoinlandsprodukt' },
  // US Other
  { id: 'retail-sales', name: 'Retail Sales', nameDE: 'Einzelhandelsumsätze', country: 'US', category: 'retail', impact: 'medium', description: 'US Einzelhandelsumsätze' },
  { id: 'ism-mfg', name: 'ISM Manufacturing PMI', nameDE: 'ISM Einkaufsmanagerindex', country: 'US', category: 'manufacturing', impact: 'medium', description: 'ISM Produktion' },
  // EZB
  { id: 'ecb-rate', name: 'ECB Interest Rate Decision', nameDE: 'EZB Zinsentscheid', country: 'EU', category: 'central-bank', impact: 'high', description: 'EZB Leitzins-Entscheidung' },
  { id: 'eu-cpi', name: 'Eurozone CPI', nameDE: 'Eurozone Inflation (HVPI)', country: 'EU', category: 'inflation', impact: 'high', description: 'Harmonisierter Verbraucherpreisindex' },
  { id: 'eu-gdp', name: 'Eurozone GDP', nameDE: 'Eurozone BIP', country: 'EU', category: 'gdp', impact: 'high', description: 'Eurozone Bruttoinlandsprodukt' },
  // Deutschland
  { id: 'ifo', name: 'Ifo Business Climate', nameDE: 'Ifo Geschäftsklimaindex', country: 'DE', category: 'manufacturing', impact: 'medium', description: 'Ifo Geschäftsklimaindex' },
  { id: 'zew', name: 'ZEW Economic Sentiment', nameDE: 'ZEW Konjunkturerwartungen', country: 'DE', category: 'manufacturing', impact: 'medium', description: 'ZEW Konjunkturerwartungen' },
  { id: 'de-cpi', name: 'German CPI', nameDE: 'Deutsche Inflation (VPI)', country: 'DE', category: 'inflation', impact: 'medium', description: 'Deutscher Verbraucherpreisindex' },
]

export interface ScheduledEconomicEvent {
  eventId: string
  date: string        // YYYY-MM-DD
  time?: string       // HH:MM (UTC)
  actual?: number
  forecast?: number
  previous?: number
}

// ─── 2026 Termine (aus offiziellen Quellen) ──────────────────────────────────
// Fed FOMC: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
// EZB: https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html
// Ifo: https://www.ifo.de/en/survey/ifo-business-climate-index-germany

export const SCHEDULED_EVENTS_2026: ScheduledEconomicEvent[] = [
  // ── April 2026 ────────────────────────────────────────────────────────
  { eventId: 'ifo', date: '2026-04-24', time: '08:30' },
  { eventId: 'gdp', date: '2026-04-29', time: '12:30' },
  { eventId: 'fed-rate', date: '2026-04-29', time: '18:00' },  // FOMC Apr 28-29
  { eventId: 'ecb-rate', date: '2026-04-30', time: '12:15' },  // EZB 30. April
  { eventId: 'pce', date: '2026-04-30', time: '12:30' },

  // ── Mai 2026 ──────────────────────────────────────────────────────────
  { eventId: 'nfp', date: '2026-05-01', time: '12:30' },
  { eventId: 'cpi', date: '2026-05-12', time: '12:30' },
  { eventId: 'ppi', date: '2026-05-13', time: '12:30' },
  { eventId: 'retail-sales', date: '2026-05-15', time: '12:30' },
  { eventId: 'ifo', date: '2026-05-22', time: '08:30' },
  { eventId: 'gdp', date: '2026-05-28', time: '12:30' },
  { eventId: 'pce', date: '2026-05-29', time: '12:30' },

  // ── Juni 2026 ─────────────────────────────────────────────────────────
  { eventId: 'nfp', date: '2026-06-05', time: '12:30' },
  { eventId: 'cpi', date: '2026-06-10', time: '12:30' },
  { eventId: 'ecb-rate', date: '2026-06-11', time: '12:15' },  // EZB 11. Juni
  { eventId: 'fed-rate', date: '2026-06-17', time: '18:00' },  // FOMC Jun 16-17
  { eventId: 'ifo', date: '2026-06-24', time: '08:30' },
  { eventId: 'pce', date: '2026-06-26', time: '12:30' },

  // ── Juli 2026 ─────────────────────────────────────────────────────────
  { eventId: 'nfp', date: '2026-07-02', time: '12:30' },
  { eventId: 'cpi', date: '2026-07-14', time: '12:30' },
  { eventId: 'ecb-rate', date: '2026-07-23', time: '12:15' },  // EZB 23. Juli
  { eventId: 'ifo', date: '2026-07-27', time: '08:30' },
  { eventId: 'fed-rate', date: '2026-07-29', time: '18:00' },  // FOMC Jul 28-29
  { eventId: 'gdp', date: '2026-07-30', time: '12:30' },
  { eventId: 'pce', date: '2026-07-31', time: '12:30' },

  // ── August 2026 ───────────────────────────────────────────────────────
  { eventId: 'nfp', date: '2026-08-07', time: '12:30' },
  { eventId: 'cpi', date: '2026-08-12', time: '12:30' },
  { eventId: 'ifo', date: '2026-08-25', time: '08:30' },
  { eventId: 'pce', date: '2026-08-28', time: '12:30' },

  // ── September 2026 ────────────────────────────────────────────────────
  { eventId: 'nfp', date: '2026-09-04', time: '12:30' },
  { eventId: 'cpi', date: '2026-09-10', time: '12:30' },
  { eventId: 'ecb-rate', date: '2026-09-10', time: '12:15' },  // EZB 10. September
  { eventId: 'fed-rate', date: '2026-09-16', time: '18:00' },  // FOMC Sep 15-16
  { eventId: 'ifo', date: '2026-09-24', time: '08:30' },
  { eventId: 'gdp', date: '2026-09-25', time: '12:30' },
  { eventId: 'pce', date: '2026-09-25', time: '12:30' },

  // ── Oktober 2026 ──────────────────────────────────────────────────────
  { eventId: 'nfp', date: '2026-10-02', time: '12:30' },
  { eventId: 'cpi', date: '2026-10-13', time: '12:30' },
  { eventId: 'ifo', date: '2026-10-26', time: '08:30' },
  { eventId: 'fed-rate', date: '2026-10-28', time: '18:00' },  // FOMC Oct 27-28
  { eventId: 'ecb-rate', date: '2026-10-29', time: '12:15' },  // EZB 29. Oktober
  { eventId: 'gdp', date: '2026-10-29', time: '12:30' },
  { eventId: 'pce', date: '2026-10-30', time: '12:30' },

  // ── November 2026 ─────────────────────────────────────────────────────
  { eventId: 'nfp', date: '2026-11-06', time: '12:30' },
  { eventId: 'cpi', date: '2026-11-12', time: '12:30' },
  { eventId: 'ifo', date: '2026-11-24', time: '08:30' },
  { eventId: 'pce', date: '2026-11-25', time: '12:30' },

  // ── Dezember 2026 ─────────────────────────────────────────────────────
  { eventId: 'nfp', date: '2026-12-04', time: '12:30' },
  { eventId: 'fed-rate', date: '2026-12-09', time: '18:00' },  // FOMC Dec 8-9
  { eventId: 'cpi', date: '2026-12-10', time: '12:30' },
  { eventId: 'ifo', date: '2026-12-17', time: '08:30' },
  { eventId: 'ecb-rate', date: '2026-12-17', time: '12:15' },  // EZB 17. Dezember
  { eventId: 'gdp', date: '2026-12-22', time: '12:30' },
  { eventId: 'pce', date: '2026-12-23', time: '12:30' },
]
