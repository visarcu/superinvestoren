// src/components/chart-builder/presets.ts

import { ChartBuilderPreset } from './types'

export const BUILT_IN_PRESETS: ChartBuilderPreset[] = [
  // Bewertung
  {
    id: 'valuation-overview',
    name: 'Bewertungs-Überblick',
    category: 'valuation',
    description: 'KGV, KUV und P/FCF im Vergleich',
    metrics: ['peRatio', 'priceToSalesRatio', 'pfcfRatio'],
  },
  {
    id: 'ev-multiples',
    name: 'EV-Multiplikatoren',
    category: 'valuation',
    description: 'EV/EBITDA und EV/Umsatz',
    metrics: ['evToEbitda', 'evToRevenue'],
  },
  {
    id: 'price-ratios',
    name: 'Kurs-Verhältnisse',
    category: 'valuation',
    description: 'KGV, KBV und PEG-Ratio',
    metrics: ['peRatio', 'pbRatio', 'pegRatio'],
  },

  // Profitabilität
  {
    id: 'margins-stack',
    name: 'Margen-Vergleich',
    category: 'profitability',
    description: 'Brutto-, Betriebs- und Nettomarge im Zeitverlauf',
    metrics: ['grossMargin', 'operatingMargin', 'netMargin'],
  },
  {
    id: 'returns',
    name: 'Kapitalrenditen',
    category: 'profitability',
    description: 'ROE, ROA und ROIC im Vergleich',
    metrics: ['roe', 'roa', 'roic'],
  },
  {
    id: 'growth-quality',
    name: 'Wachstumsqualität',
    category: 'profitability',
    description: 'Umsatzwachstum zusammen mit operativer Marge',
    metrics: ['revenue', 'operatingMargin'],
  },

  // Finanzen
  {
    id: 'cash-flow-health',
    name: 'Cashflow-Gesundheit',
    category: 'financial',
    description: 'Operativer Cashflow und Free Cashflow',
    metrics: ['operatingCashFlow', 'freeCashFlow'],
  },
  {
    id: 'earnings-power',
    name: 'Ertragskraft',
    category: 'financial',
    description: 'Umsatz, EBITDA und Nettogewinn',
    metrics: ['revenue', 'ebitda', 'netIncome'],
  },
  {
    id: 'per-share',
    name: 'Pro-Aktie-Kennzahlen',
    category: 'financial',
    description: 'EPS und Aktien im Umlauf',
    metrics: ['eps', 'sharesOutstanding'],
  },
]

export function getPresetsByCategory(category: string): ChartBuilderPreset[] {
  if (category === 'all') return BUILT_IN_PRESETS
  return BUILT_IN_PRESETS.filter(p => p.category === category)
}
