// src/components/FinancialsPage.tsx - MIT EINHEITLICHEM HEADER
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
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Props {
  ticker: string
  isPremium?: boolean
}

interface RawStatements {
  income: any[]
  balance: any[]
  cashflow: any[]
}

// ✅ ERWEITERTE DEUTSCHE ÜBERSETZUNGEN
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
  
  // Sections
  revenue_growth: 'UMSATZ & WACHSTUM',
  profitability: 'PROFITABILITÄT',
  operating_metrics: 'BETRIEBSKENNZAHLEN',
  financial_results: 'FINANZERGEBNIS',
  per_share: 'JE AKTIE',
  
  // Income Statement Rows - ✅ KEINE DOPPELTEN!
  total_revenues: 'Gesamtumsatz',
  total_revenues_chg: 'Umsatzwachstum %',
  cost_of_goods_sold: 'Umsatzkosten',
  gross_profit: 'Bruttogewinn',
  gross_profit_margin: 'Bruttomarge',
  selling_admin_expenses: 'Vertriebs- & Verwaltungskosten',
  rd_expenses: 'F&E-Ausgaben',
  other_operating_expenses: 'Sonstige Betriebskosten',
  operating_income: 'Betriebsergebnis',
  operating_margin: 'Betriebsmarge',
  interest_expense: 'Zinsaufwand',
  interest_income: 'Zinserträge',
  net_interest_expenses: 'Nettozinsaufwand',
  other_income: 'Sonstige Erträge',
  pretax_income: 'Ergebnis vor Steuern',
  income_tax_expense: 'Steuern',
  net_income_final: 'Nettogewinn',  // ✅ ANDERER NAME!
  net_margin: 'Nettomarge',
  earnings_per_share: 'Gewinn je Aktie',
  eps_diluted: 'Verwässerter Gewinn je Aktie',
  shares_outstanding: 'Ausstehende Aktien (Mio.)',
  
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
  
  const { formatFinancialNumber, getFinancialUnitLabel } = useCurrency()

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
            <SparklesIcon className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-theme-primary font-medium">Financial Statements</p>
            <p className="text-theme-muted text-sm">Premium erforderlich</p>
          </div>
        </div>
      </div>
    )
  }

  // ✅ CLEAN INCOME STATEMENT
  const renderIncomeStatement = () => {
    const incomeData = rawStatements?.income?.slice(0, yearsToShow).reverse() || []
    
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

    return (
      <div className="space-y-6">
        
        {/* ✅ METRICS BAR - CLEAN STYLE */}
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

        {/* ✅ PROFESSIONAL TABLE */}
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
                
                {/* Total Revenues */}
                <tr>
                  <td className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    {GERMAN_LABELS.total_revenues}
                  </td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.revenue)}
                    </td>
                  ))}
                </tr>

                {/* Revenue Growth % */}
                <tr>
                  <td className="text-theme-secondary italic">
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

                {/* Gross Profit */}
                <tr>
                  <td className="font-medium">{GERMAN_LABELS.gross_profit}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-medium">
                      {formatFinancialNumber(item.grossProfit)}
                    </td>
                  ))}
                </tr>

                {/* Gross Profit Margin */}
                <tr>
                  <td className="text-theme-muted italic">{GERMAN_LABELS.gross_profit_margin}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-muted font-mono">
                      {((item.grossProfit / item.revenue) * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>

                {/* Operating Expenses Section */}
                <tr>
                  <td colSpan={incomeData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.operating_metrics}
                  </td>
                </tr>

                {/* Selling & Admin Expenses */}
                <tr>
                  <td>{GERMAN_LABELS.selling_admin_expenses}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.sellingGeneralAndAdministrativeExpenses || 0)}
                    </td>
                  ))}
                </tr>

                {/* R&D Expenses */}
                <tr>
                  <td>{GERMAN_LABELS.rd_expenses}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(item.researchAndDevelopmentExpenses || 0)}
                    </td>
                  ))}
                </tr>

                {/* Operating Income */}
                <tr className="bg-blue-500/5">
                  <td className="font-semibold flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    {GERMAN_LABELS.operating_income}
                  </td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-semibold">
                      {formatFinancialNumber(item.operatingIncome)}
                    </td>
                  ))}
                </tr>

                {/* Operating Margin */}
                <tr>
                  <td className="text-theme-muted italic">{GERMAN_LABELS.operating_margin}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-muted font-mono">
                      {((item.operatingIncome / item.revenue) * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>

                {/* Financial Results Section */}
                <tr>
                  <td colSpan={incomeData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.financial_results}
                  </td>
                </tr>

                {/* Interest Expense */}
                <tr>
                  <td>{GERMAN_LABELS.interest_expense}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono">
                      {formatFinancialNumber(Math.abs(item.interestExpense || 0))}
                    </td>
                  ))}
                </tr>

                {/* Net Income - HIGHLIGHTED */}
                <tr className="bg-green-500/5">
                  <td className="font-bold text-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    {GERMAN_LABELS.net_income}
                  </td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-bold text-lg">
                      {formatFinancialNumber(item.netIncome)}
                    </td>
                  ))}
                </tr>

                {/* Net Margin */}
                <tr>
                  <td className="text-theme-muted italic">{GERMAN_LABELS.net_margin}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-muted font-mono">
                      {((item.netIncome / item.revenue) * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>

                {/* Per Share Section */}
                <tr>
                  <td colSpan={incomeData.length + 1} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {GERMAN_LABELS.per_share}
                  </td>
                </tr>

                {/* EPS */}
                <tr>
                  <td className="font-medium">{GERMAN_LABELS.earnings_per_share}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center font-mono font-medium">
                      ${item.eps?.toFixed(2) || '–'}
                    </td>
                  ))}
                </tr>

                {/* Shares Outstanding */}
                <tr>
                  <td className="text-theme-secondary">{GERMAN_LABELS.shares_outstanding}</td>
                  {incomeData.map((item) => (
                    <td key={item.date} className="text-center text-theme-secondary font-mono">
                      {((item.weightedAverageShsOut || 0) / 1_000_000).toFixed(0)}
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

  // Coming soon placeholders
  const renderBalanceSheet = () => (
    <div className="text-center py-16">
      <ChartBarIcon className="w-20 h-20 mx-auto text-theme-muted/50 mb-6" />
      <h3 className="text-xl font-semibold text-theme-primary mb-3">Bilanz</h3>
      <p className="text-theme-secondary">Bald verfügbar...</p>
    </div>
  )

  const renderCashFlow = () => (
    <div className="text-center py-16">
      <BanknotesIcon className="w-20 h-20 mx-auto text-theme-muted/50 mb-6" />
      <h3 className="text-xl font-semibold text-theme-primary mb-3">Cash Flow</h3>
      <p className="text-theme-secondary">Bald verfügbar...</p>
    </div>
  )

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
      {/* ✅ EINHEITLICHER HEADER - wie andere Pages */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          
          {/* Zurück-Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Aktien-Auswahl
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <Logo
                ticker={ticker}
                alt={`${ticker} Logo`}
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                {stock?.name || ticker.toUpperCase()}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg text-green-400 font-semibold">{ticker.toUpperCase()}</span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm text-theme-muted">
                  Financial Statements
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT - konsistent mit anderen Pages */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Info Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <p className="text-theme-secondary">
              {GERMAN_LABELS.comprehensive_analysis} <span className="font-semibold text-green-400">{ticker.toUpperCase()}</span>
            </p>
            <div className="text-sm text-theme-muted mt-1">
              {GERMAN_LABELS.all_figures.replace('{unit}', getFinancialUnitLabel())} • {GERMAN_LABELS.daily_updated}
            </div>
          </div>
        </div>

        {/* ✅ MODERN SLIM CONTROLS */}
        <div className="flex flex-wrap items-center gap-4 justify-between">
          
          {/* Period Toggle - Ultra Slim */}
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
          
          {/* Years Dropdown - Slim */}
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
          
          {/* Status - Minimal */}
          <div className="text-xs text-theme-muted">
            {yearsToShow} Jahre • {getFinancialUnitLabel()} • FMP Native
          </div>
        </div>

        {/* ✅ ULTRA MODERN TABS - MINIMAL & SLEEK */}
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
                
                {/* Active indicator line */}
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
    </div>
  )
}