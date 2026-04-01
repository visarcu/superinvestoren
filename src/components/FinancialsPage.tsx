// src/components/FinancialsPage.tsx - TERMINAL STYLE REDESIGN
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
  ChevronDownIcon,
  CalendarIcon,
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

// SparklineTooltip - Terminal Style
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
          <div className="bg-theme-card border border-theme rounded-lg shadow-xl p-4 min-w-[280px]">

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-theme-primary text-sm">{label}</h4>
              <div className="text-right">
                <div className="font-semibold text-theme-primary">{value}</div>
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
                    tick={{ fontSize: 10, fill: '#737373' }}
                  />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Mini Stats */}
            <div className="flex justify-between text-xs text-theme-muted mt-2 pt-2 border-t border-theme">
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

// Deutsche Labels
const GERMAN_LABELS = {
  financial_statements: 'Financial Statements',
  comprehensive_analysis: 'Umfassende Finanzanalyse für',
  all_figures: 'Alle Zahlen in {unit}. Wachstumsraten beziehen sich auf das Vorjahr.',
  daily_updated: 'Täglich aktualisiert',
  income: 'Gewinn- und Verlustrechnung',
  balance: 'Bilanz',
  cashflow: 'Cash Flow',
  annual: 'Jährlich',
  quarterly: 'Quartalsweise',
  revenue_trend: 'Umsatztrend',
  net_income: 'Nettogewinn',
  profit_margin: 'Gewinnmarge',
  total_assets: 'Bilanzsumme',
  total_equity: 'Eigenkapital',
  debt_to_equity: 'Verschuldungsgrad',
  operating_cash_flow: 'Operativer Cash Flow',
  free_cash_flow: 'Freier Cash Flow',
  cash_conversion: 'Cash Conversion',
  revenue_growth: 'UMSATZ & WACHSTUM',
  profitability: 'PROFITABILITÄT',
  operating_metrics: 'BETRIEBSKENNZAHLEN',
  financial_results: 'FINANZERGEBNIS',
  per_share: 'JE AKTIE',
  current_assets: 'UMLAUFVERMÖGEN',
  non_current_assets: 'ANLAGEVERMÖGEN',
  current_liabilities: 'KURZFRISTIGE VERBINDLICHKEITEN',
  non_current_liabilities: 'LANGFRISTIGE VERBINDLICHKEITEN',
  equity_section: 'EIGENKAPITAL',
  operating_activities: 'OPERATIVER CASH FLOW',
  investing_activities: 'INVESTITIONSTÄTIGKEIT',
  financing_activities: 'FINANZIERUNGSTÄTIGKEIT',
  total_revenues: 'Gesamtumsatz',
  total_revenues_chg: 'Umsatzwachstum %',
  cost_of_goods_sold: 'Herstellungskosten',
  gross_profit: 'Bruttoergebnis vom Umsatz',
  gross_profit_margin: 'Bruttomarge',
  total_operating_expenses: 'Betriebliche Aufwendungen gesamt',
  selling_admin_expenses: 'Vertriebs- & Verwaltungskosten',
  rd_expenses: 'Forschung & Entwicklung',
  depreciation_amortization: 'Abschreibungen',
  other_operating_expenses: 'Sonstige Betriebskosten',
  operating_income: 'Betriebsgewinn',
  operating_margin: 'Betriebsmarge',
  ebit: 'EBIT',
  ebitda: 'EBITDA',
  interest_expense: 'Zinsaufwand',
  interest_income: 'Zinserträge',
  net_interest_expense: 'Netto Zinsaufwand',
  other_income: 'Sonstige Erträge/Aufwendungen',
  pretax_income: 'Ergebnis vor Steuern',
  income_tax_expense: 'Steuerrückstellung',
  effective_tax_rate: 'Effektiver Steuersatz',
  net_income_final: 'Jahresüberschuss',
  net_margin: 'Nettomarge',
  earnings_per_share: 'Unvermässertes EPS',
  eps_diluted: 'Verwässertes EPS',
  shares_outstanding: 'Durchschnittl. Aktien unvermässert (Mio.)',
  shares_outstanding_diluted: 'Durchschnittl. Aktien verwässert (Mio.)',
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
  common_stock: 'Stammaktien',
  additional_paid_capital: 'Kapitalrücklage',
  retained_earnings: 'Gewinnrücklagen',
  treasury_stock: 'Eigene Aktien',
  other_comprehensive_income: 'Sonstiges Gesamtergebnis',
  total_equity_final: 'Eigenkapital gesamt',
  total_liabilities_equity: 'Passiva gesamt',
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
  vs_prev_year: 'vs. Vorjahr'
}

