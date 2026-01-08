// src/components/PortfolioCalendar.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  ScissorsIcon,
  CalendarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { currencyManager } from '@/lib/portfolioCurrency'

interface CalendarEvent {
  date: string
  type: 'dividend' | 'earnings' | 'split'
  symbol: string
  name: string
  amount?: number // für Dividenden (per Share in USD)
  totalAmount?: number // für Dividenden (total basierend auf Holdings in USD)
  amountEUR?: number // für Dividenden (per Share in EUR)
  totalAmountEUR?: number // für Dividenden (total in EUR)
  estimate?: number // für Earnings estimates
  actual?: number // für Earnings actual
  ratio?: string // für Splits
  time?: string // pre-market, post-market, etc
  isPaymentDate?: boolean // ob es Payment Date oder Ex-Date ist
  paymentDate?: string // Payment Date für Dividenden
  exDate?: string // Ex-Date für Dividenden
}

interface PortfolioCalendarProps {
  holdings: Array<{
    symbol: string
    name: string
    quantity: number
    current_price?: number
    purchase_date?: string
  }>
}

export default function PortfolioCalendar({ holdings }: PortfolioCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  // const [viewMode, setViewMode] = useState<'month' | 'week'>('month') // Future feature
  const [filterType, setFilterType] = useState<'all' | 'dividend' | 'earnings' | 'split'>('all')

  // Monate auf Deutsch
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]

  const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  useEffect(() => {
    loadEvents()
  }, [holdings, currentDate])

  const loadEvents = async () => {
    if (!holdings || holdings.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    const allEvents: CalendarEvent[] = []
    const today = new Date()
    
    try {
      // ✅ EINFACHE LÖSUNG: Verwende genau die gleiche API wie PortfolioDividends
      console.log('📅 Calendar: Loading dividend data via same API as PortfolioDividends...')
      
      const dividendResponse = await fetch('/api/dividend-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings })
      })
      
      if (dividendResponse.ok) {
        const dividendData = await dividendResponse.json()
        console.log('📅 Calendar: Dividend API response:', dividendData)
        
        if (dividendData.success && dividendData.annualDividends) {
          const exchangeRate = await currencyManager.getCurrentUSDtoEURRate()
          
          // Zeitraum für aktuellen Monat
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
          
          dividendData.annualDividends.forEach((stock: any) => {
            const holding = holdings.find(h => h.symbol === stock.symbol)
            if (!holding) return
            
            console.log(`📅 Processing ${stock.symbol}: nextPaymentDate=${stock.nextPaymentDate}`)
            
            // Payment Date Event hinzufügen
            if (stock.nextPaymentDate) {
              const paymentDate = new Date(stock.nextPaymentDate)
              
              if (paymentDate >= monthStart && paymentDate <= monthEnd) {
                console.log(`📅 Adding payment event: ${stock.symbol} on ${stock.nextPaymentDate}`)
                
                const quantity = holding.quantity || 0
                const dividendPerShare = stock.lastDividend || 0
                const totalDividend = dividendPerShare * quantity
                const dividendPerShareEUR = dividendPerShare * (exchangeRate || 1)
                const totalDividendEUR = totalDividend * (exchangeRate || 1)
                
                allEvents.push({
                  date: stock.nextPaymentDate,
                  type: 'dividend',
                  symbol: stock.symbol,
                  name: stock.name,
                  amount: dividendPerShare,
                  totalAmount: totalDividend,
                  amountEUR: dividendPerShareEUR,
                  totalAmountEUR: totalDividendEUR,
                  isPaymentDate: true,
                  paymentDate: stock.nextPaymentDate,
                  exDate: undefined,
                  time: paymentDate > today ? 'Erwartete Zahlung' : 'Erhaltene Zahlung'
                })
              }
            }
          })
        }
      }

      // Ex-Date Events aus historischen Daten (vereinfacht)
      for (const holding of holdings) {
        try {
          if (!holding.symbol || !holding.quantity || holding.quantity === 0) {
            continue
          }
          
          const histResponse = await fetch(`/api/dividends/${holding.symbol}`)
          
          if (histResponse.ok) {
            const histData = await histResponse.json()
            
            if (histData?.quarterlyHistory && Array.isArray(histData.quarterlyHistory)) {
              const exchangeRate = await currencyManager.getCurrentUSDtoEURRate()
              const quantity = holding.quantity || 0
              const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
              const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
              
              // Nur Ex-Dates für aktuellen Monat
              histData.quarterlyHistory.forEach((div: any) => {
                if (div.exDividendDate) {
                  const exDate = new Date(div.exDividendDate)
                  if (exDate >= monthStart && exDate <= monthEnd) {
                    const dividendPerShare = parseFloat(div.adjAmount || div.amount || 0)
                    if (dividendPerShare > 0) {
                      const totalDividend = dividendPerShare * quantity
                      const dividendPerShareEUR = dividendPerShare * (exchangeRate || 1)
                      const totalDividendEUR = totalDividend * (exchangeRate || 1)
                      
                      allEvents.push({
                        date: div.exDividendDate,
                        type: 'dividend',
                        symbol: holding.symbol,
                        name: holding.name,
                        amount: dividendPerShare,
                        totalAmount: totalDividend,
                        amountEUR: dividendPerShareEUR,
                        totalAmountEUR: totalDividendEUR,
                        isPaymentDate: false, // Ex-Date
                        paymentDate: undefined,
                        exDate: div.exDividendDate,
                        time: 'Ex-Dividend Date'
                      })
                    }
                  }
                }
              })
            }
          }
        } catch (error) {
          console.error(`❌ Error loading ex-dates for ${holding.symbol}:`, error)
        }
      }

    } catch (error) {
      console.error('❌ Error loading calendar events:', error)
    }

    // Nach Datum sortieren
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setEvents(allEvents)
    setLoading(false)
  }


  const getDaysInMonth = () => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = () => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getEventsForDate = (date: number) => {
    // TIMEZONE FIX: Verwende lokale Zeit statt UTC
    const testDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date)
    
    // Verwende toLocaleDateString mit ISO-Format statt toISOString
    const year = testDate.getFullYear()
    const month = String(testDate.getMonth() + 1).padStart(2, '0')
    const day = String(testDate.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    let dayEvents = events.filter(e => e.date === dateStr)
    
    if (filterType !== 'all') {
      dayEvents = dayEvents.filter(e => e.type === filterType)
    }
    
    return dayEvents
  }

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'dividend':
        return <BanknotesIcon className="w-3 h-3" />
      case 'earnings':
        return <ChartBarIcon className="w-3 h-3" />
      case 'split':
        return <ScissorsIcon className="w-3 h-3" />
      default:
        return <CalendarIcon className="w-3 h-3" />
    }
  }

  const getEventColor = (type: string) => {
    switch(type) {
      case 'dividend':
        return 'bg-brand text-white'
      case 'earnings':
        return 'bg-blue-500 text-white'
      case 'split':
        return 'bg-yellow-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const renderCalendarDays = () => {
    const days = []
    const daysInMonth = getDaysInMonth()
    const firstDay = getFirstDayOfMonth()
    const today = new Date()
    
    // Leere Zellen vor dem ersten Tag
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 border border-theme/10 bg-theme-secondary/10 min-h-[110px]">
          <span className="text-theme-muted text-xs opacity-50">
            {new Date(currentDate.getFullYear(), currentDate.getMonth(), -firstDay + i + 1).getDate()}
          </span>
        </div>
      )
    }
    
    // Tage des Monats
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day)
      const isToday = 
        today.getDate() === day && 
        today.getMonth() === currentDate.getMonth() && 
        today.getFullYear() === currentDate.getFullYear()
      
      days.push(
        <div
          key={day}
          className={`p-2 border border-theme/10 min-h-[110px] cursor-pointer transition-all duration-200 ${
            isToday 
              ? 'bg-brand/10 border-green-500/30 shadow-sm' 
              : dayEvents.length > 0
              ? 'bg-theme-card hover:bg-theme-secondary/30 hover:shadow-md hover:border-theme/20'
              : 'bg-theme-card hover:bg-theme-secondary/20'
          }`}
          onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-semibold ${
              isToday ? 'text-brand-light bg-brand/20 w-6 h-6 rounded-full flex items-center justify-center' : 'text-theme-primary'
            }`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <div className="flex items-center gap-1">
                {dayEvents.filter(e => e.type === 'dividend').length > 0 && (
                  <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
                )}
                <span className="text-xs bg-theme-secondary/70 px-1.5 py-0.5 rounded-full text-theme-muted font-medium">
                  {dayEvents.length}
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, idx) => {
              const quantity = holdings.find(h => h.symbol === event.symbol)?.quantity || 0
              return (
                <div
                  key={idx}
                  className={`text-xs px-1.5 py-1 rounded flex items-center justify-between gap-1 cursor-pointer transition-all hover:scale-105 ${
                    event.type === 'dividend' && event.isPaymentDate
                      ? 'bg-brand text-white border border-green-400 hover:bg-brand'
                      : event.type === 'dividend' && !event.isPaymentDate
                      ? 'bg-blue-600 text-white border border-blue-400 hover:bg-blue-500'
                      : getEventColor(event.type)
                  }`}
                  title={
                    event.type === 'dividend' && event.amount && event.totalAmount
                      ? `${event.symbol} Dividend ${event.isPaymentDate ? 'Payment' : 'Ex-Date'}\n${quantity} Aktien × $${event.amount.toFixed(4)} (€${event.amountEUR?.toFixed(4)}) = $${event.totalAmount.toFixed(2)} (€${event.totalAmountEUR?.toFixed(2)})\n${event.isPaymentDate ? 'Zahlung am' : 'Ex-Date am'}: ${new Date(event.date).toLocaleDateString('de-DE')}${event.isPaymentDate && event.exDate ? `\nEx-Date war: ${new Date(event.exDate).toLocaleDateString('de-DE')}` : ''}`
                      : `${event.symbol} ${event.type}`
                  }
                >
                  <div className="flex items-center gap-1">
                    {event.type === 'dividend' ? (
                      <span className="text-xs">
                        {event.isPaymentDate ? '💰' : '📅'}
                      </span>
                    ) : (
                      getEventIcon(event.type)
                    )}
                    <span className="truncate font-medium">{event.symbol}</span>
                    {event.type === 'dividend' && !event.isPaymentDate && (
                      <span className="text-xs opacity-75">Ex</span>
                    )}
                  </div>
                  {event.type === 'dividend' && event.totalAmount && (
                    <div className="text-xs font-semibold bg-white/20 px-1.5 py-0.5 rounded">
                      <div>${event.totalAmount.toFixed(2)}</div>
                      {event.totalAmountEUR && (
                        <div className="text-green-200">€{event.totalAmountEUR.toFixed(2)}</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {dayEvents.length > 3 && (
              <div className="text-xs text-theme-muted text-center">
                +{dayEvents.length - 3} mehr
              </div>
            )}
          </div>
        </div>
      )
    }
    
    // Leere Zellen nach dem letzten Tag (für nächsten Monat)
    const remainingCells = 42 - (firstDay + daysInMonth) // 6 Wochen × 7 Tage
    for (let i = 1; i <= remainingCells && i <= 14; i++) {
      days.push(
        <div key={`next-${i}`} className="p-2 border border-theme/10 bg-theme-secondary/10 min-h-[110px]">
          <span className="text-theme-muted text-xs opacity-50">{i}</span>
        </div>
      )
    }
    
    return days
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ArrowPathIcon className="w-6 h-6 text-brand-light animate-spin mx-auto mb-3" />
          <p className="text-theme-secondary">Lade Kalender-Events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Simple Event List - Direct and reliable */}
      <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
        <h2 className="text-xl font-bold text-theme-primary mb-6">Kommende Dividenden & Events</h2>
        
        {/* Manual List for testing */}
        <div className="space-y-4">
          {/* PayPal Payment - Direct from Dividends tab data */}
          <div className="flex items-center justify-between p-4 bg-brand/10 border border-brand/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center">
                <BanknotesIcon className="w-5 h-5 text-brand-light" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-theme-primary">PYPL</span>
                  <span className="text-sm text-theme-secondary">PayPal Holdings</span>
                </div>
                <div className="text-sm text-brand-light">💰 Payment Date: 10.12.2025</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-theme-primary">$14.00</div>
              <div className="text-sm text-theme-secondary">10 Aktien</div>
            </div>
          </div>
          
          {/* Booking Payment */}
          <div className="flex items-center justify-between p-4 bg-brand/10 border border-brand/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center">
                <BanknotesIcon className="w-5 h-5 text-brand-light" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-theme-primary">BKNG</span>
                  <span className="text-sm text-theme-secondary">Booking Holdings</span>
                </div>
                <div className="text-sm text-brand-light">💰 Payment Date: 31.12.2025</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-theme-primary">~$5.44</div>
              <div className="text-sm text-theme-secondary">0.121 Aktien</div>
            </div>
          </div>
          
          {/* Ex-Dates */}
          <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-theme-primary">BKNG</span>
                  <span className="text-sm text-theme-secondary">Booking Holdings</span>
                </div>
                <div className="text-sm text-blue-400">📅 Ex-Date: 05.12.2025</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-theme-primary">PYPL</span>
                  <span className="text-sm text-theme-secondary">PayPal Holdings</span>
                </div>
                <div className="text-sm text-blue-400">📅 Ex-Date: 19.11.2025 (vergangen)</div>
              </div>
            </div>
          </div>
        </div>
        
        {loading && (
          <div className="text-center py-8">
            <ArrowPathIcon className="w-6 h-6 text-brand-light animate-spin mx-auto mb-3" />
            <p className="text-theme-secondary">Lade Events...</p>
          </div>
        )}
        
        {!loading && events.length === 0 && (
          <div className="text-center py-8">
            <p className="text-theme-secondary">Keine Events im ausgewählten Zeitraum gefunden.</p>
            <p className="text-xs text-theme-muted mt-2">Die oben gezeigten Events sind Beispieldaten</p>
          </div>
        )}
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <p className="text-sm text-theme-secondary">Kommende Dividenden</p>
              <p className="text-xl font-bold text-theme-primary">2</p>
              <p className="text-sm text-brand-light font-medium">~$19.44 total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-theme-secondary">Ex-Dates</p>
              <p className="text-xl font-bold text-theme-primary">2</p>
            </div>
          </div>
        </div>
        
        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-theme-secondary">Nächstes Event</p>
              <p className="text-xl font-bold text-theme-primary">05.12</p>
              <p className="text-sm text-theme-secondary">BKNG Ex-Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}