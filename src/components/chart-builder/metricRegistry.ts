// src/components/chart-builder/metricRegistry.ts

import { MetricDefinition } from './types'

export const METRIC_REGISTRY: MetricDefinition[] = [
  // === BEWERTUNG (Valuation) ===
  {
    key: 'peRatio',
    label: 'KGV',
    category: 'valuation',
    unit: 'multiple',
    description: 'Kurs-Gewinn-Verhältnis (Price to Earnings)',
    source: 'key-metrics',
    field: 'peRatio',
  },
  {
    key: 'priceToSalesRatio',
    label: 'KUV',
    category: 'valuation',
    unit: 'multiple',
    description: 'Kurs-Umsatz-Verhältnis (Price to Sales)',
    source: 'key-metrics',
    field: 'priceToSalesRatio',
  },
  {
    key: 'pfcfRatio',
    label: 'P/FCF',
    category: 'valuation',
    unit: 'multiple',
    description: 'Kurs zu Free Cashflow',
    source: 'key-metrics',
    field: 'pfcfRatio',
  },
  {
    key: 'pocfRatio',
    label: 'P/OCF',
    category: 'valuation',
    unit: 'multiple',
    description: 'Kurs zu operativem Cashflow',
    source: 'key-metrics',
    field: 'pocfratio',
  },
  {
    key: 'pbRatio',
    label: 'KBV',
    category: 'valuation',
    unit: 'multiple',
    description: 'Kurs-Buchwert-Verhältnis (Price to Book)',
    source: 'key-metrics',
    field: 'pbRatio',
  },
  {
    key: 'evToEbitda',
    label: 'EV/EBITDA',
    category: 'valuation',
    unit: 'multiple',
    description: 'Enterprise Value zu EBITDA',
    source: 'key-metrics',
    field: 'enterpriseValueOverEBITDA',
  },
  {
    key: 'evToRevenue',
    label: 'EV/Umsatz',
    category: 'valuation',
    unit: 'multiple',
    description: 'Enterprise Value zu Umsatz',
    source: 'key-metrics',
    field: 'evToSales',
  },

  // === PROFITABILITÄT (Profitability) ===
  {
    key: 'grossMargin',
    label: 'Bruttomarge',
    category: 'profitability',
    unit: 'percent',
    description: 'Bruttogewinn / Umsatz',
    source: 'income-statement',
    field: 'grossProfitRatio',
  },
  {
    key: 'operatingMargin',
    label: 'Operative Marge',
    category: 'profitability',
    unit: 'percent',
    description: 'Betriebsergebnis / Umsatz',
    source: 'income-statement',
    field: 'operatingIncomeRatio',
  },
  {
    key: 'netMargin',
    label: 'Nettomarge',
    category: 'profitability',
    unit: 'percent',
    description: 'Nettogewinn / Umsatz',
    source: 'income-statement',
    field: 'netIncomeRatio',
  },
  {
    key: 'ebitdaMargin',
    label: 'EBITDA-Marge',
    category: 'profitability',
    unit: 'percent',
    description: 'EBITDA / Umsatz',
    source: 'calculated',
    field: 'ebitdaMargin',
    calculatedFrom: {
      numerator: { source: 'income-statement', field: 'ebitda' },
      denominator: { source: 'income-statement', field: 'revenue' },
    },
  },
  {
    key: 'roe',
    label: 'ROE',
    category: 'profitability',
    unit: 'percent',
    description: 'Eigenkapitalrendite (Return on Equity)',
    source: 'key-metrics',
    field: 'roe',
  },
  {
    key: 'roa',
    label: 'ROA',
    category: 'profitability',
    unit: 'percent',
    description: 'Gesamtkapitalrendite (Return on Assets)',
    source: 'key-metrics',
    field: 'returnOnTangibleAssets',
  },
  {
    key: 'roic',
    label: 'ROIC',
    category: 'profitability',
    unit: 'percent',
    description: 'Rendite auf investiertes Kapital',
    source: 'key-metrics',
    field: 'roic',
  },

  // === FINANZEN (Financial) ===
  {
    key: 'revenue',
    label: 'Umsatz',
    category: 'financial',
    unit: 'currency',
    description: 'Gesamtumsatz',
    source: 'income-statement',
    field: 'revenue',
    isFlowMetric: true,
    preferredChartType: 'bar',
  },
  {
    key: 'netIncome',
    label: 'Nettogewinn',
    category: 'financial',
    unit: 'currency',
    description: 'Nettogewinn nach Steuern',
    source: 'income-statement',
    field: 'netIncome',
    isFlowMetric: true,
    preferredChartType: 'bar',
  },
  {
    key: 'ebitda',
    label: 'EBITDA',
    category: 'financial',
    unit: 'currency',
    description: 'Ergebnis vor Zinsen, Steuern und Abschreibungen',
    source: 'income-statement',
    field: 'ebitda',
    isFlowMetric: true,
    preferredChartType: 'bar',
  },
  {
    key: 'freeCashFlow',
    label: 'Free Cashflow',
    category: 'financial',
    unit: 'currency',
    description: 'Freier Cashflow',
    source: 'cash-flow-statement',
    field: 'freeCashFlow',
    isFlowMetric: true,
    preferredChartType: 'bar',
  },
  {
    key: 'operatingCashFlow',
    label: 'Operativer Cashflow',
    category: 'financial',
    unit: 'currency',
    description: 'Cashflow aus operativer Tätigkeit',
    source: 'cash-flow-statement',
    field: 'operatingCashFlow',
    isFlowMetric: true,
    preferredChartType: 'bar',
  },
  {
    key: 'capex',
    label: 'CapEx',
    category: 'financial',
    unit: 'currency',
    description: 'Investitionsausgaben (Capital Expenditures)',
    source: 'cash-flow-statement',
    field: 'capitalExpenditure',
    isFlowMetric: true,
    absValue: true,
    preferredChartType: 'bar',
  },
  {
    key: 'eps',
    label: 'EPS',
    category: 'financial',
    unit: 'currency',
    description: 'Gewinn pro Aktie (verwässert)',
    source: 'income-statement',
    field: 'epsdiluted',
    isFlowMetric: true,
    preferredChartType: 'bar',
  },
  {
    key: 'sharesOutstanding',
    label: 'Aktien im Umlauf',
    category: 'financial',
    unit: 'number',
    description: 'Gewichteter Durchschnitt der ausstehenden Aktien',
    source: 'income-statement',
    field: 'weightedAverageShsOut',
  },

  // === KURS (Price) ===
  {
    key: 'stockPrice',
    label: 'Aktienkurs',
    category: 'price',
    unit: 'percent',
    description: 'Aktienkurs (prozentuale Veränderung)',
    source: 'historical-price',
    field: 'close',
  },
]

export const METRIC_CATEGORIES = [
  { key: 'valuation' as const, label: 'Bewertung' },
  { key: 'profitability' as const, label: 'Profitabilität' },
  { key: 'financial' as const, label: 'Finanzen' },
  { key: 'price' as const, label: 'Kurs' },
]

export function getMetricDefinition(key: string): MetricDefinition | undefined {
  return METRIC_REGISTRY.find(m => m.key === key)
}

export function getMetricsByCategory(category: string): MetricDefinition[] {
  return METRIC_REGISTRY.filter(m => m.category === category)
}

export function searchMetrics(query: string): MetricDefinition[] {
  const q = query.toLowerCase()
  return METRIC_REGISTRY.filter(
    m => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.key.toLowerCase().includes(q)
  )
}
