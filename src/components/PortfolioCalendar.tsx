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
    // API Key removed for security - will use existing secure routes
    const today = new Date()
    
    
    // Für jede Aktie im Portfolio Events laden
    for (const holding of holdings) {
      try {
        if (!holding.symbol || !holding.quantity || holding.quantity === 0) {
          continue
        }
        
        // ✅ Historische + Zukünftige Dividenden laden
        
        const histResponse = await fetch(
          `/api/dividends/${holding.symbol}`
        )
        
        if (histResponse.ok) {
          const histData = await histResponse.json()
          
          if (histData?.historical && Array.isArray(histData.historical)) {
            if (histData.historical.length === 0) {
              continue
            }
            
            // EUR Wechselkurs einmal pro Aktie holen
            const exchangeRate = await currencyManager.getCurrentUSDtoEURRate()
            
            // Dividenden nach Payment Date gruppieren
            histData.historical.forEach((div: any) => {
              const paymentDate = new Date(div.paymentDate)
              const quantity = holding.quantity || 0
              const dividendPerShare = parseFloat(div.adjDividend || div.dividend || 0)
              const totalDividend = dividendPerShare * quantity
              
              // Nur Dividenden im relevanten Zeitraum des aktuellen Monats anzeigen
              const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
              const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59) // Ende des letzten Tags
              
                // Payment Date Event hinzufügen (wenn im aktuellen Monat)
              if (paymentDate >= monthStart && paymentDate <= monthEnd && dividendPerShare > 0) {
                // EUR Konvertierung für Dividenden
                const dividendPerShareEUR = dividendPerShare * (exchangeRate || 1)
                const totalDividendEUR = totalDividend * (exchangeRate || 1)
                
                allEvents.push({
                  date: div.paymentDate,
                  type: 'dividend',
                  symbol: holding.symbol,
                  name: holding.name,
                  amount: dividendPerShare,
                  totalAmount: totalDividend,
                  amountEUR: dividendPerShareEUR,
                  totalAmountEUR: totalDividendEUR,
                  isPaymentDate: true,
                  paymentDate: div.paymentDate,
                  exDate: div.date,
                  time: paymentDate > today ? 'Erwartete Zahlung' : 'Erhaltene Zahlung'
                })
                
              }
            })
          }
        }

        // Earnings laden (sicher über eigene API Route)
        const earnResponse = await fetch(
          `/api/earnings-calendar?from=${getMonthStart()}&to=${getMonthEnd()}&symbol=${holding.symbol}`
        )
        if (earnResponse.ok) {
          const earnData = await earnResponse.json()
          const stockEarnings = earnData.filter((e: any) => e.symbol === holding.symbol)
          
          stockEarnings.forEach((earn: any) => {
            allEvents.push({
              date: earn.date,
              type: 'earnings',
              symbol: holding.symbol,
              name: holding.name,
              estimate: earn.epsEstimated,
              actual: earn.eps,
              time: earn.time || 'TBD'
            })
          })
        }
      } catch (error) {
        console.error(`❌ Error loading events for ${holding.symbol}:`, error)
      }
    }

    // Nach Datum sortieren
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setEvents(allEvents)
    setLoading(false)
  }

  const getMonthStart = () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    return start.toISOString().split('T')[0]
  }

  const getMonthEnd = () => {
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    return end.toISOString().split('T')[0]
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
        return 'bg-green-500 text-white'
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
              ? 'bg-green-500/10 border-green-500/30 shadow-sm' 
              : dayEvents.length > 0
              ? 'bg-theme-card hover:bg-theme-secondary/30 hover:shadow-md hover:border-theme/20'
              : 'bg-theme-card hover:bg-theme-secondary/20'
          }`}
          onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-semibold ${
              isToday ? 'text-green-400 bg-green-500/20 w-6 h-6 rounded-full flex items-center justify-center' : 'text-theme-primary'
            }`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <div className="flex items-center gap-1">
                {dayEvents.filter(e => e.type === 'dividend').length > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
                      ? 'bg-green-600 text-white border border-green-400 hover:bg-green-500'
                      : getEventColor(event.type)
                  }`}
                  title={
                    event.type === 'dividend' && event.amount && event.totalAmount
                      ? `${event.symbol} Dividend\n${quantity} Aktien × $${event.amount.toFixed(4)} (€${event.amountEUR?.toFixed(4)}) = $${event.totalAmount.toFixed(2)} (€${event.totalAmountEUR?.toFixed(2)})\n${event.isPaymentDate ? 'Zahlung' : 'Ex-Date'}: ${new Date(event.date).toLocaleDateString('de-DE')}`
                      : `${event.symbol} ${event.type}`
                  }
                >
                  <div className="flex items-center gap-1">
                    {getEventIcon(event.type)}
                    <span className="truncate font-medium">{event.symbol}</span>
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
          <ArrowPathIcon className="w-6 h-6 text-green-400 animate-spin mx-auto mb-3" />
          <p className="text-theme-secondary">Lade Kalender-Events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-theme-secondary/30 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5 text-theme-secondary" />
            </button>
            
            <h2 className="text-xl font-bold text-theme-primary">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-theme-secondary/30 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-theme-secondary" />
            </button>
            
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm font-medium"
            >
              Heute
            </button>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors text-sm ${
                filterType === 'all' 
                  ? 'bg-theme-secondary text-theme-primary' 
                  : 'hover:bg-theme-secondary/30 text-theme-secondary'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilterType('dividend')}
              className={`px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1 ${
                filterType === 'dividend' 
                  ? 'bg-green-500 text-white' 
                  : 'hover:bg-green-500/20 text-green-400'
              }`}
            >
              <BanknotesIcon className="w-4 h-4" />
              Dividenden
            </button>
            <button
              onClick={() => setFilterType('earnings')}
              className={`px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1 ${
                filterType === 'earnings' 
                  ? 'bg-blue-500 text-white' 
                  : 'hover:bg-blue-500/20 text-blue-400'
              }`}
            >
              <ChartBarIcon className="w-4 h-4" />
              Earnings
            </button>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-theme/10">
          {/* Weekday Headers */}
          {weekDays.map(day => (
            <div key={day} className="bg-theme-secondary/50 p-2 text-center">
              <span className="text-sm font-medium text-theme-secondary">{day}</span>
            </div>
          ))}
          
          {/* Calendar Days */}
          {renderCalendarDays()}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">
            Events am {selectedDate.toLocaleDateString('de-DE', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          <div className="space-y-3">
            {getEventsForDate(selectedDate.getDate()).map((event, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-theme-secondary/20 rounded-lg border border-theme/20 hover:bg-theme-secondary/30 transition-colors">
                <div className={`p-2 rounded-lg ${getEventColor(event.type)}`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-theme-primary">{event.symbol}</span>
                      <span className="text-sm text-theme-secondary">{event.name}</span>
                    </div>
                    {event.type === 'dividend' && event.totalAmount && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-theme-primary">
                          ${event.totalAmount.toFixed(2)}
                        </div>
                        {event.totalAmountEUR && (
                          <div className="text-sm font-semibold text-theme-secondary">
                            ≈ €{event.totalAmountEUR.toFixed(2)}
                          </div>
                        )}
                        <div className="text-xs text-theme-muted">
                          {holdings.find(h => h.symbol === event.symbol)?.quantity || 0} Aktien
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {event.type === 'dividend' && (
                    <div className="text-sm text-theme-secondary space-y-3">
                      <div className="bg-theme-secondary/20 p-4 rounded-lg border border-theme/20">
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-theme-primary font-medium">
                              ${event.amount?.toFixed(4)} pro Aktie
                            </span>
                            <span className="text-theme-secondary font-semibold">
                              × {holdings.find(h => h.symbol === event.symbol)?.quantity || 0}
                            </span>
                          </div>
                          {event.amountEUR && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-theme-secondary">
                                ≈ €{event.amountEUR.toFixed(4)} pro Aktie
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-center border-t border-theme/20 pt-3 space-y-1">
                          <div className="text-theme-primary font-bold text-lg">
                            = ${event.totalAmount?.toFixed(2)} Gesamt
                          </div>
                          {event.totalAmountEUR && (
                            <div className="text-theme-secondary font-semibold">
                              ≈ €{event.totalAmountEUR.toFixed(2)} Gesamt
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-theme-secondary">
                        <span className="flex items-center gap-1">
                          {event.isPaymentDate ? '💰' : '📅'}
                          {event.isPaymentDate ? 'Dividend Payment' : 'Ex-Dividend Date'}
                        </span>
                        {event.time && (
                          <span className="px-2 py-1 bg-theme-secondary/30 rounded text-xs text-theme-muted">
                            {event.time}
                          </span>
                        )}
                      </div>
                      
                      {event.exDate && event.paymentDate && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-theme-secondary/30 p-3 rounded border border-theme/20">
                            <div className="text-theme-secondary font-medium mb-1">Ex-Date</div>
                            <div className="text-theme-primary">
                              {new Date(event.exDate).toLocaleDateString('de-DE')}
                            </div>
                          </div>
                          <div className="bg-theme-secondary/30 p-3 rounded border border-theme/20">
                            <div className="text-theme-secondary font-medium mb-1">Payment</div>
                            <div className="text-theme-primary">
                              {new Date(event.paymentDate).toLocaleDateString('de-DE')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {event.type === 'earnings' && (
                    <div className="text-sm text-theme-secondary">
                      <span className="text-blue-400 font-medium">Earnings Call</span>
                      {event.estimate && (
                        <span className="text-theme-muted ml-2">
                          • EPS Estimate: ${event.estimate.toFixed(2)}
                        </span>
                      )}
                      {event.time && (
                        <span className="text-theme-muted ml-2">• {event.time}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {getEventsForDate(selectedDate.getDate()).length === 0 && (
              <p className="text-theme-muted text-center py-8">
                Keine Events an diesem Tag
              </p>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-theme-secondary">Dividenden diesen Monat</p>
              <p className="text-xl font-bold text-theme-primary">
                {events.filter(e => e.type === 'dividend').length}
              </p>
              {events.filter(e => e.type === 'dividend' && e.totalAmount).length > 0 && (
                <p className="text-sm text-green-400 font-medium">
                  ${events.filter(e => e.type === 'dividend' && e.totalAmount)
                    .reduce((sum, e) => sum + (e.totalAmount || 0), 0).toFixed(2)} total
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-theme-secondary">Earnings diesen Monat</p>
              <p className="text-xl font-bold text-theme-primary">
                {events.filter(e => e.type === 'earnings').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-theme-secondary">Gesamt Events</p>
              <p className="text-xl font-bold text-theme-primary">
                {events.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}