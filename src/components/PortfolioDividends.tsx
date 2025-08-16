// src/components/PortfolioDividends.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Holding {
  symbol: string
  name: string
  quantity: number
  current_price: number
  value: number
}

interface DividendData {
  symbol: string
  date: string
  label: string
  adjDividend: number
  dividend: number
  recordDate: string
  paymentDate: string
  declarationDate: string
}

interface DividendCalendarItem {
  date: string
  symbol: string
  adjDividend: number
  dividend: number
  paymentDate: string
  recordDate: string
  declarationDate: string
}

interface AnnualDividend {
  symbol: string
  name: string
  quantity: number
  dividendYield: number
  annualDividend: number
  totalAnnualIncome: number
  paymentFrequency: string
  lastDividend: number
  lastPaymentDate: string
  nextPaymentDate?: string
}

interface PortfolioDividendsProps {
  holdings: Holding[]
}

export default function PortfolioDividends({ holdings }: PortfolioDividendsProps) {
  const [loading, setLoading] = useState(true)
  const [dividendData, setDividendData] = useState<Map<string, DividendData[]>>(new Map())
  const [annualDividends, setAnnualDividends] = useState<AnnualDividend[]>([])
  const [upcomingDividends, setUpcomingDividends] = useState<DividendCalendarItem[]>([])
  const [totalAnnualIncome, setTotalAnnualIncome] = useState(0)
  const [averageYield, setAverageYield] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'history'>('overview')

  useEffect(() => {
    if (holdings.length > 0) {
      loadDividendData()
    }
  }, [holdings])

  const loadDividendData = async () => {
    setLoading(true)
    const divMap = new Map<string, DividendData[]>()
    const annualDivs: AnnualDividend[] = []
    const upcoming: DividendCalendarItem[] = []
    
    try {
      for (const holding of holdings) {
        try {
          // Historical Dividends abrufen
          const histResponse = await fetch(
            `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${holding.symbol}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          )
          
          if (histResponse.ok) {
            const histData = await histResponse.json()
            if (histData.historical && histData.historical.length > 0) {
              divMap.set(holding.symbol, histData.historical)
              
              // Berechne jährliche Dividende basierend auf den letzten 12 Monaten
              const twelveMonthsAgo = new Date()
              twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
              
              const recentDividends = histData.historical.filter((d: DividendData) => 
                new Date(d.date) > twelveMonthsAgo
              )
              
              const annualDividendAmount = recentDividends.reduce((sum: number, d: DividendData) => 
                sum + d.adjDividend, 0
              )
              
              const dividendYield = holding.current_price > 0 
                ? (annualDividendAmount / holding.current_price) * 100 
                : 0
              
              const totalIncome = annualDividendAmount * holding.quantity
              
              // Bestimme Payment Frequency
              let frequency = 'N/A'
              if (recentDividends.length >= 11) frequency = 'Monatlich'
              else if (recentDividends.length >= 3) frequency = 'Vierteljährlich'
              else if (recentDividends.length >= 2) frequency = 'Halbjährlich'
              else if (recentDividends.length === 1) frequency = 'Jährlich'
              
              annualDivs.push({
                symbol: holding.symbol,
                name: holding.name,
                quantity: holding.quantity,
                dividendYield,
                annualDividend: annualDividendAmount,
                totalAnnualIncome: totalIncome,
                paymentFrequency: frequency,
                lastDividend: histData.historical[0]?.adjDividend || 0,
                lastPaymentDate: histData.historical[0]?.paymentDate || '',
                nextPaymentDate: estimateNextPaymentDate(histData.historical, frequency)
              })
              
              // Upcoming Dividends (geschätzt basierend auf Historie)
              const nextPayment = estimateNextPaymentDate(histData.historical, frequency)
              if (nextPayment && new Date(nextPayment) > new Date()) {
                upcoming.push({
                  date: nextPayment,
                  symbol: holding.symbol,
                  adjDividend: histData.historical[0]?.adjDividend || 0,
                  dividend: histData.historical[0]?.dividend || 0,
                  paymentDate: nextPayment,
                  recordDate: '',
                  declarationDate: ''
                })
              }
            }
          }
        } catch (err) {
          console.error(`Error loading dividends for ${holding.symbol}:`, err)
        }
      }
      
      setDividendData(divMap)
      setAnnualDividends(annualDivs)
      setUpcomingDividends(upcoming.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ))
      
      // Berechne Gesamt-Metriken
      const totalIncome = annualDivs.reduce((sum, d) => sum + d.totalAnnualIncome, 0)
      setTotalAnnualIncome(totalIncome)
      
      const portfolioValue = holdings.reduce((sum, h) => sum + h.value, 0)
      if (portfolioValue > 0) {
        setAverageYield((totalIncome / portfolioValue) * 100)
      }
      
    } catch (error) {
      console.error('Error loading dividend data:', error)
    } finally {
      setLoading(false)
    }
  }

  const estimateNextPaymentDate = (historical: DividendData[], frequency: string): string | undefined => {
    if (!historical || historical.length < 2) return undefined
    
    const lastPayment = new Date(historical[0].paymentDate)
    let nextPayment = new Date(lastPayment)
    
    switch (frequency) {
      case 'Monatlich':
        nextPayment.setMonth(nextPayment.getMonth() + 1)
        break
      case 'Vierteljährlich':
        nextPayment.setMonth(nextPayment.getMonth() + 3)
        break
      case 'Halbjährlich':
        nextPayment.setMonth(nextPayment.getMonth() + 6)
        break
      case 'Jährlich':
        nextPayment.setFullYear(nextPayment.getFullYear() + 1)
        break
      default:
        return undefined
    }
    
    return nextPayment.toISOString().split('T')[0]
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getMonthlyIncome = () => {
    return totalAnnualIncome / 12
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ArrowPathIcon className="w-6 h-6 text-green-400 animate-spin mx-auto mb-3" />
          <p className="text-theme-secondary">Lade Dividendendaten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
            <p className="text-sm text-theme-secondary">Jährliche Dividenden</p>
          </div>
          <p className="text-2xl font-bold text-theme-primary">
            ${totalAnnualIncome.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-theme-muted mt-1">Geschätzt</p>
        </div>

        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDaysIcon className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-theme-secondary">Monatliches Einkommen</p>
          </div>
          <p className="text-2xl font-bold text-theme-primary">
            ${getMonthlyIncome().toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-theme-muted mt-1">Durchschnitt</p>
        </div>

        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-yellow-400" />
            <p className="text-sm text-theme-secondary">Portfolio Yield</p>
          </div>
          <p className="text-2xl font-bold text-theme-primary">
            {averageYield.toFixed(2)}%
          </p>
          <p className="text-xs text-theme-muted mt-1">Gewichteter Durchschnitt</p>
        </div>

        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <BanknotesIcon className="w-5 h-5 text-purple-400" />
            <p className="text-sm text-theme-secondary">Nächste Zahlung</p>
          </div>
          {upcomingDividends.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-theme-primary">
                {formatDate(upcomingDividends[0].paymentDate)}
              </p>
              <p className="text-xs text-theme-muted mt-1">
                {upcomingDividends[0].symbol} - ${upcomingDividends[0].adjDividend.toFixed(2)}
              </p>
            </>
          ) : (
            <p className="text-lg text-theme-muted">Keine geplant</p>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-6 border-b border-theme/10">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'text-green-400 border-b-2 border-green-400' 
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          Übersicht
        </button>
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'calendar' 
              ? 'text-green-400 border-b-2 border-green-400' 
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          Kalender
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'history' 
              ? 'text-green-400 border-b-2 border-green-400' 
              : 'text-theme-secondary hover:text-theme-primary'
          }`}
        >
          Historie
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-theme-card rounded-xl border border-theme/10 overflow-hidden">
          <div className="p-4 border-b border-theme/10">
            <h3 className="text-lg font-semibold text-theme-primary">Dividenden-Übersicht</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-secondary/30">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-theme-secondary">Aktie</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Anzahl</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Div. Yield</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Jährliche Div.</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Jährliches Einkommen</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-theme-secondary">Frequenz</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-theme-secondary">Letzte Zahlung</th>
                </tr>
              </thead>
              <tbody>
                {annualDividends.map((div) => (
                  <tr key={div.symbol} className="border-t border-theme/10 hover:bg-theme-secondary/10 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-bold text-theme-primary">{div.symbol}</p>
                        <p className="text-xs text-theme-muted">{div.name}</p>
                      </div>
                    </td>
                    <td className="text-right px-4 py-4">
                      <p className="font-semibold text-theme-primary">{div.quantity}</p>
                    </td>
                    <td className="text-right px-4 py-4">
                      <span className={`font-semibold ${div.dividendYield > 3 ? 'text-green-400' : 'text-theme-primary'}`}>
                        {div.dividendYield.toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right px-4 py-4">
                      <p className="font-semibold text-theme-primary">
                        ${div.annualDividend.toFixed(2)}
                      </p>
                    </td>
                    <td className="text-right px-4 py-4">
                      <p className="font-bold text-green-400">
                        ${div.totalAnnualIncome.toFixed(2)}
                      </p>
                    </td>
                    <td className="text-center px-4 py-4">
                      <span className="px-2 py-1 bg-theme-secondary rounded text-xs">
                        {div.paymentFrequency}
                      </span>
                    </td>
                    <td className="text-right px-4 py-4">
                      <div>
                        <p className="text-sm text-theme-primary">${div.lastDividend.toFixed(2)}</p>
                        <p className="text-xs text-theme-muted">{formatDate(div.lastPaymentDate)}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {annualDividends.length === 0 && (
            <div className="p-12 text-center">
              <CurrencyDollarIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
              <p className="text-theme-secondary mb-2">Keine Dividenden gefunden</p>
              <p className="text-theme-muted text-sm">
                Ihre Positionen zahlen möglicherweise keine Dividenden oder die Daten sind nicht verfügbar.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-theme-card rounded-xl border border-theme/10 p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Kommende Dividenden</h3>
          
          {upcomingDividends.length > 0 ? (
            <div className="space-y-3">
              {upcomingDividends.map((div, index) => {
                const holding = holdings.find(h => h.symbol === div.symbol)
                const totalPayment = holding ? div.adjDividend * holding.quantity : 0
                
                return (
                  <div key={`${div.symbol}-${index}`} className="flex items-center justify-between p-4 bg-theme-secondary/30 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-theme-muted">
                          {new Date(div.paymentDate).toLocaleDateString('de-DE', { month: 'short' })}
                        </p>
                        <p className="text-2xl font-bold text-theme-primary">
                          {new Date(div.paymentDate).getDate()}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-theme-primary">{div.symbol}</p>
                        <p className="text-sm text-theme-secondary">
                          ${div.adjDividend.toFixed(2)} pro Aktie
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-400 text-lg">
                        +${totalPayment.toFixed(2)}
                      </p>
                      <p className="text-xs text-theme-muted">Geschätzt</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarDaysIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
              <p className="text-theme-secondary">Keine kommenden Dividenden</p>
              <p className="text-theme-muted text-sm mt-1">
                Basierend auf historischen Daten
              </p>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-400 font-medium">Hinweis</p>
                <p className="text-xs text-theme-secondary mt-1">
                  Die kommenden Dividendentermine sind Schätzungen basierend auf historischen Zahlungsmustern. 
                  Die tatsächlichen Termine können abweichen.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-theme-card rounded-xl border border-theme/10 p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Dividenden-Historie</h3>
          
          <div className="space-y-6">
            {Array.from(dividendData.entries()).map(([symbol, dividends]) => {
              const holding = holdings.find(h => h.symbol === symbol)
              if (!holding) return null
              
              return (
                <div key={symbol} className="border-b border-theme/10 pb-6 last:border-0">
                  <h4 className="font-semibold text-theme-primary mb-3">
                    {symbol} - {holding.name}
                  </h4>
                  
                  <div className="space-y-2">
                    {dividends.slice(0, 5).map((div, index) => (
                      <div key={`${symbol}-${index}`} className="flex items-center justify-between p-3 bg-theme-secondary/20 rounded">
                        <div>
                          <p className="text-sm text-theme-primary">
                            {formatDate(div.paymentDate)}
                          </p>
                          <p className="text-xs text-theme-muted">
                            Ex-Date: {formatDate(div.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-theme-primary">
                            ${div.adjDividend.toFixed(2)}
                          </p>
                          <p className="text-xs text-green-400">
                            Total: ${(div.adjDividend * holding.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          
          {dividendData.size === 0 && (
            <div className="text-center py-8">
              <ClockIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
              <p className="text-theme-secondary">Keine Historie verfügbar</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}