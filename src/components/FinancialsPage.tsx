'use client'

import React, { useState, useEffect } from 'react'
import { useCurrency } from '@/lib/CurrencyContext'
import {
  ChartBarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  InformationCircleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
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

export default function FinancialsPage({ ticker, isPremium = false }: Props) {
  const [activeStatement, setActiveStatement] = useState<'income' | 'balance' | 'cashflow'>('income')
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
  const [yearsToShow, setYearsToShow] = useState<number>(5)
  const [rawStatements, setRawStatements] = useState<RawStatements | null>(null)
  const [loading, setLoading] = useState(true)
  
  const { formatCurrency, formatFinancialNumber, getFinancialUnitLabel } = useCurrency()

    

  // Lade Daten von deiner API
  useEffect(() => {
    async function loadFinancials() {
      setLoading(true)
      try {
        const response = await fetch(`/api/financials/${ticker}?period=${period}&limit=${yearsToShow}`)
        const data = await response.json()
        setRawStatements(data.rawStatements)
      } catch (error) {
        console.error('Failed to load financials:', error)
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      loadFinancials()
    }
  }, [ticker, period, yearsToShow])

  // Premium Blur Component
  const PremiumBlur = ({ children }: { children: React.ReactNode }) => {
    if (isPremium) return <>{children}</>
    
    return (
      <div className="relative">
        <div className="filter blur-sm opacity-60 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-theme-card/90 backdrop-blur-sm border border-amber-500/30 rounded-lg p-4 text-center">
            <SparklesIcon className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-theme-primary font-medium">Financial Statements</p>
            <p className="text-theme-muted text-sm">Premium erforderlich</p>
          </div>
        </div>
      </div>
    )
  }

  // YoY Growth berechnen
  const calculateGrowth = (current: number, previous: number) => {
    if (!current || !previous) return null
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!rawStatements) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center text-theme-secondary">
          Keine Finanzdaten verfügbar für {ticker}
        </div>
      </div>
    )
  }

  // Income Statement Renderer
  const renderIncomeStatement = () => {
    const incomeData = rawStatements.income.slice(0, yearsToShow).reverse()
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-4 px-3 text-theme-secondary font-medium">
                <div>Gewinn- und Verlustrechnung</div>
                <div className="text-xs text-theme-muted font-normal">Alle Zahlen in {getFinancialUnitLabel()}</div>
              </th>
              {incomeData.map((item, index) => (
                <th key={item.date} className="text-right py-4 px-3">
                  <div className="text-theme-secondary font-medium">
                    {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                  </div>
                  {index > 0 && (
                    <div className="text-xs text-theme-muted mt-1">
                      vs. {period === 'annual' ? incomeData[index-1].calendarYear : incomeData[index-1].date.slice(0, 7)}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Revenue */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Umsatz</td>
              {incomeData.map((item, index) => {
                const growth = index > 0 ? calculateGrowth(item.revenue, incomeData[index-1].revenue) : null
                return (
                  <td key={item.date} className="text-right py-3 px-3">
                    <div className="text-theme-primary font-mono font-medium">
                      {formatFinancialNumber(item.revenue)}
                    </div>
                    {growth !== null && (
                      <div className={`text-xs mt-1 ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>

              {/* Umsatzkosten (Cost of Goods Sold) */}
<tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
  <td className="py-3 px-3 text-theme-primary font-medium">Umsatzkosten</td>
  {incomeData.map((item) => (
    <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
      {formatFinancialNumber(item.costOfRevenue || (item.revenue - item.grossProfit))}
    </td>
  ))}
</tr>

{/* Bruttomarge % (direkt nach Bruttogewinn) */}
<tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
  <td className="py-3 px-3 text-theme-secondary font-medium italic">→ Bruttomarge</td>
  {incomeData.map((item) => (
    <td key={item.date} className="text-right py-3 px-3 text-theme-secondary font-mono">
      {((item.grossProfit / item.revenue) * 100).toFixed(1)}%
    </td>
  ))}
</tr>

{/* F&E Ausgaben */}
<tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
  <td className="py-3 px-3 text-theme-primary font-medium">F&E Ausgaben</td>
  {incomeData.map((item) => (
    <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
      {formatFinancialNumber(item.researchAndDevelopmentExpenses || 0)}
    </td>
  ))}
</tr>

{/* Betriebsmarge % (direkt nach Betriebsergebnis) */}
<tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
  <td className="py-3 px-3 text-theme-secondary font-medium italic">→ Betriebsmarge</td>
  {incomeData.map((item) => (
    <td key={item.date} className="text-right py-3 px-3 text-theme-secondary font-mono">
      {((item.operatingIncome / item.revenue) * 100).toFixed(1)}%
    </td>
  ))}
</tr>


            {/* Gross Profit */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Bruttogewinn</td>
              {incomeData.map((item, index) => {
                const growth = index > 0 ? calculateGrowth(item.grossProfit, incomeData[index-1].grossProfit) : null
                return (
                  <td key={item.date} className="text-right py-3 px-3">
                    <div className="text-theme-primary font-mono">
                      {formatFinancialNumber(item.grossProfit)}
                    </div>
                    {growth !== null && (
                      <div className={`text-xs mt-1 ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* Operating Income */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Betriebsergebnis</td>
              {incomeData.map((item, index) => {
                const growth = index > 0 ? calculateGrowth(item.operatingIncome, incomeData[index-1].operatingIncome) : null
                return (
                  <td key={item.date} className="text-right py-3 px-3">
                    <div className="text-theme-primary font-mono">
                      {formatFinancialNumber(item.operatingIncome)}
                    </div>
                    {growth !== null && (
                      <div className={`text-xs mt-1 ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* EBITDA */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">EBITDA</td>
              {incomeData.map((item, index) => {
                const growth = index > 0 ? calculateGrowth(item.ebitda, incomeData[index-1].ebitda) : null
                return (
                  <td key={item.date} className="text-right py-3 px-3">
                    <div className="text-theme-primary font-mono">
                      {formatFinancialNumber(item.ebitda)}
                    </div>
                    {growth !== null && (
                      <div className={`text-xs mt-1 ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* Net Income */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-t-2 border-theme">
              <td className="py-3 px-3 text-theme-primary font-bold">Nettogewinn</td>
              {incomeData.map((item, index) => {
                const growth = index > 0 ? calculateGrowth(item.netIncome, incomeData[index-1].netIncome) : null
                return (
                  <td key={item.date} className="text-right py-3 px-3">
                    <div className="text-theme-primary font-mono font-bold">
                      {formatFinancialNumber(item.netIncome)}
                    </div>
                    {growth !== null && (
                      <div className={`text-xs mt-1 font-medium ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* EPS */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Gewinn je Aktie</td>
              {incomeData.map((item, index) => {
                const growth = index > 0 ? calculateGrowth(item.eps, incomeData[index-1].eps) : null
                return (
                  <td key={item.date} className="text-right py-3 px-3">
                    <div className="text-theme-primary font-mono">
                      ${item.eps?.toFixed(2) || '–'}
                    </div>
                    {growth !== null && (
                      <div className={`text-xs mt-1 ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }


 // Balance Sheet Renderer
 const renderBalanceSheet = () => {
    const balanceData = rawStatements.balance.slice(0, yearsToShow).reverse()
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-4 px-3 text-theme-secondary font-medium">
                <div>Bilanz</div>
                <div className="text-xs text-theme-muted font-normal">Alle Zahlen in {getFinancialUnitLabel()}</div>
              </th>
              {balanceData.map((item) => (
                <th key={item.date} className="text-right py-4 px-3 text-theme-secondary font-medium">
                  {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Assets Section */}
            <tr>
              <td colSpan={6} className="py-2 px-3 text-theme-muted font-semibold text-sm bg-theme-secondary/20">
                AKTIVA
              </td>
            </tr>
            
            {/* Cash & Liquidity */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Liquidität</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.cashAndCashEquivalents || item.cashAndShortTermInvestments || 0)}
                </td>
              ))}
            </tr>

            {/* Current Assets */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Kurzfristige Vermögenswerte</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.totalCurrentAssets || 0)}
                </td>
              ))}
            </tr>

            {/* Property, Plant & Equipment */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Sachanlagen (netto)</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.propertyPlantEquipmentNet || item.netPPE || 0)}
                </td>
              ))}
            </tr>

            {/* Long-term Assets */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Langfristige Vermögenswerte</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber((item.totalAssets || 0) - (item.totalCurrentAssets || 0))}
                </td>
              ))}
            </tr>

            {/* Total Assets */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-t-2 border-theme">
              <td className="py-3 px-3 text-theme-primary font-bold">Gesamtvermögen</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono font-bold">
                  {formatFinancialNumber(item.totalAssets || 0)}
                </td>
              ))}
            </tr>

            {/* Liabilities Section */}
            <tr>
              <td colSpan={6} className="py-2 px-3 text-theme-muted font-semibold text-sm bg-theme-secondary/20">
                PASSIVA
              </td>
            </tr>

            {/* Current Liabilities */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Kurzfristige Verbindlichkeiten</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.totalCurrentLiabilities || 0)}
                </td>
              ))}
            </tr>

            {/* Working Capital */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-secondary font-medium italic">→ Working Capital</td>
              {balanceData.map((item) => {
                const workingCapital = (item.totalCurrentAssets || 0) - (item.totalCurrentLiabilities || 0)
                return (
                  <td key={item.date} className={`text-right py-3 px-3 font-mono ${
                    workingCapital >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatFinancialNumber(workingCapital)}
                  </td>
                )
              })}
            </tr>

            {/* Long-term Debt */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Langfristige Schulden</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.longTermDebt || 0)}
                </td>
              ))}
            </tr>

            {/* Total Liabilities */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Verbindlichkeiten gesamt</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.totalLiabilities || 0)}
                </td>
              ))}
            </tr>

            {/* Total Debt */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Schulden gesamt</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.totalDebt || 0)}
                </td>
              ))}
            </tr>

            {/* Retained Earnings */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Gewinnrücklagen</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.retainedEarnings || 0)}
                </td>
              ))}
            </tr>

            {/* Total Equity */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-t-2 border-theme">
              <td className="py-3 px-3 text-theme-primary font-bold">Eigenkapital gesamt</td>
              {balanceData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono font-bold">
                  {formatFinancialNumber(item.totalStockholdersEquity || item.totalEquity || 0)}
                </td>
              ))}
            </tr>

            {/* Key Ratios Section */}
            <tr>
              <td colSpan={6} className="py-2 px-3 text-theme-muted font-semibold text-sm bg-theme-secondary/20">
                KENNZAHLEN
              </td>
            </tr>

            {/* Debt-to-Equity Ratio */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-secondary font-medium italic">Verschuldungsgrad</td>
              {balanceData.map((item) => {
                const debtToEquity = (item.totalDebt || 0) / (item.totalStockholdersEquity || item.totalEquity || 1)
                return (
                  <td key={item.date} className="text-right py-3 px-3 text-theme-secondary font-mono">
                    {debtToEquity.toFixed(2)}
                  </td>
                )
              })}
            </tr>

            {/* Current Ratio */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-secondary font-medium italic">Liquiditätsgrad</td>
              {balanceData.map((item) => {
                const currentRatio = (item.totalCurrentAssets || 0) / (item.totalCurrentLiabilities || 1)
                return (
                  <td key={item.date} className={`text-right py-3 px-3 font-mono ${
                    currentRatio >= 1.5 ? 'text-green-400' : currentRatio >= 1.0 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {currentRatio.toFixed(2)}
                  </td>
                )
              })}
            </tr>

            {/* Asset Turnover */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-secondary font-medium italic">Eigenkapitalquote</td>
              {balanceData.map((item) => {
                const equityRatio = ((item.totalStockholdersEquity || item.totalEquity || 0) / (item.totalAssets || 1)) * 100
                return (
                  <td key={item.date} className="text-right py-3 px-3 text-theme-secondary font-mono">
                    {equityRatio.toFixed(1)}%
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // Cash Flow Renderer
  const renderCashFlow = () => {
    const cashflowData = rawStatements.cashflow.slice(0, yearsToShow).reverse()
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-4 px-3 text-theme-secondary font-medium">
                <div>Cashflow-Rechnung</div>
                <div className="text-xs text-theme-muted font-normal">Alle Zahlen in {getFinancialUnitLabel()}</div>
              </th>
              {cashflowData.map((item) => (
                <th key={item.date} className="text-right py-4 px-3 text-theme-secondary font-medium">
                  {period === 'annual' ? item.calendarYear : item.date.slice(0, 7)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            
            {/* ═══ OPERATING ACTIVITIES ═══ */}
            <tr>
              <td colSpan={6} className="py-2 px-3 text-theme-muted font-semibold text-sm bg-theme-secondary/20">
                OPERATIVE TÄTIGKEITEN
              </td>
            </tr>

            {/* Net Income (Starting Point) */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Nettogewinn</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.netIncome || 0)}
                </td>
              ))}
            </tr>

            {/* Depreciation & Amortization */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Abschreibungen</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.depreciationAndAmortization || 0)}
                </td>
              ))}
            </tr>

            {/* Stock-Based Compensation */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Aktienbasierte Vergütung</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-theme-primary font-mono">
                  {formatFinancialNumber(item.stockBasedCompensation || 0)}
                </td>
              ))}
            </tr>

            {/* Working Capital Changes */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Änderung Forderungen</td>
              {cashflowData.map((item) => (
                <td key={item.date} className={`text-right py-3 px-3 font-mono ${
                  (item.changeInAccountsReceivables || 0) < 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatFinancialNumber(item.changeInAccountsReceivables || 0)}
                </td>
              ))}
            </tr>

            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Änderung Vorräte</td>
              {cashflowData.map((item) => (
                <td key={item.date} className={`text-right py-3 px-3 font-mono ${
                  (item.changeInInventory || 0) < 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatFinancialNumber(item.changeInInventory || 0)}
                </td>
              ))}
            </tr>

            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Änderung Verbindlichkeiten</td>
              {cashflowData.map((item) => (
                <td key={item.date} className={`text-right py-3 px-3 font-mono ${
                  (item.changeInAccountsPayables || 0) > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatFinancialNumber(item.changeInAccountsPayables || 0)}
                </td>
              ))}
            </tr>

            {/* Operating Cash Flow */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-t-2 border-theme">
              <td className="py-3 px-3 text-theme-primary font-bold">Operativer Cashflow</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-green-400 font-mono font-bold">
                  {formatFinancialNumber(item.netCashProvidedByOperatingActivities || item.operatingCashFlow || 0)}
                </td>
              ))}
            </tr>

            {/* ═══ INVESTING ACTIVITIES ═══ */}
            <tr>
              <td colSpan={6} className="py-2 px-3 text-theme-muted font-semibold text-sm bg-theme-secondary/20">
                INVESTITIONSTÄTIGKEITEN
              </td>
            </tr>

            {/* Capital Expenditure */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Investitionsausgaben (CapEx)</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-red-400 font-mono">
                  {formatFinancialNumber(item.capitalExpenditure || item.capEx || 0)}
                </td>
              ))}
            </tr>

            {/* Acquisitions */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Akquisitionen</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-red-400 font-mono">
                  {formatFinancialNumber(item.acquisitionsNet || 0)}
                </td>
              ))}
            </tr>

            {/* Investment in Securities */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Investitionen in Wertpapiere</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-red-400 font-mono">
                  {formatFinancialNumber(item.investmentsInPropertyPlantAndEquipment || 0)}
                </td>
              ))}
            </tr>

            {/* Investing Cash Flow */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-t-2 border-theme">
              <td className="py-3 px-3 text-theme-primary font-bold">Investitions-Cashflow</td>
              {cashflowData.map((item) => (
                <td key={item.date} className={`text-right py-3 px-3 font-mono font-bold ${
                  (item.netCashUsedForInvestingActivities || item.investingCashFlow || 0) < 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {formatFinancialNumber(item.netCashUsedForInvestingActivities || item.investingCashFlow || 0)}
                </td>
              ))}
            </tr>

            {/* ═══ FINANCING ACTIVITIES ═══ */}
            <tr>
              <td colSpan={6} className="py-2 px-3 text-theme-muted font-semibold text-sm bg-theme-secondary/20">
                FINANZIERUNGSTÄTIGKEITEN
              </td>
            </tr>

            {/* Dividends Paid */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Dividenden gezahlt</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-red-400 font-mono">
                  {formatFinancialNumber(item.dividendsPaid || 0)}
                </td>
              ))}
            </tr>

            {/* Share Repurchases */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Aktienrückkäufe</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-red-400 font-mono">
                  {formatFinancialNumber(item.repurchasesOfCommonStock || 0)}
                </td>
              ))}
            </tr>

            {/* Debt Issued */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Schuldenaufnahme</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-green-400 font-mono">
                  {formatFinancialNumber(item.debtIssued || 0)}
                </td>
              ))}
            </tr>

            {/* Debt Repayment */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Schuldentilgung</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-red-400 font-mono">
                  {formatFinancialNumber(item.debtRepayment || 0)}
                </td>
              ))}
            </tr>

            {/* Financing Cash Flow */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-t-2 border-theme">
              <td className="py-3 px-3 text-theme-primary font-bold">Finanzierungs-Cashflow</td>
              {cashflowData.map((item) => (
                <td key={item.date} className={`text-right py-3 px-3 font-mono font-bold ${
                  (item.netCashUsedProvidedByFinancingActivities || item.financingCashFlow || 0) < 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {formatFinancialNumber(item.netCashUsedProvidedByFinancingActivities || item.financingCashFlow || 0)}
                </td>
              ))}
            </tr>

            {/* ═══ SUMMARY ═══ */}
            <tr>
              <td colSpan={6} className="py-2 px-3 text-theme-muted font-semibold text-sm bg-theme-secondary/20">
                ZUSAMMENFASSUNG
              </td>
            </tr>

            {/* Net Change in Cash */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-primary font-medium">Nettoänderung Liquidität</td>
              {cashflowData.map((item) => (
                <td key={item.date} className={`text-right py-3 px-3 font-mono ${
                  (item.netChangeInCash || 0) > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatFinancialNumber(item.netChangeInCash || 0)}
                </td>
              ))}
            </tr>

            {/* Free Cash Flow */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-t-2 border-theme">
              <td className="py-3 px-3 text-theme-primary font-bold">Free Cash Flow</td>
              {cashflowData.map((item) => (
                <td key={item.date} className="text-right py-3 px-3 text-green-400 font-mono font-bold">
                  {formatFinancialNumber(item.freeCashFlow || 0)}
                </td>
              ))}
            </tr>

            {/* FCF Margin */}
            <tr className="hover:bg-theme-secondary/30 transition-colors border-b border-theme/50">
              <td className="py-3 px-3 text-theme-secondary font-medium italic">→ FCF Marge</td>
              {cashflowData.map((item, index) => {
                // Get corresponding revenue from income data
                const incomeItem = rawStatements.income[rawStatements.income.length - 1 - index]
                const fcfMargin = incomeItem?.revenue ? ((item.freeCashFlow || 0) / incomeItem.revenue) * 100 : 0
                return (
                  <td key={item.date} className="text-right py-3 px-3 text-theme-secondary font-mono">
                    {fcfMargin.toFixed(1)}%
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary">Financial Statements</h1>
          <p className="text-theme-secondary">Detaillierte Finanzberichte für {ticker.toUpperCase()}</p>
          <div className="text-xs text-theme-muted font-normal">Alle Zahlen in {getFinancialUnitLabel()}</div>

        </div>
        
        {/* Period & Years Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {(['annual', 'quarterly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  period === p 
                    ? 'bg-green-600 text-white' 
                    : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-secondary border border-theme'
                }`}
              >
                {p === 'annual' ? 'Jährlich' : 'Quartalsweise'}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-theme-secondary">Jahre:</span>
            {[3, 5, 10].map((years) => (
              <button
                key={years}
                onClick={() => setYearsToShow(years)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  yearsToShow === years 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-secondary border border-theme'
                }`}
              >
                {years}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statement Tabs */}
      <div className="professional-card">
        <div className="flex border-b border-theme">
          <button
            onClick={() => setActiveStatement('income')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeStatement === 'income'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-theme-secondary hover:text-theme-primary'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            GuV
          </button>
          <button
            onClick={() => setActiveStatement('balance')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeStatement === 'balance'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-theme-secondary hover:text-theme-primary'
            }`}
          >
            <ChartBarIcon className="w-4 h-4" />
            Bilanz
          </button>
          <button
            onClick={() => setActiveStatement('cashflow')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeStatement === 'cashflow'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-theme-secondary hover:text-theme-primary'
            }`}
          >
            <BanknotesIcon className="w-4 h-4" />
            Cash Flow
          </button>
        </div>

        {/* Statement Content */}
        <div className="p-6">
          <PremiumBlur>
            {activeStatement === 'income' && renderIncomeStatement()}
            {activeStatement === 'balance' && renderBalanceSheet()}
            {activeStatement === 'cashflow' && renderCashFlow()}
          </PremiumBlur>
        </div>
      </div>

      {/* Info Footer */}
      <div className="professional-card p-4">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-theme-secondary">
            <p className="mb-1">Alle Zahlen in {getFinancialUnitLabel()}. Wachstumsraten beziehen sich auf das Vorjahr.</p>
            <p>Daten werden direkt von Financial Modeling Prep bereitgestellt und täglich aktualisiert.</p>
          </div>
        </div>
      </div>
    </div>
  )
}