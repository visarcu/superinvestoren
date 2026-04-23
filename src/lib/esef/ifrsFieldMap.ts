// src/lib/esef/ifrsFieldMap.ts
// Zentraler Mapping-Katalog: IFRS-full Taxonomy Tags → Finclue Schema Fields
//
// Stand: IFRS Taxonomy 2024 (ESMA)
// Alle Tags die unser FinancialStatement-Schema abdeckt (Primary Statements).
// Erweitere diese Map statt das Schema anzupassen, solange rawFacts alles aufnimmt.

/**
 * Ein Schema-Feld kann von mehreren IFRS-Tags kommen (Fallback-Reihenfolge).
 * Der ERSTE Treffer gewinnt — bei wichtigen Feldern sollte das bekanntestes Tag sein.
 */
export interface IfrsMapping {
  schemaField: keyof FinancialFields
  ifrsTags: string[]           // Reihenfolge = Priorität
  periodType: 'duration' | 'instant'
  negate?: boolean             // Manche Capex sind negativ getagged → für uns positiv
}

// Nur die Zahlenfelder aus FinancialStatement (für TypeSafety)
export interface FinancialFields {
  // Income Statement
  revenue: number
  costOfRevenue: number
  grossProfit: number
  rAndD: number
  sgA: number
  operatingExpenses: number
  operatingIncome: number
  ebitda: number
  interestExpense: number
  incomeTax: number
  netIncome: number
  eps: number
  epsDiluted: number
  sharesOutstanding: number
  // Balance Sheet
  cashAndEquivalents: number
  shortTermInvest: number
  inventory: number
  receivables: number
  totalCurrentAssets: number
  ppE: number
  goodwill: number
  totalAssets: number
  shortTermDebt: number
  longTermDebt: number
  totalDebt: number
  totalLiabilities: number
  shareholdersEquity: number
  // Cash Flow
  operatingCashFlow: number
  capex: number
  freeCashFlow: number
  dividendsPaid: number
  shareRepurchases: number
}

export const IFRS_MAPPINGS: IfrsMapping[] = [
  // ─── Income Statement (Duration) ─────────────────────────────────────
  {
    schemaField: 'revenue',
    periodType: 'duration',
    ifrsTags: [
      'ifrs-full:Revenue',
      'ifrs-full:RevenueFromContractsWithCustomers',
    ],
  },
  {
    schemaField: 'costOfRevenue',
    periodType: 'duration',
    ifrsTags: [
      'ifrs-full:CostOfSales',
      'ifrs-full:CostOfGoodsAndServicesSold',
    ],
  },
  {
    schemaField: 'grossProfit',
    periodType: 'duration',
    ifrsTags: ['ifrs-full:GrossProfit'],
  },
  {
    schemaField: 'rAndD',
    periodType: 'duration',
    ifrsTags: ['ifrs-full:ResearchAndDevelopmentExpense'],
  },
  {
    schemaField: 'sgA',
    periodType: 'duration',
    ifrsTags: [
      'ifrs-full:SellingGeneralAndAdministrativeExpense',
      'ifrs-full:GeneralAndAdministrativeExpense',
    ],
  },
  {
    schemaField: 'operatingIncome',
    periodType: 'duration',
    ifrsTags: [
      'ifrs-full:ProfitLossFromOperatingActivities',
      'ifrs-full:OperatingIncomeLoss',
    ],
  },
  {
    schemaField: 'interestExpense',
    periodType: 'duration',
    ifrsTags: ['ifrs-full:FinanceCosts', 'ifrs-full:InterestExpense'],
  },
  {
    schemaField: 'incomeTax',
    periodType: 'duration',
    ifrsTags: [
      'ifrs-full:IncomeTaxExpenseContinuingOperations',
      'ifrs-full:IncomeTaxExpense',
    ],
  },
  {
    schemaField: 'netIncome',
    periodType: 'duration',
    ifrsTags: [
      'ifrs-full:ProfitLoss',
      'ifrs-full:ProfitLossAttributableToOwnersOfParent',
    ],
  },
  {
    schemaField: 'eps',
    periodType: 'duration',
    ifrsTags: ['ifrs-full:BasicEarningsLossPerShare'],
  },
  {
    schemaField: 'epsDiluted',
    periodType: 'duration',
    ifrsTags: ['ifrs-full:DilutedEarningsLossPerShare'],
  },

  // ─── Balance Sheet (Instant) ─────────────────────────────────────────
  {
    schemaField: 'cashAndEquivalents',
    periodType: 'instant',
    ifrsTags: [
      'ifrs-full:CashAndCashEquivalents',
      'ifrs-full:Cash',
    ],
  },
  {
    schemaField: 'inventory',
    periodType: 'instant',
    ifrsTags: ['ifrs-full:Inventories', 'ifrs-full:CurrentInventories'],
  },
  {
    schemaField: 'receivables',
    periodType: 'instant',
    ifrsTags: [
      'ifrs-full:TradeAndOtherCurrentReceivables',
      'ifrs-full:TradeReceivables',
    ],
  },
  {
    schemaField: 'totalCurrentAssets',
    periodType: 'instant',
    ifrsTags: ['ifrs-full:CurrentAssets'],
  },
  {
    schemaField: 'ppE',
    periodType: 'instant',
    ifrsTags: ['ifrs-full:PropertyPlantAndEquipment'],
  },
  {
    schemaField: 'goodwill',
    periodType: 'instant',
    ifrsTags: ['ifrs-full:Goodwill'],
  },
  {
    schemaField: 'totalAssets',
    periodType: 'instant',
    ifrsTags: ['ifrs-full:Assets'],
  },
  {
    schemaField: 'totalLiabilities',
    periodType: 'instant',
    ifrsTags: ['ifrs-full:Liabilities'],
  },
  {
    schemaField: 'shareholdersEquity',
    periodType: 'instant',
    ifrsTags: [
      'ifrs-full:Equity',
      'ifrs-full:EquityAttributableToOwnersOfParent',
    ],
  },

  // ─── Cash Flow (Duration) ────────────────────────────────────────────
  {
    schemaField: 'operatingCashFlow',
    periodType: 'duration',
    ifrsTags: ['ifrs-full:CashFlowsFromUsedInOperatingActivities'],
  },
  {
    schemaField: 'capex',
    periodType: 'duration',
    // Capex ist in IFRS meist als negative Outflows → wir speichern absolut
    ifrsTags: [
      'ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities',
      'ifrs-full:AcquisitionsOfPropertyPlantAndEquipment',
    ],
    negate: true,
  },
  {
    schemaField: 'dividendsPaid',
    periodType: 'duration',
    ifrsTags: [
      'ifrs-full:DividendsPaid',
      'ifrs-full:DividendsPaidClassifiedAsFinancingActivities',
    ],
    negate: true,
  },
  {
    schemaField: 'shareRepurchases',
    periodType: 'duration',
    ifrsTags: [
      'ifrs-full:PurchaseOfTreasuryShares',
      'ifrs-full:PaymentsToAcquireOrRedeemEntitysShares',
    ],
    negate: true,
  },
]