// Growth Indicator - subtiler
const GrowthIndicator = ({ current, previous }: {
  current: number,
  previous: number
}) => {
  if (!current || !previous) return null

  const growth = ((current - previous) / previous) * 100
  const isPositive = growth >= 0

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${
      isPositive ? 'text-emerald-400' : 'text-red-400'
    }`}>
      {isPositive ? '↗' : '↘'}
      {isPositive ? '+' : ''}{growth.toFixed(1)}%
    </span>
  )
}

export default function FinancialsPage({ ticker, isPremium = false }: Props) {
  const [activeStatement, setActiveStatement] = useState<'income' | 'balance' | 'cashflow'>('income')
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
  const [yearsToShow, setYearsToShow] = useState<number>(isPremium ? 10 : 5)
  const [isYearsDropdownOpen, setIsYearsDropdownOpen] = useState(false)
  const [rawStatements, setRawStatements] = useState<RawStatements | null>(null)
  const [loading, setLoading] = useState(true)

  const { formatAxisValueDE } = useCurrency()

  const formatFinancialNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return '–'
    return formatAxisValueDE(value)
  }

  const stock = stocks.find(s => s.ticker === ticker.toUpperCase())

  useEffect(() => {
    async function loadFinancials() {
      setLoading(true)
      try {
        const limit = period === 'quarterly' ? yearsToShow * 4 : yearsToShow
        const response = await fetch(`/api/financials/${ticker}?period=${period}&limit=${limit}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const data = await response.json()
        if (data.rawStatements) {
          setRawStatements(data.rawStatements)
        } else {
          setRawStatements(null)
        }
      } catch (error) {
        console.error('Failed to load financials:', error)
        setRawStatements(null)
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      loadFinancials()
    }
  }, [ticker, period, yearsToShow])

  useEffect(() => {
    const handleClickOutside = () => setIsYearsDropdownOpen(false)
    if (isYearsDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isYearsDropdownOpen])

  const prepareSparklineData = (data: any[], valueKey: string) => {
    if (!data || data.length === 0) return []

    return data.slice(0, yearsToShow).reverse().map((item) => ({
      year: period === 'annual' ? String(item.calendarYear) : item.date.slice(0, 7),
      value: item[valueKey] || 0
    }))
  }

  const PremiumBlur = ({ children }: { children: React.ReactNode }) => {
    if (isPremium) return <>{children}</>

    return (
      <div className="relative">
        <div className="filter blur-sm opacity-50 pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Link
            href="/pricing"
            className="flex items-center gap-3 px-5 py-3 bg-theme-card/95 backdrop-blur-sm border border-amber-500/30 rounded-xl shadow-xl hover:border-amber-500/50 hover:bg-theme-card transition-all hover:scale-105"
          >
            <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <LockClosedIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-theme-primary font-semibold text-sm">Financial Statements</p>
              <p className="text-amber-400 text-xs font-medium">Premium freischalten →</p>
            </div>
          </Link>
        </div>
      </div>
    )
  }

  // Income Statement
  const renderIncomeStatement = () => {
    const incomeData = rawStatements?.income?.slice(0, yearsToShow) || []

    if (!incomeData || incomeData.length === 0) {
      return (
        <div className="text-center py-16">
          <InformationCircleIcon className="w-12 h-12 mx-auto mb-4 text-theme-muted" />
          <p className="text-theme-muted">Keine Daten verfügbar</p>
        </div>
      )
    }

    const latestData = incomeData[0]
    const previousData = incomeData[1]

    const revenue = latestData?.revenue || 0
    const netIncome = latestData?.netIncome || 0
    const profitMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0

    const revenueSparklineData = prepareSparklineData(rawStatements?.income || [], 'revenue')
    const netIncomeSparklineData = prepareSparklineData(rawStatements?.income || [], 'netIncome')
    const ebitdaSparklineData = prepareSparklineData(rawStatements?.income || [], 'ebitda')

    return (
      <div className="space-y-6">

        {/* Inline Stats Bar */}
        <div className="grid grid-cols-3 divide-x divide-theme bg-theme-secondary rounded-xl border border-theme shadow-sm">
          <div className="p-5 pl-6">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1">{GERMAN_LABELS.revenue_trend}</p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{formatFinancialNumber(revenue)}</p>
            {previousData && <div className="mt-1"><GrowthIndicator current={revenue} previous={previousData.revenue} /></div>}
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1">{GERMAN_LABELS.net_income}</p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{formatFinancialNumber(netIncome)}</p>
            {previousData && <div className="mt-1"><GrowthIndicator current={netIncome} previous={previousData.netIncome} /></div>}
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1">{GERMAN_LABELS.profit_margin}</p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{profitMargin.toFixed(1)}%</p>
            <p className="text-xs text-theme-muted mt-1">Nettogewinn / Umsatz</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-theme bg-theme-card shadow-sm">
          <table className="w-full text-sm financial-table">
            <thead>
              <tr className="border-b-2 border-theme bg-theme-secondary/50">
                <th className="text-left py-3 px-3 text-theme-secondary font-semibold text-xs uppercase tracking-wider" style={{width: '35%'}}>
                  {GERMAN_LABELS.income}
                </th>
                {incomeData.map((item) => (
                  <th key={item.date} className="text-right py-3 px-2 text-theme-secondary font-semibold text-xs">
                    {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* Revenue Section */}
              <tr>
                <td colSpan={incomeData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.revenue_growth}
                  </span>
                </td>
              </tr>

              {/* Total Revenues */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">
                  <SparklineTooltip
                    data={revenueSparklineData}
                    value={formatFinancialNumber(latestData?.revenue || 0)}
                    label={GERMAN_LABELS.total_revenues}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.revenue || 0} previous={previousData?.revenue || 0} />}
                  >
                    <span className="cursor-pointer hover:text-theme-primary transition-colors">
                      {GERMAN_LABELS.total_revenues}
                    </span>
                  </SparklineTooltip>
                </td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.revenue)}
                  </td>
                ))}
              </tr>

              {/* Revenue Growth % */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-muted pl-4 italic text-sm">
                  {GERMAN_LABELS.total_revenues_chg}
                </td>
                {incomeData.map((item, index) => {
                  if (index === incomeData.length - 1) return <td key={item.date} className="py-3 text-center text-theme-muted">–</td>
                  const prevYear = incomeData[index + 1]
                  const growth = ((item.revenue - prevYear.revenue) / Math.abs(prevYear.revenue)) * 100
                  return (
                    <td key={item.date} className={`py-3 font-mono tabular-nums text-right ${
                      growth >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                    </td>
                  )
                })}
              </tr>

              {/* Cost of Goods Sold */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.cost_of_goods_sold}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.costOfRevenue || (item.revenue - item.grossProfit))}
                  </td>
                ))}
              </tr>

              {/* Gross Profit - Highlighted */}
              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary">
                  <SparklineTooltip
                    data={prepareSparklineData(rawStatements?.income || [], 'grossProfit')}
                    value={formatFinancialNumber(latestData?.grossProfit || 0)}
                    label={GERMAN_LABELS.gross_profit}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.grossProfit || 0} previous={previousData?.grossProfit || 0} />}
                  >
                    <span className="cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-2">
                      {GERMAN_LABELS.gross_profit}
                      <LearnTooltipButton term="Bruttomarge" />
                    </span>
                  </SparklineTooltip>
                </td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.grossProfit)}
                  </td>
                ))}
              </tr>

              {/* Gross Margin */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-muted pl-4 italic text-sm">{GERMAN_LABELS.gross_profit_margin}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                    {((item.grossProfit / item.revenue) * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* Operating Expenses Section */}
              <tr>
                <td colSpan={incomeData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.operating_metrics}
                  </span>
                </td>
              </tr>

              {/* Total Operating Expenses */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.total_operating_expenses}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.totalOperatingExpenses || 0)}
                  </td>
                ))}
              </tr>

              {/* Selling & Admin */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-secondary pl-4">{GERMAN_LABELS.selling_admin_expenses}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.sellingGeneralAndAdministrativeExpenses || 0)}
                  </td>
                ))}
              </tr>

              {/* R&D */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-secondary pl-4">{GERMAN_LABELS.rd_expenses}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.researchAndDevelopmentExpenses || 0)}
                  </td>
                ))}
              </tr>

              {/* D&A */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-secondary pl-4">{GERMAN_LABELS.depreciation_amortization}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.depreciationAndAmortization || 0)}
                  </td>
                ))}
              </tr>

              {/* Operating Income - Highlighted */}
              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary">
                  <SparklineTooltip
                    data={prepareSparklineData(rawStatements?.income || [], 'operatingIncome')}
                    value={formatFinancialNumber(latestData?.operatingIncome || 0)}
                    label={GERMAN_LABELS.operating_income}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.operatingIncome || 0} previous={previousData?.operatingIncome || 0} />}
                  >
                    <span className="cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-2">
                      {GERMAN_LABELS.operating_income}
                      <LearnTooltipButton term="Operating Margin" />
                    </span>
                  </SparklineTooltip>
                </td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.operatingIncome)}
                  </td>
                ))}
              </tr>

              {/* Operating Margin */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-muted pl-4 italic text-sm">{GERMAN_LABELS.operating_margin}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                    {((item.operatingIncome / item.revenue) * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* EBIT */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary flex items-center gap-2">
                  {GERMAN_LABELS.ebit}
                  <LearnTooltipButton term="EBIT" />
                </td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.ebitda ? (item.ebitda - (item.depreciationAndAmortization || 0)) : item.operatingIncome)}
                  </td>
                ))}
              </tr>

              {/* EBITDA */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">
                  <SparklineTooltip
                    data={ebitdaSparklineData}
                    value={formatFinancialNumber(latestData?.ebitda || 0)}
                    label={GERMAN_LABELS.ebitda}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.ebitda || 0} previous={previousData?.ebitda || 0} />}
                  >
                    <span className="cursor-pointer hover:text-theme-primary transition-colors flex items-center gap-2">
                      {GERMAN_LABELS.ebitda}
                      <LearnTooltipButton term="EBITDA" />
                    </span>
                  </SparklineTooltip>
                </td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.ebitda || 0)}
                  </td>
                ))}
              </tr>

              {/* Financial Results Section */}
              <tr>
                <td colSpan={incomeData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.financial_results}
                  </span>
                </td>
              </tr>

              {/* Interest Income */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.interest_income}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.interestIncome || 0)}
                  </td>
                ))}
              </tr>

              {/* Interest Expense */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.interest_expense}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                    {formatFinancialNumber(Math.abs(item.interestExpense || 0))}
                  </td>
                ))}
              </tr>

              {/* Net Interest */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.net_interest_expense}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber((item.interestIncome || 0) + (item.interestExpense || 0))}
                  </td>
                ))}
              </tr>

              {/* Other Income */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.other_income}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.otherIncomeExpense || 0)}
                  </td>
                ))}
              </tr>

              {/* Pre-Tax Income */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary font-medium">{GERMAN_LABELS.pretax_income}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.incomeBeforeTax || 0)}
                  </td>
                ))}
              </tr>

              {/* Tax Expense */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.income_tax_expense}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.incomeTaxExpense || 0)}
                  </td>
                ))}
              </tr>

              {/* Effective Tax Rate */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-muted pl-4 italic text-sm">{GERMAN_LABELS.effective_tax_rate}</td>
                {incomeData.map((item) => {
                  const taxRate = item.incomeBeforeTax && item.incomeBeforeTax > 0
                    ? ((item.incomeTaxExpense || 0) / item.incomeBeforeTax) * 100
                    : 0
                  return (
                    <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                      {taxRate.toFixed(1)}%
                    </td>
                  )
                })}
              </tr>

              {/* Net Income - Major Highlight */}
              <tr className="border-b border-theme bg-theme-tertiary/50">
                <td className="py-4 font-semibold text-theme-primary">
                  <SparklineTooltip
                    data={netIncomeSparklineData}
                    value={formatFinancialNumber(latestData?.netIncome || 0)}
                    label={GERMAN_LABELS.net_income_final}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.netIncome || 0} previous={previousData?.netIncome || 0} />}
                  >
                    <span className="cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-2">
                      {GERMAN_LABELS.net_income_final}
                      <LearnTooltipButton term="Net Margin" />
                    </span>
                  </SparklineTooltip>
                </td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-4 text-theme-primary font-mono tabular-nums text-right font-semibold text-base">
                    {formatFinancialNumber(item.netIncome)}
                  </td>
                ))}
              </tr>

              {/* Net Margin */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-muted pl-4 italic text-sm">{GERMAN_LABELS.net_margin}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                    {((item.netIncome / item.revenue) * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* Per Share Section */}
              <tr>
                <td colSpan={incomeData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.per_share}
                  </span>
                </td>
              </tr>

              {/* Basic EPS */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.earnings_per_share}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {item.eps ? `${item.eps.toFixed(2)} $` : '–'}
                  </td>
                ))}
              </tr>

              {/* Diluted EPS */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.eps_diluted}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {(item.epsdiluted || item.eps) ? `${(item.epsdiluted || item.eps).toFixed(2)} $` : '–'}
                  </td>
                ))}
              </tr>

              {/* Shares Outstanding */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-secondary">{GERMAN_LABELS.shares_outstanding}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                    {((item.weightedAverageShsOut || 0) / 1_000_000).toFixed(0)}
                  </td>
                ))}
              </tr>

              {/* Diluted Shares */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-secondary">{GERMAN_LABELS.shares_outstanding_diluted}</td>
                {incomeData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                    {((item.weightedAverageShsOutDil || item.weightedAverageShsOut || 0) / 1_000_000).toFixed(0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Balance Sheet
  const renderBalanceSheet = () => {
    const balanceData = rawStatements?.balance?.slice(0, yearsToShow) || []

    if (!balanceData || balanceData.length === 0) {
      return (
        <div className="text-center py-16">
          <InformationCircleIcon className="w-12 h-12 mx-auto mb-4 text-theme-muted" />
          <p className="text-theme-muted">Keine Bilanz-Daten verfügbar</p>
        </div>
      )
    }

    const latestData = balanceData[0]
    const previousData = balanceData[1]

    const totalAssets = latestData?.totalAssets || 0
    const totalEquity = latestData?.totalStockholdersEquity || 0
    const totalDebt = latestData?.totalDebt || 0
    const debtToEquity = totalEquity > 0 ? totalDebt / totalEquity : 0

    const assetsSparklineData = prepareSparklineData(rawStatements?.balance || [], 'totalAssets')
    const equitySparklineData = prepareSparklineData(rawStatements?.balance || [], 'totalStockholdersEquity')
    const cashSparklineData = prepareSparklineData(rawStatements?.balance || [], 'cashAndCashEquivalents')

    return (
      <div className="space-y-6">

        {/* Inline Stats Bar */}
        <div className="grid grid-cols-3 divide-x divide-theme bg-theme-secondary rounded-xl border border-theme shadow-sm">
          <div className="p-5 pl-6">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1 flex items-center gap-1">{GERMAN_LABELS.total_assets} <LearnTooltipButton term="Bilanzsumme" /></p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{formatFinancialNumber(totalAssets)}</p>
            {previousData && <div className="mt-1"><GrowthIndicator current={totalAssets} previous={previousData.totalAssets} /></div>}
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1 flex items-center gap-1">{GERMAN_LABELS.total_equity} <LearnTooltipButton term="Eigenkapital" /></p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{formatFinancialNumber(totalEquity)}</p>
            {previousData && <div className="mt-1"><GrowthIndicator current={totalEquity} previous={previousData.totalStockholdersEquity} /></div>}
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1 flex items-center gap-1">{GERMAN_LABELS.debt_to_equity} <LearnTooltipButton term="Verschuldungsgrad" /></p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{debtToEquity.toFixed(2)}</p>
            <p className="text-xs text-theme-muted mt-1">Fremdkapital / Eigenkapital</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-theme bg-theme-card shadow-sm">
          <table className="w-full text-sm financial-table">
            <thead>
              <tr className="border-b-2 border-theme bg-theme-secondary/50">
                <th className="text-left py-3 px-3 text-theme-secondary font-semibold text-xs uppercase tracking-wider" style={{width: '35%'}}>
                  {GERMAN_LABELS.balance}
                </th>
                {balanceData.map((item) => (
                  <th key={item.date} className="text-right py-3 px-2 text-theme-secondary font-semibold text-xs">
                    {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* Current Assets Section */}
              <tr>
                <td colSpan={balanceData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.current_assets}
                  </span>
                </td>
              </tr>

              {/* Cash */}
              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">
                  <SparklineTooltip
                    data={cashSparklineData}
                    value={formatFinancialNumber(latestData?.cashAndCashEquivalents || 0)}
                    label={GERMAN_LABELS.cash_and_equivalents}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.cashAndCashEquivalents || 0} previous={previousData?.cashAndCashEquivalents || 0} />}
                  >
                    <span className="cursor-pointer hover:text-theme-primary transition-colors flex items-center gap-2">
                      {GERMAN_LABELS.cash_and_equivalents}
                      <LearnTooltipButton term="Liquide Mittel" />
                    </span>
                  </SparklineTooltip>
                </td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.cashAndCashEquivalents || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.short_term_investments}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.shortTermInvestments || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.accounts_receivable}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.netReceivables || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.inventory}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.inventory || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.other_current_assets}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.otherCurrentAssets || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary">{GERMAN_LABELS.total_current_assets}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.totalCurrentAssets || 0)}
                  </td>
                ))}
              </tr>

              {/* Non-Current Assets */}
              <tr>
                <td colSpan={balanceData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.non_current_assets}
                  </span>
                </td>
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.net_property_plant_equipment}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.propertyPlantEquipmentNet || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.goodwill}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.goodwill || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.intangible_assets}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.intangibleAssets || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.long_term_investments}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.longTermInvestments || 0)}
                  </td>
                ))}
              </tr>

              {/* Total Assets - Major */}
              <tr className="border-b border-theme bg-theme-tertiary/50">
                <td className="py-4 font-semibold text-theme-primary">
                  <SparklineTooltip
                    data={assetsSparklineData}
                    value={formatFinancialNumber(latestData?.totalAssets || 0)}
                    label={GERMAN_LABELS.total_assets_final}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.totalAssets || 0} previous={previousData?.totalAssets || 0} />}
                  >
                    <span className="cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-2">
                      {GERMAN_LABELS.total_assets_final}
                      <LearnTooltipButton term="Bilanzsumme" />
                    </span>
                  </SparklineTooltip>
                </td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-4 text-theme-primary font-mono tabular-nums text-right font-semibold text-base">
                    {formatFinancialNumber(item.totalAssets || 0)}
                  </td>
                ))}
              </tr>

              {/* Liabilities Sections - Abbreviated for length */}
              <tr>
                <td colSpan={balanceData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.current_liabilities}
                  </span>
                </td>
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.accounts_payable}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.accountPayables || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.short_term_debt}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.shortTermDebt || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary flex items-center gap-2">
                  {GERMAN_LABELS.total_current_liabilities}
                  <LearnTooltipButton term="Kurzfristige Verbindlichkeiten" />
                </td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.totalCurrentLiabilities || 0)}
                  </td>
                ))}
              </tr>

              {/* Non-Current Liabilities */}
              <tr>
                <td colSpan={balanceData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.non_current_liabilities}
                  </span>
                </td>
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.long_term_debt}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.longTermDebt || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary flex items-center gap-2">
                  {GERMAN_LABELS.total_liabilities}
                  <LearnTooltipButton term="Langfristige Verbindlichkeiten" />
                </td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.totalLiabilities || 0)}
                  </td>
                ))}
              </tr>

              {/* Equity */}
              <tr>
                <td colSpan={balanceData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.equity_section}
                  </span>
                </td>
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.common_stock}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.commonStock || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.retained_earnings}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.retainedEarnings || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.treasury_stock}</td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-secondary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.treasuryStock || 0)}
                  </td>
                ))}
              </tr>

              {/* Total Equity - Major */}
              <tr className="border-b border-theme bg-theme-tertiary/50">
                <td className="py-4 font-semibold text-theme-primary">
                  <SparklineTooltip
                    data={equitySparklineData}
                    value={formatFinancialNumber(latestData?.totalStockholdersEquity || 0)}
                    label={GERMAN_LABELS.total_equity_final}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.totalStockholdersEquity || 0} previous={previousData?.totalStockholdersEquity || 0} />}
                  >
                    <span className="cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-2">
                      {GERMAN_LABELS.total_equity_final}
                      <LearnTooltipButton term="Eigenkapital" />
                    </span>
                  </SparklineTooltip>
                </td>
                {balanceData.map((item) => (
                  <td key={item.date} className="py-4 text-theme-primary font-mono tabular-nums text-right font-semibold text-base">
                    {formatFinancialNumber(item.totalStockholdersEquity || 0)}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Cash Flow Statement
  const renderCashFlow = () => {
    const cashflowData = rawStatements?.cashflow?.slice(0, yearsToShow) || []

    if (!cashflowData || cashflowData.length === 0) {
      return (
        <div className="text-center py-16">
          <InformationCircleIcon className="w-12 h-12 mx-auto mb-4 text-theme-muted" />
          <p className="text-theme-muted">Keine Cash Flow-Daten verfügbar</p>
        </div>
      )
    }

    const latestData = cashflowData[0]
    const previousData = cashflowData[1]

    const operatingCF = latestData?.netCashProvidedByOperatingActivities || 0
    const freeCF = latestData?.freeCashFlow || 0
    const netIncome = latestData?.netIncome || 0
    const cashConversion = netIncome > 0 ? (operatingCF / netIncome) * 100 : 0

    const operatingCFSparklineData = prepareSparklineData(rawStatements?.cashflow || [], 'netCashProvidedByOperatingActivities')
    const freeCFSparklineData = prepareSparklineData(rawStatements?.cashflow || [], 'freeCashFlow')

    return (
      <div className="space-y-6">

        {/* Inline Stats Bar */}
        <div className="grid grid-cols-3 divide-x divide-theme bg-theme-secondary rounded-xl border border-theme shadow-sm">
          <div className="p-5 pl-6">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1">{GERMAN_LABELS.operating_cash_flow}</p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{formatFinancialNumber(operatingCF)}</p>
            {previousData && <div className="mt-1"><GrowthIndicator current={operatingCF} previous={previousData.netCashProvidedByOperatingActivities} /></div>}
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1">{GERMAN_LABELS.free_cash_flow}</p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{formatFinancialNumber(freeCF)}</p>
            {previousData && <div className="mt-1"><GrowthIndicator current={freeCF} previous={previousData.freeCashFlow} /></div>}
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-1">{GERMAN_LABELS.cash_conversion}</p>
            <p className="text-2xl font-bold text-theme-primary font-mono tabular-nums">{cashConversion.toFixed(0)}%</p>
            <p className="text-xs text-theme-muted mt-1">Operativer CF / Nettogewinn</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-theme bg-theme-card shadow-sm">
          <table className="w-full text-sm financial-table">
            <thead>
              <tr className="border-b-2 border-theme bg-theme-secondary/50">
                <th className="text-left py-3 px-3 text-theme-secondary font-semibold text-xs uppercase tracking-wider" style={{width: '35%'}}>
                  {GERMAN_LABELS.cashflow}
                </th>
                {cashflowData.map((item) => (
                  <th key={item.date} className="text-right py-3 px-2 text-theme-secondary font-semibold text-xs">
                    {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              {/* Operating Activities */}
              <tr>
                <td colSpan={cashflowData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.operating_activities}
                  </span>
                </td>
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.net_income_cf}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.netIncome || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.depreciation_amortization_cf}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.depreciationAndAmortization || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.stock_compensation}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.stockBasedCompensation || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.changes_working_capital}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.changeInWorkingCapital || 0)}
                  </td>
                ))}
              </tr>

              {/* Operating Cash Flow - Highlighted */}
              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary">
                  <SparklineTooltip
                    data={operatingCFSparklineData}
                    value={formatFinancialNumber(latestData?.netCashProvidedByOperatingActivities || 0)}
                    label={GERMAN_LABELS.operating_cash_flow_final}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.netCashProvidedByOperatingActivities || 0} previous={previousData?.netCashProvidedByOperatingActivities || 0} />}
                  >
                    <span className="cursor-pointer hover:text-emerald-400 transition-colors">
                      {GERMAN_LABELS.operating_cash_flow_final}
                    </span>
                  </SparklineTooltip>
                </td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.netCashProvidedByOperatingActivities || 0)}
                  </td>
                ))}
              </tr>

              {/* Investing Activities */}
              <tr>
                <td colSpan={cashflowData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.investing_activities}
                  </span>
                </td>
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.capital_expenditures}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.capitalExpenditure || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.acquisitions}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.acquisitionsNet || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary">{GERMAN_LABELS.investing_cash_flow}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.netCashUsedForInvestingActivites || 0)}
                  </td>
                ))}
              </tr>

              {/* Financing Activities */}
              <tr>
                <td colSpan={cashflowData.length + 1} className="pt-6 pb-2 border-t border-theme">
                  <span className="text-[11px] font-semibold text-theme-secondary uppercase tracking-widest pl-2 border-l-2 border-theme-primary">
                    {GERMAN_LABELS.financing_activities}
                  </span>
                </td>
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.dividends_paid}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.dividendsPaid || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light hover:bg-theme-hover">
                <td className="py-3 text-theme-primary">{GERMAN_LABELS.share_repurchases}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right">
                    {formatFinancialNumber(item.commonStockRepurchased || 0)}
                  </td>
                ))}
              </tr>

              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary">{GERMAN_LABELS.financing_cash_flow}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.netCashUsedProvidedByFinancingActivities || 0)}
                  </td>
                ))}
              </tr>

              {/* Net Cash Flow - Major */}
              <tr className="border-b border-theme bg-theme-tertiary/50">
                <td className="py-4 font-semibold text-theme-primary">{GERMAN_LABELS.net_cash_flow}</td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-4 text-theme-primary font-mono tabular-nums text-right font-semibold text-base">
                    {formatFinancialNumber(item.netChangeInCash || 0)}
                  </td>
                ))}
              </tr>

              {/* Free Cash Flow */}
              <tr className="border-b border-theme-light bg-theme-secondary">
                <td className="py-3 font-medium text-theme-primary">
                  <SparklineTooltip
                    data={freeCFSparklineData}
                    value={formatFinancialNumber(latestData?.freeCashFlow || 0)}
                    label={GERMAN_LABELS.free_cash_flow_calc}
                    color="#10b981"
                    growth={previousData && <GrowthIndicator current={latestData?.freeCashFlow || 0} previous={previousData?.freeCashFlow || 0} />}
                  >
                    <span className="cursor-pointer hover:text-emerald-400 transition-colors">
                      {GERMAN_LABELS.free_cash_flow_calc}
                    </span>
                  </SparklineTooltip>
                </td>
                {cashflowData.map((item) => (
                  <td key={item.date} className="py-3 text-theme-primary font-mono tabular-nums text-right font-medium">
                    {formatFinancialNumber(item.freeCashFlow || 0)}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
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
      <main className="w-full px-6 lg:px-8 py-8 space-y-6">

        {/* Info Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-theme-secondary">
              {GERMAN_LABELS.comprehensive_analysis} <span className="font-medium text-theme-primary">{ticker.toUpperCase()}</span>
            </p>
            <p className="text-sm text-theme-muted mt-1">
              {GERMAN_LABELS.all_figures.replace('{unit}', 'USD')} • {GERMAN_LABELS.daily_updated}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between py-4 border-b border-theme">
          <div className="flex items-center gap-4">
            <span className="text-sm text-theme-muted">Periode:</span>
            <div className="flex bg-theme-secondary rounded-lg p-0.5">
              {(['annual', 'quarterly'] as const).map((p) => {
                const isLocked = !isPremium && p === 'quarterly'
                return (
                  <button
                    key={p}
                    onClick={() => isLocked ? (window.location.href = '/pricing') : setPeriod(p)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                      period === p
                        ? 'bg-white text-black'
                        : 'text-theme-secondary hover:text-theme-primary'
                    }`}
                  >
                    {p === 'annual' ? GERMAN_LABELS.annual : GERMAN_LABELS.quarterly}
                    {isLocked && (
                      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Years Selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsYearsDropdownOpen(!isYearsDropdownOpen)
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-theme-secondary border border-theme rounded-lg text-sm text-theme-primary hover:text-theme-primary transition-colors"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>{yearsToShow} Jahre</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${isYearsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isYearsDropdownOpen && (
              <div
                className="absolute top-10 right-0 w-36 bg-theme-card border border-theme rounded-lg shadow-lg py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {[3, 5, 10].map((y) => {
                  const isLocked = !isPremium && y > 5
                  return (
                    <button
                      key={y}
                      onClick={() => {
                        if (isLocked) { window.location.href = '/pricing'; return }
                        setYearsToShow(y)
                        setIsYearsDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                        yearsToShow === y
                          ? 'bg-theme-hover text-theme-primary'
                          : isLocked
                          ? 'text-theme-muted opacity-60'
                          : 'text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
                      }`}
                    >
                      {y} Jahre
                      {isLocked && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-theme mb-6">
          {[
            { key: 'income', label: GERMAN_LABELS.income, icon: DocumentTextIcon },
            { key: 'balance', label: GERMAN_LABELS.balance, icon: ChartBarIcon },
            { key: 'cashflow', label: GERMAN_LABELS.cashflow, icon: BanknotesIcon }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveStatement(key as any)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
                activeStatement === key
                  ? 'text-theme-primary border-b-2 border-theme-primary'
                  : 'text-theme-muted hover:text-theme-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <>
          {!rawStatements ? (
            <div className="text-center py-16">
              <InformationCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-theme-primary mb-2">Keine Daten verfügbar</h3>
              <p className="text-theme-muted">
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
        </>

        {/* Upgrade banner for free users */}
        {!isPremium && (
          <Link
            href="/pricing"
            className="flex items-center justify-between gap-4 px-4 py-3 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <LockClosedIcon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-300">Du siehst die letzten 5 Jahre</p>
                <p className="text-xs text-amber-400/70">Mit Premium erhältst du die vollständige Historie (10+ Jahre) und Quartalsansicht</p>
              </div>
            </div>
            <span className="text-xs font-medium text-amber-400 whitespace-nowrap">Premium freischalten →</span>
          </Link>
        )}
      </main>

      <LearnSidebar />
    </div>
  )
}
