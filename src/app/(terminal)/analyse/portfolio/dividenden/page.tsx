// src/app/analyse/portfolio/dividenden/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  CalendarIcon, 
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowLeftIcon,
  BellIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'

// Types
interface PortfolioPosition {
  id: number
  ticker: string
  name: string
  shares: number
  avgPrice: number
  currentPrice: number
  dividendYield: number
  nextDividend: string
  currency: string
}

interface DividendEvent {
  ticker: string
  companyName: string
  amount: number
  totalAmount: number
  exDate: string
  payDate: string
  shares: number
  frequency: 'quarterly' | 'monthly' | 'annually'
  status: 'upcoming' | 'recent' | 'paid'
}

interface DividendHistory {
  year: number
  totalReceived: number
  payments: number
  avgYield: number
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

// Mock Portfolio Data - später aus Supabase
const MOCK_PORTFOLIO: PortfolioPosition[] = [
  { 
    id: 1, ticker: 'AAPL', name: 'Apple Inc.', shares: 100, avgPrice: 150.00, 
    currentPrice: 175.50, dividendYield: 0.51, nextDividend: '2025-08-15', currency: 'USD'
  },
  { 
    id: 2, ticker: 'MSFT', name: 'Microsoft Corp.', shares: 50, avgPrice: 280.00, 
    currentPrice: 420.00, dividendYield: 0.73, nextDividend: '2025-08-14', currency: 'USD'
  },
  { 
    id: 3, ticker: 'JNJ', name: 'Johnson & Johnson', shares: 75, avgPrice: 160.00, 
    currentPrice: 165.20, dividendYield: 2.95, nextDividend: '2025-09-05', currency: 'USD'
  },
  { 
    id: 4, ticker: 'KO', name: 'Coca-Cola Co.', shares: 200, avgPrice: 55.00, 
    currentPrice: 62.30, dividendYield: 3.10, nextDividend: '2025-09-12', currency: 'USD'
  }
]

// FMP API Helper
async function fetchDividendData(ticker: string) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${apiKey}`
    )
    
    if (!response.ok) throw new Error('FMP API error')
    
    const data = await response.json()
    return data[0]?.historical || []
  } catch (error) {
    console.error(`Error fetching dividend data for ${ticker}:`, error)
    return []
  }
}

// Generate Mock Dividend Calendar
function generateDividendCalendar(portfolio: PortfolioPosition[]): DividendEvent[] {
  const events: DividendEvent[] = []
  
  portfolio.forEach(position => {
    // Quarterly dividends für die nächsten 4 Quartale
    const baseDate = new Date()
    
    for (let quarter = 0; quarter < 4; quarter++) {
      const exDate = new Date()
      exDate.setMonth(baseDate.getMonth() + (quarter * 3))
      exDate.setDate(15) // Mid-month ex-date
      
      const payDate = new Date(exDate)
      payDate.setMonth(payDate.getMonth() + 1)
      payDate.setDate(1) // Payment next month
      
      // Estimate quarterly dividend (annual yield / 4)
      const quarterlyDividend = (position.currentPrice * position.dividendYield / 100) / 4
      
      events.push({
        ticker: position.ticker,
        companyName: position.name,
        amount: quarterlyDividend,
        totalAmount: quarterlyDividend * position.shares,
        exDate: exDate.toISOString().split('T')[0],
        payDate: payDate.toISOString().split('T')[0],
        shares: position.shares,
        frequency: 'quarterly',
        status: quarter === 0 ? 'upcoming' : 'upcoming'
      })
    }
  })
  
  return events.sort((a, b) => new Date(a.exDate).getTime() - new Date(b.exDate).getTime())
}

export default function DividendenPage() {
  const [user, setUser] = useState<User | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([])
  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([])
  const [dividendHistory, setDividendHistory] = useState<DividendHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'calendar' | 'history' | 'settings'>('calendar')

  // Load user and portfolio data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }

        // Load portfolio (später aus Supabase)
        // TODO: await loadPortfolioFromSupabase(user.id)
        setPortfolio(MOCK_PORTFOLIO)
        
        // Generate dividend calendar
        const events = generateDividendCalendar(MOCK_PORTFOLIO)
        setDividendEvents(events)
        
        // Mock dividend history
        setDividendHistory([
          { year: 2024, totalReceived: 456.75, payments: 16, avgYield: 2.1 },
          { year: 2023, totalReceived: 423.20, payments: 15, avgYield: 1.9 },
          { year: 2022, totalReceived: 389.50, payments: 14, avgYield: 1.8 }
        ])
        
      } catch (error) {
        console.error('Error loading dividend data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate summary stats
  const upcomingDividends = dividendEvents.filter(e => e.status === 'upcoming').slice(0, 5)
  const next30Days = dividendEvents.filter(e => {
    const eventDate = new Date(e.exDate)
    const now = new Date()
    const days30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return eventDate >= now && eventDate <= days30
  })
  
  const monthlyEstimate = next30Days.reduce((sum, event) => sum + event.totalAmount, 0)
  const annualEstimate = portfolio.reduce((sum, pos) => 
    sum + (pos.currentPrice * pos.shares * pos.dividendYield / 100), 0
  )

  if (loading) {
    return (
      <div className="h-full bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-secondary">Dividendendaten werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-theme-primary text-theme-primary overflow-auto">
      {/* Header */}
      <div className="bg-theme-secondary border-b border-theme">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/analyse/portfolio"
                className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm">Portfolio</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">Dividenden-Kalender</h1>
                <p className="text-theme-secondary">Alle Dividendentermine und Zahlungen im Überblick</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 bg-theme-tertiary hover:bg-theme-tertiary/80 border border-theme rounded-md transition-colors">
                <BellIcon className="w-4 h-4" />
                <span className="text-sm">Benachrichtigungen</span>
              </button>
              
              {!user?.isPremium && (
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md transition-colors"
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span className="text-sm">Upgrade</span>
                </Link>
              )}
            </div>
          </div>
          
          {/* Sub Navigation */}
          <div className="mt-4">
            <nav className="flex space-x-6">
              {[
                { id: 'calendar', label: 'Kalender', icon: CalendarIcon },
                { id: 'history', label: 'Historie', icon: ChartBarIcon },
                { id: 'settings', label: 'Einstellungen', icon: InformationCircleIcon }
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeView === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={`flex items-center gap-2 py-2 text-sm font-medium border-b-2 transition-colors
                      ${isActive 
                        ? 'border-green-500 text-green-400' 
                        : 'border-transparent text-theme-secondary hover:text-theme-primary'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'calendar' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-theme-card border border-theme rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <ClockIcon className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="font-semibold text-theme-primary">Nächste 30 Tage</h3>
                </div>
                <p className="text-2xl font-bold text-green-400">${monthlyEstimate.toFixed(2)}</p>
                <p className="text-sm text-theme-muted">{next30Days.length} Zahlungen</p>
              </div>

              <div className="bg-theme-card border border-theme rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-theme-primary">Nächster Termin</h3>
                </div>
                <p className="text-lg font-bold text-theme-primary">
                  {upcomingDividends[0] ? new Date(upcomingDividends[0].exDate).toLocaleDateString('de-DE') : 'Keine'}
                </p>
                <p className="text-sm text-theme-muted">
                  {upcomingDividends[0] ? `${upcomingDividends[0].ticker} - $${upcomingDividends[0].totalAmount.toFixed(2)}` : 'Daten'}
                </p>
              </div>

              <div className="bg-theme-card border border-theme rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-theme-primary">Jährlich (geschätzt)</h3>
                </div>
                <p className="text-lg font-bold text-theme-primary">${annualEstimate.toFixed(2)}</p>
                <p className="text-sm text-theme-muted">Basierend auf aktueller Rendite</p>
              </div>

              <div className="bg-theme-card border border-theme rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircleIcon className="w-4 h-4 text-yellow-400" />
                  </div>
                  <h3 className="font-semibold text-theme-primary">Dieses Jahr</h3>
                </div>
                <p className="text-lg font-bold text-theme-primary">
                  ${dividendHistory[0]?.totalReceived.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-theme-muted">
                  {dividendHistory[0]?.payments || 0} Zahlungen
                </p>
              </div>
            </div>

            {/* Upcoming Dividends */}
            <div className="bg-theme-card border border-theme rounded-lg mb-6">
              <div className="p-6 border-b border-theme">
                <h3 className="text-lg font-semibold text-theme-primary">Anstehende Dividenden</h3>
              </div>
              
              <div className="divide-y divide-theme">
                {upcomingDividends.map((dividend, index) => (
                  <div key={`${dividend.ticker}-${dividend.exDate}`} className="p-6 flex items-center justify-between hover:bg-theme-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-theme-secondary rounded-lg flex items-center justify-center">
                        <span className="font-bold text-theme-primary text-sm">{dividend.ticker}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-theme-primary">{dividend.companyName}</div>
                        <div className="text-sm text-theme-muted">
                          Ex-Date: {new Date(dividend.exDate).toLocaleDateString('de-DE')} • 
                          ${dividend.amount.toFixed(3)} × {dividend.shares} Aktien
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-green-400 text-lg">${dividend.totalAmount.toFixed(2)}</div>
                      <div className="text-sm text-theme-muted">
                        Zahlung: {new Date(dividend.payDate).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar View */}
            <div className="bg-theme-card border border-theme rounded-lg">
              <div className="p-6 border-b border-theme">
                <h3 className="text-lg font-semibold text-theme-primary">Dividenden-Kalender (nächste 3 Monate)</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[0, 1, 2].map(monthOffset => {
                    const date = new Date()
                    date.setMonth(date.getMonth() + monthOffset)
                    const monthName = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
                    
                    const monthEvents = dividendEvents.filter(event => {
                      const eventDate = new Date(event.exDate)
                      return eventDate.getMonth() === date.getMonth() && 
                             eventDate.getFullYear() === date.getFullYear()
                    })
                    
                    const monthTotal = monthEvents.reduce((sum, event) => sum + event.totalAmount, 0)
                    
                    return (
                      <div key={monthOffset} className="border border-theme rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-theme-primary capitalize">{monthName}</h4>
                          <span className="text-sm font-medium text-green-400">${monthTotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="space-y-2">
                          {monthEvents.slice(0, 4).map(event => (
                            <div key={`${event.ticker}-${event.exDate}`} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="text-theme-primary font-medium">{event.ticker}</span>
                                <span className="text-theme-muted">{new Date(event.exDate).getDate()}.</span>
                              </div>
                              <span className="text-theme-primary font-medium">${event.totalAmount.toFixed(0)}</span>
                            </div>
                          ))}
                          
                          {monthEvents.length > 4 && (
                            <div className="text-xs text-theme-muted">
                              +{monthEvents.length - 4} weitere
                            </div>
                          )}
                          
                          {monthEvents.length === 0 && (
                            <div className="text-xs text-theme-muted">Keine Dividenden</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'history' && (
          <div className="bg-theme-card border border-theme rounded-lg">
            <div className="p-6 border-b border-theme">
              <h3 className="text-lg font-semibold text-theme-primary">Dividenden-Historie</h3>
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-theme-secondary">
                    <tr>
                      <th className="text-left py-3 px-6 text-theme-secondary font-medium">Jahr</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">Erhalten</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">Zahlungen</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">Ø Rendite</th>
                      <th className="text-right py-3 px-6 text-theme-secondary font-medium">Wachstum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividendHistory.map((year, index) => {
                      const prevYear = dividendHistory[index + 1]
                      const growth = prevYear ? ((year.totalReceived - prevYear.totalReceived) / prevYear.totalReceived * 100) : 0
                      
                      return (
                        <tr key={year.year} className="border-t border-theme hover:bg-theme-secondary/30">
                          <td className="py-4 px-6 font-semibold text-theme-primary">{year.year}</td>
                          <td className="py-4 px-6 text-right text-theme-primary font-semibold">${year.totalReceived.toFixed(2)}</td>
                          <td className="py-4 px-6 text-right text-theme-secondary">{year.payments}</td>
                          <td className="py-4 px-6 text-right text-theme-secondary">{year.avgYield.toFixed(1)}%</td>
                          <td className={`py-4 px-6 text-right font-medium ${
                            growth > 0 ? 'text-green-400' : growth < 0 ? 'text-red-400' : 'text-theme-secondary'
                          }`}>
                            {prevYear ? `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%` : '–'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="space-y-6">
            <div className="bg-theme-card border border-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">Benachrichtigungen</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-theme-secondary">Ex-Dividend Benachrichtigungen</span>
                  <input type="checkbox" className="toggle" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-theme-secondary">Zahlungsbenachrichtigungen</span>
                  <input type="checkbox" className="toggle" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-theme-secondary">Wöchentliche Zusammenfassung</span>
                  <input type="checkbox" className="toggle" />
                </label>
              </div>
            </div>

            <div className="bg-theme-card border border-theme rounded-lg p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">Export</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors">
                  <div className="font-medium text-theme-primary">Dividenden-Kalender exportieren</div>
                  <div className="text-sm text-theme-muted">CSV-Export für Excel oder Google Sheets</div>
                </button>
                
                <button className="w-full text-left p-3 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors">
                  <div className="font-medium text-theme-primary">Steuer-Report erstellen</div>
                  <div className="text-sm text-theme-muted">Dividenden-Übersicht für die Steuererklärung</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Superinvestor Insight */}
        <div className="mt-8 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h4 className="font-semibold text-green-400 mb-2">💡 Superinvestor Insight</h4>
              <p className="text-theme-secondary">
                Warren Buffetts Portfolio erhält diese Woche <strong className="text-theme-primary">$2.3M</strong> an Dividenden. 
                Die größten Ausschüttungen kommen von Apple ($1.8M) und Coca-Cola ($340k).
              </p>
              <Link
                href="/analyse/super-investors"
                className="mt-3 inline-flex items-center gap-1 text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
              >
                <span>Alle Superinvestor Dividenden anzeigen</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}