/**
 * Erstellt Lookup-Map für schnellen Zugriff: ifrs-Tag → schemaField.
 * Beachtet Fallback-Reihenfolge: wenn mehrere Mappings auf gleichen schemaField zeigen,
 * wird der erste Treffer bevorzugt.
 */
export function buildTagLookup(): Map<string, IfrsMapping> {
  const lookup = new Map<string, IfrsMapping>()
  for (const mapping of IFRS_MAPPINGS) {
    for (const tag of mapping.ifrsTags) {
      if (!lookup.has(tag)) {
        lookup.set(tag, mapping)
      }
    }
  }
  return lookup
}

/**
 * Human-readable Label für ein Schema-Feld.
 */
export const FIELD_LABELS: Record<keyof FinancialFields, string> = {
  revenue: 'Umsatz',
  costOfRevenue: 'Umsatzkosten',
  grossProfit: 'Bruttoergebnis',
  rAndD: 'F&E',
  sgA: 'Vertrieb & Verwaltung',
  operatingExpenses: 'Op. Aufwendungen',
  operatingIncome: 'EBIT',
  ebitda: 'EBITDA',
  interestExpense: 'Zinsaufwand',
  incomeTax: 'Ertragsteuern',
  netIncome: 'Nettogewinn',
  eps: 'EPS',
  epsDiluted: 'EPS (verwässert)',
  sharesOutstanding: 'Aktien im Umlauf',
  cashAndEquivalents: 'Liquide Mittel',
  shortTermInvest: 'Kurzfr. Investments',
  inventory: 'Vorräte',
  receivables: 'Forderungen',
  totalCurrentAssets: 'Umlaufvermögen',
  ppE: 'Sachanlagen',
  goodwill: 'Goodwill',
  totalAssets: 'Bilanzsumme',
  shortTermDebt: 'Kurzfr. Schulden',
  longTermDebt: 'Langfr. Schulden',
  totalDebt: 'Gesamte Schulden',
  totalLiabilities: 'Verbindlichkeiten',
  shareholdersEquity: 'Eigenkapital',
  operatingCashFlow: 'Operativer Cashflow',
  capex: 'Capex',
  freeCashFlow: 'Free Cashflow',
  dividendsPaid: 'Dividenden',
  shareRepurchases: 'Aktienrückkäufe',
}
