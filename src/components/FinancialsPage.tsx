// src/components/FinancialsPage.tsx - MIT DEUTSCHER FORMATIERUNG
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrency } from '@/lib/CurrencyContext'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import {
  ChartBarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  InformationCircleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronDownIcon,
  CalendarIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/LoadingSpinner'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { LearnTooltipButton } from '@/components/LearnSidebar'
import LearnSidebar from '@/components/LearnSidebar'

interface Props {
  ticker: string
  isPremium?: boolean
}

interface RawStatements {
  income: any[]
  balance: any[]
  cashflow: any[]
}

// ✅ SPARKLINE TOOLTIP COMPONENT - EVENT STOPPING
const SparklineTooltip = ({ 
  data, 
  value, 
  label, 
  color = '#10b981', 
  growth,
  children 
}: {
  data: Array<{year: string, value: number}>
  value: string
  label: string
  color?: string
  growth?: React.ReactNode
  children: React.ReactNode
}) => {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!data || data.length < 2) {
    return <div>{children}</div>
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowTooltip(true)
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowTooltip(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      
      {showTooltip && (
        <div 
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50"
          onClick={handleClick}
        >
          <div className="bg-theme-card border border-theme/20 rounded-lg shadow-xl p-4 min-w-[280px]">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-theme-primary text-sm">{label}</h4>
              <div className="text-right">
                <div className="font-bold text-theme-primary">{value}</div>
                {growth && <div className="mt-1">{growth}</div>}
              </div>
            </div>
            
            {/* Sparkline Chart */}
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: color }}
                  />
                  <XAxis 
                    dataKey="year" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Mini Stats */}
            <div className="flex justify-between text-xs text-theme-muted mt-2 pt-2 border-t border-theme/10">
              <span>Min: {Math.min(...data.map(d => d.value)).toFixed(1)}</span>
              <span>Max: {Math.max(...data.map(d => d.value)).toFixed(1)}</span>
              <span>{data.length} Jahre</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ✅ DEUTSCHE ÜBERSETZUNGEN - YAHOO FINANCE STANDARD
const GERMAN_LABELS = {
  // Headers
  financial_statements: 'Financial Statements',
  comprehensive_analysis: 'Umfassende Finanzanalyse für',
  all_figures: 'Alle Zahlen in {unit}. Wachstumsraten beziehen sich auf das Vorjahr.',
  daily_updated: 'Täglich aktualisiert',
  
  // Tabs
  income: 'Gewinn- und Verlustrechnung',
  balance: 'Bilanz', 
  cashflow: 'Cash Flow',
  
  // Controls
  annual: 'Jährlich',
  quarterly: 'Quartalsweise',
  
  // Metrics Bar
  revenue_trend: 'Umsatztrend',
  net_income: 'Nettogewinn',
  profit_margin: 'Gewinnmarge',
  total_assets: 'Bilanzsumme',
  total_equity: 'Eigenkapital',
  debt_to_equity: 'Verschuldungsgrad',
  operating_cash_flow: 'Operativer Cash Flow',
  free_cash_flow: 'Freier Cash Flow',
  cash_conversion: 'Cash Conversion',
  
  // Sections
  revenue_growth: 'UMSATZ & WACHSTUM',
  profitability: 'PROFITABILITÄT',
  operating_metrics: 'BETRIEBSKENNZAHLEN',
  financial_results: 'FINANZERGEBNIS',
  per_share: 'JE AKTIE',
  
  // Balance Sheet Sections
  current_assets: 'UMLAUFVERMÖGEN',
  non_current_assets: 'ANLAGEVERMÖGEN',
  current_liabilities: 'KURZFRISTIGE VERBINDLICHKEITEN',
  non_current_liabilities: 'LANGFRISTIGE VERBINDLICHKEITEN',
  equity_section: 'EIGENKAPITAL',
  
  // Cash Flow Sections
  operating_activities: 'OPERATIVER CASH FLOW',
  investing_activities: 'INVESTITIONSTÄTIGKEIT',
  financing_activities: 'FINANZIERUNGSTÄTIGKEIT',
  
  // Income Statement Rows - PROFESSIONAL COMPLETE
  total_revenues: 'Gesamtumsatz',
  total_revenues_chg: 'Umsatzwachstum %',
  cost_of_goods_sold: 'Herstellungskosten',
  gross_profit: 'Bruttoergebnis vom Umsatz', 
  gross_profit_margin: 'Bruttomarge',
  
  // Operating Expenses - Detailed
  total_operating_expenses: 'Betriebliche Aufwendungen gesamt',
  selling_admin_expenses: 'Vertriebs- & Verwaltungskosten',
  rd_expenses: 'Forschung & Entwicklung',
  depreciation_amortization: 'Abschreibungen',
  other_operating_expenses: 'Sonstige Betriebskosten',
  
  // Key Operating Metrics
  operating_income: 'Betriebsgewinn',
  operating_margin: 'Betriebsmarge',
  ebit: 'EBIT',
  ebitda: 'EBITDA',
  
  // Financial Results
  interest_expense: 'Zinsaufwand',
  interest_income: 'Zinserträge', 
  net_interest_expense: 'Netto Zinsaufwand',
  other_income: 'Sonstige Erträge/Aufwendungen',
  
  // Pre-Tax & Tax
  pretax_income: 'Ergebnis vor Steuern',
  income_tax_expense: 'Steuerrückstellung',
  effective_tax_rate: 'Effektiver Steuersatz',
  
  // Net Results
  net_income_final: 'Jahresüberschuss',
  net_margin: 'Nettomarge',
  
  // Per Share Metrics
  earnings_per_share: 'Unvermässertes EPS',
  eps_diluted: 'Verwässertes EPS',
  shares_outstanding: 'Durchschnittl. Aktien unvermässert (Mio.)',
  shares_outstanding_diluted: 'Durchschnittl. Aktien verwässert (Mio.)',
  
  // Balance Sheet Items - Assets (VOLLSTÄNDIG)
  cash_and_equivalents: 'Liquide Mittel',
  short_term_investments: 'Kurzfristige Anlagen',
  accounts_receivable: 'Forderungen aus L&L',
  inventory: 'Vorräte',
  prepaid_expenses: 'Rechnungsabgrenzung',
  other_current_assets: 'Sonstige Umlaufvermögenswerte',
  total_current_assets: 'Umlaufvermögen gesamt',
  
  property_plant_equipment: 'Sachanlagen brutto',
  accumulated_depreciation: 'Kumulierte Abschreibungen',
  net_property_plant_equipment: 'Sachanlagen netto',
  goodwill: 'Geschäfts- oder Firmenwert',
  intangible_assets: 'Immaterielle Vermögenswerte',
  long_term_investments: 'Langfristige Anlagen',
  other_long_term_assets: 'Sonstige langfristige Vermögenswerte',
  total_non_current_assets: 'Anlagevermögen gesamt',
  total_assets_final: 'Bilanzsumme',
  
  // Balance Sheet Items - Liabilities (VOLLSTÄNDIG)
  accounts_payable: 'Verbindlichkeiten aus L&L',
  accrued_expenses: 'Rückstellungen',
  short_term_debt: 'Kurzfristige Schulden',
  current_portion_long_term_debt: 'Kurzfr. Anteil langfr. Schulden',
  accrued_liabilities: 'Sonstige Verbindlichkeiten',
  deferred_revenue: 'Erhaltene Anzahlungen',
  other_current_liabilities: 'Sonstige kurzfr. Verbindlichkeiten',
  total_current_liabilities: 'Kurzfristige Verbindlichkeiten gesamt',
  
  long_term_debt: 'Langfristige Schulden',
  deferred_tax_liabilities: 'Latente Steuerschulden',
  pension_liabilities: 'Pensionsrückstellungen',
  other_long_term_liabilities: 'Sonstige langfr. Verbindlichkeiten',
  total_non_current_liabilities: 'Langfristige Verbindlichkeiten gesamt',
  total_liabilities: 'Verbindlichkeiten gesamt',
  
  // Balance Sheet Items - Equity (VOLLSTÄNDIG)
  common_stock: 'Stammaktien',
  additional_paid_capital: 'Kapitalrücklage',
  retained_earnings: 'Gewinnrücklagen',
  treasury_stock: 'Eigene Aktien',
  other_comprehensive_income: 'Sonstiges Gesamtergebnis',
  total_equity_final: 'Eigenkapital gesamt',
  total_liabilities_equity: 'Passiva gesamt',
  
  // Cash Flow Items (VOLLSTÄNDIG)
  net_income_cf: 'Jahresüberschuss',
  depreciation_amortization_cf: 'Abschreibungen',
  stock_compensation: 'Aktienbasierte Vergütung',
  deferred_taxes: 'Latente Steuern',
  changes_working_capital: 'Änderung Working Capital',
  accounts_receivable_change: 'Änderung Forderungen',
  inventory_change: 'Änderung Vorräte',
  accounts_payable_change: 'Änderung Verbindlichkeiten',
  other_operating_activities: 'Sonstige operative Tätigkeiten',
  operating_cash_flow_final: 'Operativer Cash Flow',
  
  capital_expenditures: 'Investitionen in Sachanlagen',
  acquisitions: 'Akquisitionen',
  investments_purchases: 'Käufe von Anlagen',
  investments_sales: 'Verkäufe von Anlagen',
  other_investing_activities: 'Sonstige Investitionstätigkeiten',
  investing_cash_flow: 'Cash Flow aus Investitionstätigkeit',
  
  debt_repayment: 'Schuldenrückzahlung',
  debt_proceeds: 'Schuldenaufnahme',
  dividends_paid: 'Dividendenzahlungen',
  share_repurchases: 'Aktienrückkäufe',
  share_issuance: 'Aktienemissionen',
  other_financing_activities: 'Sonstige Finanzierungstätigkeiten',
  financing_cash_flow: 'Cash Flow aus Finanzierungstätigkeit',
  
  net_cash_flow: 'Netto Cash Flow',
  beginning_cash: 'Anfangsbestand Liquide Mittel',
  ending_cash: 'Endbestand Liquide Mittel',
  free_cash_flow_calc: 'Freier Cash Flow',
  
  // Growth indicators
  vs_prev_year: 'vs. Vorjahr'
}

// ✅ GROWTH INDICATOR
const GrowthIndicator = ({ current, previous, showIcon = true }: { 
  current: number, 
  previous: number, 
  showIcon?: boolean 
}) => {
  if (!current || !previous) return null
  
  const growth = ((current - previous) / previous) * 100
  const isPositive = growth >= 0
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
      isPositive ? 'text-green-400' : 'text-red-400'
    }`}>
      {showIcon && (
        isPositive ? (
          <ArrowTrendingUpIcon className="w-3 h-3" />
        ) : (
          <ArrowTrendingDownIcon className="w-3 h-3" />
        )
      )}
      {isPositive ? '+' : ''}{growth.toFixed(1)}%
    </span>
  )
}

export default function FinancialsPage({ ticker, isPremium = false }: Props) {
  const [activeStatement, setActiveStatement] = useState<'income' | 'balance' | 'cashflow'>('income')
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
  const [yearsToShow, setYearsToShow] = useState<number>(5)
  const [isYearsDropdownOpen, setIsYearsDropdownOpen] = useState(false)
  const [rawStatements, setRawStatements] = useState<RawStatements | null>(null)
  const [loading, setLoading] = useState(true)
  
  // ✅ NUTZE CURRENCY CONTEXT FÜR DEUTSCHE FORMATIERUNG
  const { formatAxisValueDE, formatCurrency } = useCurrency()

  // ✅ DEUTSCHE FORMATIERUNG - Ersetzt die alte formatFinancialNumber Funktion
  const formatFinancialNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '–'
    
    // ✅ NUTZE DIE CONTEXT-FUNKTION für deutsche Formatierung
    return formatAxisValueDE(value)
  }

  // Get stock info for header
  const stock = stocks.find(s => s.ticker === ticker.toUpperCase())

  // Load data
  useEffect(() => {
    async function loadFinancials() {
      setLoading(true)
      try {
        const response = await fetch(`/api/financials/${ticker}?period=${period}&limit=${yearsToShow}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        
        const data = await response.json()
        if (data.rawStatements) {
          setRawStatements(data.rawStatements)
        } else {
          setRawStatements(null)
        }
      } catch (error) {
        console.error('❌ Failed to load financials:', error)
        setRawStatements(null)
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      loadFinancials()
    }
  }, [ticker, period, yearsToShow])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsYearsDropdownOpen(false)
    if (isYearsDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isYearsDropdownOpen])

  // ✅ PREPARE SPARKLINE DATA
  const prepareSparklineData = (data: any[], valueKey: string) => {
    if (!data || data.length === 0) return []
    
    return data.slice(0, yearsToShow).reverse().map((item) => ({
      year: period === 'annual' ? String(item.calendarYear) : item.date.slice(0, 7),
      value: item[valueKey] || 0
    }))
  }

  // Premium Blur
  const PremiumBlur = ({ children }: { children: React.ReactNode }) => {
    if (isPremium) return <>{children}</>
    
    return (
      <div className="relative">
        <div className="filter blur-sm opacity-60 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-theme-card/90 backdrop-blur-sm rounded-lg p-4 text-center">
          <LockClosedIcon className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-theme-primary font-medium">Financial Statements</p>
            <p className="text-theme-muted text-sm">Premium erforderlich</p>
            <Link
  href="/pricing"
  className="inline-flex items-center gap-1 text-green-500 hover:text-green-400 text-xs font-medium mt-2 transition-colors"
>
  Upgrade <ArrowRightIcon className="w-3 h-3" />
</Link>
          </div>
        </div>
      </div>
    )
  }

  // ✅ INCOME STATEMENT MIT DEUTSCHER FORMATIERUNG
  const renderIncomeStatement = () => {
    const incomeData = rawStatements?.income?.slice(0, yearsToShow).reverse() || []
    const cashflowData = rawStatements?.cashflow?.slice(0, yearsToShow).reverse() || []
    
    if (!incomeData || incomeData.length === 0) {
      return (
        <div className="text-center py-16">
          <InformationCircleIcon className="w-16 h-16 mx-auto mb-4 text-theme-muted opacity-50" />
          <p className="text-theme-secondary">Keine Daten verfügbar</p>
        </div>
      )
    }

    // Key metrics
    const latestData = incomeData[incomeData.length - 1]
    const previousData = incomeData[incomeData.length - 2]
    
    const revenue = latestData?.revenue || 0
    const netIncome = latestData?.netIncome || 0
    const profitMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0

    // ✅ SPARKLINE DATA PREPARATION
    const revenueSparklineData = prepareSparklineData(rawStatements?.income || [], 'revenue')
    const netIncomeSparklineData = prepareSparklineData(rawStatements?.income || [], 'netIncome')
    const ebitdaSparklineData = prepareSparklineData(rawStatements?.income || [], 'ebitda')

    return (
      <div className="space-y-6">
        
        {/* ✅ METRICS BAR MIT DEUTSCHER FORMATIERUNG */}
        <div className="bg-theme-card rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {formatFinancialNumber(revenue)}
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.revenue_trend}</div>
              {previousData && (
                <GrowthIndicator current={revenue} previous={previousData.revenue} />
              )}
            </div>
            
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {formatFinancialNumber(netIncome)}
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.net_income}</div>
              {previousData && (
                <GrowthIndicator current={netIncome} previous={previousData.netIncome} />
              )}
            </div>
            
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {profitMargin.toFixed(1)}%
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.profit_margin}</div>
              <div className="text-xs text-theme-muted">
                Nettogewinn / Umsatz
              </div>
            </div>
          </div>
        </div>

        {/* ✅ INCOME STATEMENT TABLE MIT DEUTSCHER FORMATIERUNG */}
        <div className="bg-theme-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th style={{width: '35%'}}>
                    {GERMAN_LABELS.income}
                  </th>
                  {incomeData.map((item) => (
                    <th key={item.date} className="text-center">
                      {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                
                {/* Revenue Section */}
                <tr>
                  <td colSpan={incomeData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.revenue_growth}
                  </td>
                </tr>
                
                {/* Total Revenues MIT SPARKLINE */}
                <tr>
                  <td className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <SparklineTooltip
                      data={revenueSparklineData}
                      value={formatFinancialNumber(latestData?.revenue || 0)}
                      label={GERMAN_LABELS.total_revenues}
                      color="#10b981"
                      growth={previousData && <GrowthIndicator current={latestData?.revenue || 0} previous={previousData?.revenue || 0} />}
                    >
                      <span className="cursor-pointer hover:text-green-400 transition-colors">
                        {GERMAN_LABELS.total_revenues}
                      </span>
                    </SparklineTooltip>
                  </td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.revenue)}
                    </td>
                  ))}
                </tr>

                {/* Revenue Growth % */}
                <tr>
                  <td className="text-theme-secondary italic pl-8">
                    {GERMAN_LABELS.total_revenues_chg}
                  </td>
                  {incomeData.map((item, index) => {
                    if (index === 0) return <td key={item.date} className="text-center text-theme-muted">–</td>
                    const growth = ((item.revenue - incomeData[index-1].revenue) / incomeData[index-1].revenue) * 100
                    return (
                      <td key={item.date} className={`text-center font-mono font-semibold ${
                        growth >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </td>
                    )
                  })}
                </tr>

                {/* Cost of Goods Sold */}
                <tr>
                  <td>{GERMAN_LABELS.cost_of_goods_sold}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.costOfRevenue || (item.revenue - item.grossProfit))}
                    </td>
                  ))}
                </tr>

                {/* Gross Profit MIT SPARKLINE UND LEARN TOOLTIP */}
                <tr className="bg-green-500/5">
                  <td className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <SparklineTooltip
                      data={prepareSparklineData(rawStatements?.income || [], 'grossProfit')}
                      value={formatFinancialNumber(latestData?.grossProfit || 0)}
                      label={GERMAN_LABELS.gross_profit}
                      color="#16a34a"
                      growth={previousData && <GrowthIndicator current={latestData?.grossProfit || 0} previous={previousData?.grossProfit || 0} />}
                    >
                      <span className="cursor-pointer hover:text-green-400 transition-colors flex items-center gap-2">
                        {GERMAN_LABELS.gross_profit}
                        <LearnTooltipButton term="Bruttomarge" />
                      </span>
                    </SparklineTooltip>
                  </td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.grossProfit)}
                    </td>
                  ))}
                </tr>

                {/* Gross Profit Margin MIT DEUTSCHER FORMATIERUNG */}
                <tr>
                  <td className="text-theme-muted italic pl-8">{GERMAN_LABELS.gross_profit_margin}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-muted font-mono">
                      {new Intl.NumberFormat('de-DE', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      }).format((item.grossProfit / item.revenue) * 100)}%
                    </td>
                  ))}
                </tr>

                {/* Operating Expenses Section */}
                <tr>
                  <td colSpan={incomeData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.operating_metrics}
                  </td>
                </tr>

                {/* Total Operating Expenses */}
                <tr>
                  <td className="font-medium">{GERMAN_LABELS.total_operating_expenses}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-medium">
                      {formatFinancialNumber(item.totalOperatingExpenses || 0)}
                    </td>
                  ))}
                </tr>

                {/* Selling & Admin Expenses */}
                <tr>
                  <td className="pl-8">{GERMAN_LABELS.selling_admin_expenses}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.sellingGeneralAndAdministrativeExpenses || 0)}
                    </td>
                  ))}
                </tr>

                {/* R&D Expenses */}
                <tr>
                  <td className="pl-8">{GERMAN_LABELS.rd_expenses}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.researchAndDevelopmentExpenses || 0)}
                    </td>
                  ))}
                </tr>

                {/* Depreciation & Amortization */}
                <tr>
                  <td className="pl-8">{GERMAN_LABELS.depreciation_amortization}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.depreciationAndAmortization || 0)}
                    </td>
                  ))}
                </tr>

                {/* Operating Income MIT SPARKLINE UND LEARN TOOLTIP */}
                <tr className="bg-blue-500/5">
                  <td className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <SparklineTooltip
                      data={prepareSparklineData(rawStatements?.income || [], 'operatingIncome')}
                      value={formatFinancialNumber(latestData?.operatingIncome || 0)}
                      label={GERMAN_LABELS.operating_income}
                      color="#3b82f6"
                      growth={previousData && <GrowthIndicator current={latestData?.operatingIncome || 0} previous={previousData?.operatingIncome || 0} />}
                    >
                      <span className="cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-2">
                        {GERMAN_LABELS.operating_income}
                        <LearnTooltipButton term="Operating Margin" />
                      </span>
                    </SparklineTooltip>
                  </td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.operatingIncome)}
                    </td>
                  ))}
                </tr>

                {/* Operating Margin MIT DEUTSCHER FORMATIERUNG */}
                <tr>
                  <td className="text-theme-muted italic pl-8">{GERMAN_LABELS.operating_margin}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-muted font-mono">
                      {new Intl.NumberFormat('de-DE', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      }).format((item.operatingIncome / item.revenue) * 100)}%
                    </td>
                  ))}
                </tr>

               {/* EBIT MIT LEARN TOOLTIP */}
<tr className="bg-blue-500/5">
  <td className="font-medium flex items-center gap-2">
    <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
    <span className="flex items-center gap-2">
      {GERMAN_LABELS.ebit}
      <LearnTooltipButton term="EBIT" />
    </span>
  </td>
  {incomeData.map((item) => (
    <td key={item.date} className="text-center font-mono font-medium">
      {formatFinancialNumber(item.ebitda ? (item.ebitda - (item.depreciationAndAmortization || 0)) : item.operatingIncome)}
    </td>
  ))}
</tr>

{/* EBITDA MIT SPARKLINE UND LEARN TOOLTIP */}
<tr className="bg-blue-500/5">
  <td className="font-medium flex items-center gap-2">
    <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
    <SparklineTooltip
      data={ebitdaSparklineData}
      value={formatFinancialNumber(latestData?.ebitda || 0)}
      label={GERMAN_LABELS.ebitda}
      color="#6366f1"
      growth={previousData && <GrowthIndicator current={latestData?.ebitda || 0} previous={previousData?.ebitda || 0} />}
    >
      <span className="cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-2">
        {GERMAN_LABELS.ebitda}
        <LearnTooltipButton term="EBITDA" />
      </span>
    </SparklineTooltip>
  </td>
  {incomeData.map((item) => (
    <td key={item.date} className="text-center font-mono font-medium">
      {formatFinancialNumber(item.ebitda || 0)}
    </td>
  ))}
</tr>

                {/* Financial Results Section */}
                <tr>
                  <td colSpan={incomeData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.financial_results}
                  </td>
                </tr>

                {/* Interest Income */}
                <tr>
                  <td>{GERMAN_LABELS.interest_income}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.interestIncome || 0)}
                    </td>
                  ))}
                </tr>

                {/* Interest Expense */}
                <tr>
                  <td>{GERMAN_LABELS.interest_expense}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono text-red-400">
                      {formatFinancialNumber(Math.abs(item.interestExpense || 0))}
                    </td>
                  ))}
                </tr>

                {/* Net Interest Expense */}
                <tr>
                  <td className="font-medium">{GERMAN_LABELS.net_interest_expense}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-medium">
                      {formatFinancialNumber((item.interestIncome || 0) + (item.interestExpense || 0))}
                    </td>
                  ))}
                </tr>

                {/* Other Income */}
                <tr>
                  <td>{GERMAN_LABELS.other_income}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherIncomeExpense || 0)}
                    </td>
                  ))}
                </tr>

                {/* Pre-Tax Income */}
                <tr className="bg-yellow-500/5">
                  <td className="font-semibold">{GERMAN_LABELS.pretax_income}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.incomeBeforeTax || 0)}
                    </td>
                  ))}
                </tr>

                {/* Income Tax Expense */}
                <tr>
                  <td>{GERMAN_LABELS.income_tax_expense}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono text-red-400">
                      {formatFinancialNumber(item.incomeTaxExpense || 0)}
                    </td>
                  ))}
                </tr>

                {/* Effective Tax Rate MIT DEUTSCHER FORMATIERUNG */}
                <tr>
                  <td className="text-theme-muted italic pl-8">{GERMAN_LABELS.effective_tax_rate}</td>
                  {incomeData.map((item) => {
                    const taxRate = item.incomeBeforeTax && item.incomeBeforeTax > 0 
                      ? ((item.incomeTaxExpense || 0) / item.incomeBeforeTax) * 100 
                      : 0
                    return (
                      <td key={item.date} className="text-center text-theme-muted font-mono">
                        {new Intl.NumberFormat('de-DE', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1
                        }).format(taxRate)}%
                      </td>
                    )
                  })}
                </tr>

                {/* Net Income - HIGHLIGHTED MIT SPARKLINE UND LEARN TOOLTIP */}
                <tr className="bg-green-500/5">
                  <td className="font-bold text-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <SparklineTooltip
                      data={netIncomeSparklineData}
                      value={formatFinancialNumber(latestData?.netIncome || 0)}
                      label={GERMAN_LABELS.net_income_final}
                      color="#10b981"
                      growth={previousData && <GrowthIndicator current={latestData?.netIncome || 0} previous={previousData?.netIncome || 0} />}
                    >
                      <span className="cursor-pointer hover:text-green-400 transition-colors flex items-center gap-2">
                        {GERMAN_LABELS.net_income_final}
                        <LearnTooltipButton term="Net Margin" />
                      </span>
                    </SparklineTooltip>
                  </td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-bold text-lg">
                      {formatFinancialNumber(item.netIncome)}
                    </td>
                  ))}
                </tr>

                {/* Net Margin MIT DEUTSCHER FORMATIERUNG */}
                <tr>
                  <td className="text-theme-muted italic pl-8">{GERMAN_LABELS.net_margin}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-muted font-mono">
                      {new Intl.NumberFormat('de-DE', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                      }).format((item.netIncome / item.revenue) * 100)}%
                    </td>
                  ))}
                </tr>

                {/* Per Share Section */}
                <tr>
                  <td colSpan={incomeData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.per_share}
                  </td>
                </tr>

                {/* Basic EPS MIT DEUTSCHER FORMATIERUNG */}
                <tr>
                  <td className="font-medium">{GERMAN_LABELS.earnings_per_share}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-medium">
                      {item.eps ? `${new Intl.NumberFormat('de-DE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(item.eps)} $` : '–'}
                    </td>
                  ))}
                </tr>

                {/* Diluted EPS MIT DEUTSCHER FORMATIERUNG */}
                <tr>
                  <td className="font-medium">{GERMAN_LABELS.eps_diluted}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-medium">
                      {(item.epsdiluted || item.eps) ? `${new Intl.NumberFormat('de-DE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(item.epsdiluted || item.eps)} $` : '–'}
                    </td>
                  ))}
                </tr>

                {/* Basic Shares Outstanding MIT DEUTSCHER FORMATIERUNG */}
                <tr>
                  <td className="text-theme-secondary">{GERMAN_LABELS.shares_outstanding}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-secondary font-mono">
                      {new Intl.NumberFormat('de-DE', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format((item.weightedAverageShsOut || 0) / 1_000_000)}
                    </td>
                  ))}
                </tr>

                {/* Diluted Shares Outstanding MIT DEUTSCHER FORMATIERUNG */}
                <tr>
                  <td className="text-theme-secondary">{GERMAN_LABELS.shares_outstanding_diluted}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-secondary font-mono">
                      {new Intl.NumberFormat('de-DE', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format((item.weightedAverageShsOutDil || item.weightedAverageShsOut || 0) / 1_000_000)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ✅ BALANCE SHEET MIT DEUTSCHER FORMATIERUNG
  const renderBalanceSheet = () => {
    const balanceData = rawStatements?.balance?.slice(0, yearsToShow).reverse() || []
    
    if (!balanceData || balanceData.length === 0) {
      return (
        <div className="text-center py-16">
          <InformationCircleIcon className="w-16 h-16 mx-auto mb-4 text-theme-muted opacity-50" />
          <p className="text-theme-secondary">Keine Bilanz-Daten verfügbar</p>
        </div>
      )
    }

    // Key metrics
    const latestData = balanceData[balanceData.length - 1]
    const previousData = balanceData[balanceData.length - 2]
    
    const totalAssets = latestData?.totalAssets || 0
    const totalEquity = latestData?.totalStockholdersEquity || 0
    const totalDebt = latestData?.totalDebt || 0
    const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 0

    // ✅ SPARKLINE DATA FOR BALANCE SHEET
    const assetsSparklineData = prepareSparklineData(rawStatements?.balance || [], 'totalAssets')
    const equitySparklineData = prepareSparklineData(rawStatements?.balance || [], 'totalStockholdersEquity')
    const cashSparklineData = prepareSparklineData(rawStatements?.balance || [], 'cashAndCashEquivalents')

    return (
      <div className="space-y-6">
        
        {/* ✅ BALANCE SHEET METRICS BAR MIT DEUTSCHER FORMATIERUNG */}
        <div className="bg-theme-card rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1 flex items-center gap-2">
                {formatFinancialNumber(totalAssets)}
                <LearnTooltipButton term="Bilanzsumme" />
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.total_assets}</div>
              {previousData && (
                <GrowthIndicator current={totalAssets} previous={previousData.totalAssets} />
              )}
            </div>
            
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1 flex items-center gap-2">
                {formatFinancialNumber(totalEquity)}
                <LearnTooltipButton term="Eigenkapital" />
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.total_equity}</div>
              {previousData && (
                <GrowthIndicator current={totalEquity} previous={previousData.totalStockholdersEquity} />
              )}
            </div>
            
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1 flex items-center gap-2">
                {new Intl.NumberFormat('de-DE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(debtToEquity)}
                <LearnTooltipButton term="Verschuldungsgrad" />
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.debt_to_equity}</div>
              <div className="text-xs text-theme-muted">
                Fremdkapital / Eigenkapital
              </div>
            </div>
          </div>
        </div>

        {/* ✅ BALANCE SHEET TABLE MIT DEUTSCHER FORMATIERUNG */}
        <div className="bg-theme-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th style={{width: '35%'}}>
                    {GERMAN_LABELS.balance}
                  </th>
                  {balanceData.map((item) => (
                    <th key={item.date} className="text-center">
                      {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                
                {/* CURRENT ASSETS SECTION */}
                <tr>
                  <td colSpan={balanceData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.current_assets}
                  </td>
                </tr>
                
                {/* Cash and Cash Equivalents MIT SPARKLINE UND LEARN TOOLTIP */}
                <tr>
                  <td className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <SparklineTooltip
                      data={cashSparklineData}
                      value={formatFinancialNumber(latestData?.cashAndCashEquivalents || 0)}
                      label={GERMAN_LABELS.cash_and_equivalents}
                      color="#3b82f6"
                      growth={previousData && <GrowthIndicator current={latestData?.cashAndCashEquivalents || 0} previous={previousData?.cashAndCashEquivalents || 0} />}
                    >
                      <span className="cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-2">
                        {GERMAN_LABELS.cash_and_equivalents}
                        <LearnTooltipButton term="Liquide Mittel" />
                      </span>
                    </SparklineTooltip>
                  </td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.cashAndCashEquivalents || 0)}
                    </td>
                  ))}
                </tr>

                {/* Weitere Balance Sheet Items - alle mit deutscher Formatierung */}
                <tr>
                  <td>{GERMAN_LABELS.short_term_investments}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.shortTermInvestments || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.accounts_receivable}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.netReceivables || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.inventory}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.inventory || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.prepaid_expenses}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.prepaidExpenses || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.other_current_assets}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherCurrentAssets || 0)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-blue-500/5">
                  <td className="font-semibold">{GERMAN_LABELS.total_current_assets}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.totalCurrentAssets || 0)}
                    </td>
                  ))}
                </tr>

                {/* NON-CURRENT ASSETS */}
                <tr>
                  <td colSpan={balanceData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.non_current_assets}
                  </td>
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.net_property_plant_equipment}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.propertyPlantEquipmentNet || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.goodwill}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.goodwill || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.intangible_assets}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.intangibleAssets || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.long_term_investments}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.longTermInvestments || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.other_long_term_assets}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherNonCurrentAssets || 0)}
                    </td>
                  ))}
                </tr>

                {/* Total Assets MIT SPARKLINE UND LEARN TOOLTIP */}
                <tr className="bg-green-500/5">
                  <td className="font-bold text-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <SparklineTooltip
                      data={assetsSparklineData}
                      value={formatFinancialNumber(latestData?.totalAssets || 0)}
                      label={GERMAN_LABELS.total_assets_final}
                      color="#8b5cf6"
                      growth={previousData && <GrowthIndicator current={latestData?.totalAssets || 0} previous={previousData?.totalAssets || 0} />}
                    >
                      <span className="cursor-pointer hover:text-purple-400 transition-colors flex items-center gap-2">
                        {GERMAN_LABELS.total_assets_final}
                        <LearnTooltipButton term="Bilanzsumme" />
                      </span>
                    </SparklineTooltip>
                  </td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-bold text-lg">
                      {formatFinancialNumber(item.totalAssets || 0)}
                    </td>
                  ))}
                </tr>

                {/* CURRENT LIABILITIES SECTION */}
                <tr>
                  <td colSpan={balanceData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.current_liabilities}
                  </td>
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.accounts_payable}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.accountPayables || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.accrued_liabilities}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.accruedLiabilities || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.short_term_debt}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.shortTermDebt || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.deferred_revenue}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.deferredRevenue || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.other_current_liabilities}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherCurrentLiabilities || 0)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-red-500/5">
                  <td className="font-semibold flex items-center gap-2">
                    {GERMAN_LABELS.total_current_liabilities}
                    <LearnTooltipButton term="Kurzfristige Verbindlichkeiten" />
                  </td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.totalCurrentLiabilities || 0)}
                    </td>
                  ))}
                </tr>

                {/* NON-CURRENT LIABILITIES */}
                <tr>
                  <td colSpan={balanceData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.non_current_liabilities}
                  </td>
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.long_term_debt}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.longTermDebt || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.deferred_tax_liabilities}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.deferredTaxLiabilitiesNonCurrent || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.other_long_term_liabilities}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherNonCurrentLiabilities || 0)}
                    </td>
                  ))}
                </tr>

                <tr className="bg-red-500/5">
                  <td className="font-semibold flex items-center gap-2">
                    {GERMAN_LABELS.total_liabilities}
                    <LearnTooltipButton term="Langfristige Verbindlichkeiten" />
                  </td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.totalLiabilities || 0)}
                    </td>
                  ))}
                </tr>

                {/* EQUITY SECTION */}
                <tr>
                  <td colSpan={balanceData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.equity_section}
                  </td>
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.common_stock}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.commonStock || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.additional_paid_capital}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.additionalPaidInCapital || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                <td>{GERMAN_LABELS.retained_earnings}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.retainedEarnings || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.treasury_stock}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono text-red-400">
                      {formatFinancialNumber(item.treasuryStock || 0)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td>{GERMAN_LABELS.other_comprehensive_income}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherComprehensiveIncomeLoss || 0)}
                    </td>
                  ))}
                </tr>

                {/* Total Equity MIT SPARKLINE UND LEARN TOOLTIP */}
                <tr className="bg-green-500/5">
                  <td className="font-bold text-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <SparklineTooltip
                      data={equitySparklineData}
                      value={formatFinancialNumber(latestData?.totalStockholdersEquity || 0)}
                      label={GERMAN_LABELS.total_equity_final}
                      color="#f59e0b"
                      growth={previousData && <GrowthIndicator current={latestData?.totalStockholdersEquity || 0} previous={previousData?.totalStockholdersEquity || 0} />}
                    >
                      <span className="cursor-pointer hover:text-green-400 transition-colors flex items-center gap-2">
                        {GERMAN_LABELS.total_equity_final}
                        <LearnTooltipButton term="Eigenkapital" />
                      </span>
                    </SparklineTooltip>
                  </td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-bold text-lg">
                      {formatFinancialNumber(item.totalStockholdersEquity || 0)}
                    </td>
                  ))}
                </tr>

                {/* Total Liabilities + Equity (Check) */}
                <tr className="bg-theme-secondary/20">
                  <td className="font-semibold text-theme-muted">{GERMAN_LABELS.total_liabilities_equity}</td>
                  {balanceData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold text-theme-muted">
                      {formatFinancialNumber((item.totalLiabilities || 0) + (item.totalStockholdersEquity || 0))}
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ✅ CASH FLOW MIT DEUTSCHER FORMATIERUNG
  const renderCashFlow = () => {
    const cashflowData = rawStatements?.cashflow?.slice(0, yearsToShow).reverse() || []
    
    if (!cashflowData || cashflowData.length === 0) {
      return (
        <div className="text-center py-16">
          <InformationCircleIcon className="w-16 h-16 mx-auto mb-4 text-theme-muted opacity-50" />
          <p className="text-theme-secondary">Keine Cash Flow-Daten verfügbar</p>
        </div>
      )
    }

    // Key metrics
    const latestData = cashflowData[cashflowData.length - 1]
    const previousData = cashflowData[cashflowData.length - 2]
    
    const operatingCF = latestData?.netCashProvidedByOperatingActivities || 0
    const freeCF = latestData?.freeCashFlow || 0
    const netIncome = latestData?.netIncome || 0
    const cashConversion = netIncome > 0 ? (operatingCF / netIncome) * 100 : 0

    // ✅ SPARKLINE DATA FOR CASH FLOW
    const operatingCFSparklineData = prepareSparklineData(rawStatements?.cashflow || [], 'netCashProvidedByOperatingActivities')
    const freeCFSparklineData = prepareSparklineData(rawStatements?.cashflow || [], 'freeCashFlow')

    return (
      <div className="space-y-6">
        
        {/* ✅ CASH FLOW METRICS BAR MIT DEUTSCHER FORMATIERUNG */}
        <div className="bg-theme-card rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {formatFinancialNumber(operatingCF)}
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.operating_cash_flow}</div>
              {previousData && (
                <GrowthIndicator current={operatingCF} previous={previousData.netCashProvidedByOperatingActivities} />
              )}
            </div>
            
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {formatFinancialNumber(freeCF)}
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.free_cash_flow}</div>
              {previousData && (
                <GrowthIndicator current={freeCF} previous={previousData.freeCashFlow} />
              )}
            </div>
            
            <div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {new Intl.NumberFormat('de-DE', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(cashConversion)}%
              </div>
              <div className="text-sm text-theme-muted mb-1">{GERMAN_LABELS.cash_conversion}</div>
              <div className="text-xs text-theme-muted">
                Operativer CF / Nettogewinn
              </div>
            </div>
          </div>
        </div>

        {/* ✅ CASH FLOW TABLE MIT DEUTSCHER FORMATIERUNG */}
        <div className="bg-theme-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th style={{width: '35%'}}>
                    {GERMAN_LABELS.cashflow}
                  </th>
                  {cashflowData.map((item) => (
                    <th key={item.date} className="text-center">
                      {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                
                {/* OPERATING ACTIVITIES */}
                <tr>
                  <td colSpan={cashflowData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.operating_activities}
                  </td>
                </tr>
                
                {/* Net Income */}
                <tr>
                  <td className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    {GERMAN_LABELS.net_income_cf}
                  </td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.netIncome || 0)}
                    </td>
                  ))}
                </tr>

                {/* Depreciation & Amortization */}
                <tr>
                  <td>{GERMAN_LABELS.depreciation_amortization_cf}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.depreciationAndAmortization || 0)}
                    </td>
                  ))}
                </tr>

                {/* Stock-based Compensation */}
                <tr>
                  <td>{GERMAN_LABELS.stock_compensation}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.stockBasedCompensation || 0)}
                    </td>
                  ))}
                </tr>

                {/* Deferred Taxes */}
                <tr>
                  <td>{GERMAN_LABELS.deferred_taxes}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.deferredIncomeTax || 0)}
                    </td>
                  ))}
                </tr>

                {/* Changes in Working Capital */}
                <tr>
                  <td>{GERMAN_LABELS.changes_working_capital}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.changeInWorkingCapital || 0)}
                    </td>
                  ))}
                </tr>

                {/* Accounts Receivable Change */}
                <tr>
                  <td className="pl-8">{GERMAN_LABELS.accounts_receivable_change}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono text-theme-muted">
                      {formatFinancialNumber(item.accountsReceivables || 0)}
                    </td>
                  ))}
                </tr>

                {/* Inventory Change */}
                <tr>
                  <td className="pl-8">{GERMAN_LABELS.inventory_change}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono text-theme-muted">
                      {formatFinancialNumber(item.inventory || 0)}
                    </td>
                  ))}
                </tr>

                {/* Accounts Payable Change */}
                <tr>
                  <td className="pl-8">{GERMAN_LABELS.accounts_payable_change}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono text-theme-muted">
                      {formatFinancialNumber(item.accountsPayables || 0)}
                    </td>
                  ))}
                </tr>

                {/* Other Operating Activities */}
                <tr>
                  <td>{GERMAN_LABELS.other_operating_activities}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherOperatingActivites || 0)}
                    </td>
                  ))}
                </tr>

                {/* Operating Cash Flow MIT SPARKLINE */}
                <tr className="bg-blue-500/5">
                  <td className="font-bold flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <SparklineTooltip
                      data={operatingCFSparklineData}
                      value={formatFinancialNumber(latestData?.netCashProvidedByOperatingActivities || 0)}
                      label={GERMAN_LABELS.operating_cash_flow_final}
                      color="#06b6d4"
                      growth={previousData && <GrowthIndicator current={latestData?.netCashProvidedByOperatingActivities || 0} previous={previousData?.netCashProvidedByOperatingActivities || 0} />}
                    >
                      <span className="cursor-pointer hover:text-cyan-400 transition-colors">
                        {GERMAN_LABELS.operating_cash_flow_final}
                      </span>
                    </SparklineTooltip>
                  </td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-bold">
                      {formatFinancialNumber(item.netCashProvidedByOperatingActivities || 0)}
                    </td>
                  ))}
                </tr>

                {/* INVESTING ACTIVITIES */}
                <tr>
                  <td colSpan={cashflowData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.investing_activities}
                  </td>
                </tr>

                {/* Capital Expenditures */}
                <tr>
                  <td>{GERMAN_LABELS.capital_expenditures}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.capitalExpenditure || 0)}
                    </td>
                  ))}
                </tr>

                {/* Acquisitions */}
                <tr>
                  <td>{GERMAN_LABELS.acquisitions}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.acquisitionsNet || 0)}
                    </td>
                  ))}
                </tr>

                {/* Investments Purchases */}
                <tr>
                  <td>{GERMAN_LABELS.investments_purchases}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.purchasesOfInvestments || 0)}
                    </td>
                  ))}
                </tr>

                {/* Investments Sales */}
                <tr>
                  <td>{GERMAN_LABELS.investments_sales}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.salesMaturitiesOfInvestments || 0)}
                    </td>
                  ))}
                </tr>

                {/* Other Investing Activities */}
                <tr>
                  <td>{GERMAN_LABELS.other_investing_activities}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherInvestingActivites || 0)}
                    </td>
                  ))}
                </tr>

                {/* Investing Cash Flow */}
                <tr className="bg-orange-500/5">
                  <td className="font-semibold">{GERMAN_LABELS.investing_cash_flow}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.netCashUsedForInvestingActivites || 0)}
                    </td>
                  ))}
                </tr>

                {/* FINANCING ACTIVITIES */}
                <tr>
                  <td colSpan={cashflowData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.financing_activities}
                  </td>
                </tr>

                {/* Debt Proceeds */}
                <tr>
                  <td>{GERMAN_LABELS.debt_proceeds}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.proceedsFromIssuanceOfLongTermDebt || 0)}
                    </td>
                  ))}
                </tr>

                {/* Debt Repayment */}
                <tr>
                  <td>{GERMAN_LABELS.debt_repayment}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.debtRepayment || 0)}
                    </td>
                  ))}
                </tr>

                {/* Dividends Paid */}
                <tr>
                  <td>{GERMAN_LABELS.dividends_paid}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.dividendsPaid || 0)}
                    </td>
                  ))}
                </tr>

                {/* Share Repurchases */}
                <tr>
                  <td>{GERMAN_LABELS.share_repurchases}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.commonStockRepurchased || 0)}
                    </td>
                  ))}
                </tr>

                {/* Share Issuance */}
                <tr>
                  <td>{GERMAN_LABELS.share_issuance}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.proceedsFromIssuanceOfCommonStock || 0)}
                    </td>
                  ))}
                </tr>

                {/* Other Financing Activities */}
                <tr>
                  <td>{GERMAN_LABELS.other_financing_activities}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.otherFinancingActivites || 0)}
                    </td>
                  ))}
                </tr>

                {/* Financing Cash Flow */}
                <tr className="bg-purple-500/5">
                  <td className="font-semibold">{GERMAN_LABELS.financing_cash_flow}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.netCashUsedProvidedByFinancingActivities || 0)}
                    </td>
                  ))}
                </tr>

                {/* NET CASH FLOW */}
                <tr className="bg-green-500/5">
                  <td className="font-bold text-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    {GERMAN_LABELS.net_cash_flow}
                  </td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-bold text-lg">
                      {formatFinancialNumber(item.netChangeInCash || 0)}
                    </td>
                  ))}
                </tr>

                {/* Beginning Cash */}
                <tr>
                  <td className="text-theme-muted">{GERMAN_LABELS.beginning_cash}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono text-theme-muted">
                      {formatFinancialNumber(item.cashAtBeginningOfPeriod || 0)}
                    </td>
                  ))}
                </tr>

                {/* Ending Cash */}
                <tr>
                  <td className="text-theme-muted">{GERMAN_LABELS.ending_cash}</td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono text-theme-muted">
                      {formatFinancialNumber(item.cashAtEndOfPeriod || 0)}
                    </td>
                  ))}
                </tr>

                {/* FREE CASH FLOW MIT SPARKLINE */}
                <tr className="bg-blue-500/5">
                  <td className="font-bold flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <SparklineTooltip
                      data={freeCFSparklineData}
                      value={formatFinancialNumber(latestData?.freeCashFlow || 0)}
                      label={GERMAN_LABELS.free_cash_flow_calc}
                      color="#8b5cf6"
                      growth={previousData && <GrowthIndicator current={latestData?.freeCashFlow || 0} previous={previousData?.freeCashFlow || 0} />}
                    >
                      <span className="cursor-pointer hover:text-purple-400 transition-colors">
                        {GERMAN_LABELS.free_cash_flow_calc}
                      </span>
                    </SparklineTooltip>
                  </td>
                  {cashflowData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-bold">
                      {formatFinancialNumber(item.freeCashFlow || 0)}
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
 

      {/* ✅ MAIN CONTENT */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Info Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <p className="text-theme-secondary">
              {GERMAN_LABELS.comprehensive_analysis} <span className="font-semibold text-green-400">{ticker.toUpperCase()}</span>
            </p>
            <div className="text-sm text-theme-muted mt-1">
            {GERMAN_LABELS.all_figures.replace('{unit}', 'USD')} • {GERMAN_LABELS.daily_updated}
            </div>
          </div>
        </div>

        {/* ✅ CONTROLS */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          
          {/* Period Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-theme-secondary font-medium">Periode:</span>
            <div className="flex bg-theme-tertiary/50 border border-theme/20 rounded-lg p-0.5">
              {(['annual', 'quarterly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    period === p 
                      ? 'bg-green-500 text-white shadow-sm' 
                      : 'text-theme-secondary hover:text-green-600 hover:bg-green-500/10'
                  }`}
                >
                  {p === 'annual' ? GERMAN_LABELS.annual : GERMAN_LABELS.quarterly}
                </button>
              ))}
            </div>
          </div>
          
          {/* Years Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsYearsDropdownOpen(!isYearsDropdownOpen)
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-theme-tertiary/50 border border-theme/20 rounded-lg text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-hover transition-all duration-200"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{yearsToShow} Jahre</span>
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${isYearsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isYearsDropdownOpen && (
              <div 
                className="absolute top-10 left-0 w-36 bg-theme-card border border-theme/20 rounded-lg shadow-lg py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {[3, 5, 10].map((years) => (
                  <button
                    key={years}
                    onClick={() => {
                      setYearsToShow(years)
                      setIsYearsDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                      yearsToShow === years 
                        ? 'bg-green-500/15 text-green-400 font-medium' 
                        : 'text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
                    }`}
                  >
                    {years} Jahre anzeigen
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Status */}
          <div className="text-xs text-theme-muted">
          {yearsToShow} Jahre • USD • FMP Native
          </div>
        </div>

        {/* ✅ TABS */}
        <div className="border-b border-theme/20">
          <div className="flex space-x-8">
            {[
              { key: 'income', label: GERMAN_LABELS.income, icon: DocumentTextIcon },
              { key: 'balance', label: GERMAN_LABELS.balance, icon: ChartBarIcon },
              { key: 'cashflow', label: GERMAN_LABELS.cashflow, icon: BanknotesIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveStatement(key as any)}
                className={`group flex items-center gap-2 px-1 py-3 text-sm font-medium transition-all duration-200 relative ${
                  activeStatement === key
                    ? 'text-green-400'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                
                {activeStatement === key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ CONTENT */}
        <div>
          <PremiumBlur>
            {!rawStatements ? (
              <div className="text-center py-16">
                <InformationCircleIcon className="w-20 h-20 text-red-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-theme-primary mb-3">Keine Daten verfügbar</h3>
                <p className="text-theme-secondary">
                  Finanzdaten für {ticker.toUpperCase()} konnten nicht geladen werden.
                </p>
              </div>
            ) : (
              <>
                {activeStatement === 'income' && renderIncomeStatement()}
                {activeStatement === 'balance' && renderBalanceSheet()}
                {activeStatement === 'cashflow' && renderCashFlow()}
              </>
            )}
          </PremiumBlur>
        </div>
      </main>
      
      {/* ✅ LEARN SIDEBAR */}
      <LearnSidebar />
    </div>
  )
}