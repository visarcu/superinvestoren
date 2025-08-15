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

interface CalendarEvent {
  date: string
  type: 'dividend' | 'earnings' | 'split'
  symbol: string
  name: string
  amount?: number // für Dividenden
  estimate?: number // für Earnings estimates
  actual?: number // für Earnings actual
  ratio?: string // für Splits
  time?: string // pre-market, post-market, etc
}

interface PortfolioCalendarProps {
  holdings: Array<{
    symbol: string
    name: string
    quantity: number
  }>
}

export default function PortfolioCalendar({ holdings }: PortfolioCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
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
    
    // Für jede Aktie im Portfolio Events laden
    for (const holding of holdings) {
      try {
        // Dividenden laden
        const divResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/stock_dividend_calendar?from=${getMonthStart()}&to=${getMonthEnd()}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
        if (divResponse.ok) {
          const divData = await divResponse.json()
          const stockDividends = divData.filter((d: any) => d.symbol === holding.symbol)
          
          stockDividends.forEach((div: any) => {
            allEvents.push({
              date: div.date,
              type: 'dividend',
              symbol: holding.symbol,
              name: holding.name,
              amount: div.dividend,
              time: 'Ex-Dividend'
            })
          })
        }

        // Earnings laden
        const earnResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/earning_calendar?from=${getMonthStart()}&to=${getMonthEnd()}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
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
        console.error(`Error loading events for ${holding.symbol}:`, error)
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
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), date)
      .toISOString().split('T')[0]
    
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
        <div key={`empty-${i}`} className="p-2 border border-theme/10 bg-theme-secondary/20 min-h-[100px]">
          <span className="text-theme-muted text-xs">
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
          className={`p-2 border border-theme/10 min-h-[100px] cursor-pointer transition-colors ${
            isToday ? 'bg-green-500/10 border-green-500/30' : 'bg-theme-card hover:bg-theme-secondary/30'
          }`}
          onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-semibold ${isToday ? 'text-green-400' : 'text-theme-primary'}`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-xs bg-theme-secondary px-1.5 py-0.5 rounded text-theme-muted">
                {dayEvents.length}
              </span>
            )}
          </div>
          
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                className={`text-xs px-1.5 py-1 rounded flex items-center gap-1 ${getEventColor(event.type)}`}
              >
                {getEventIcon(event.type)}
                <span className="truncate font-medium">{event.symbol}</span>
              </div>
            ))}
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
        <div key={`next-${i}`} className="p-2 border border-theme/10 bg-theme-secondary/20 min-h-[100px]">
          <span className="text-theme-muted text-xs">{i}</span>
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
              <div key={idx} className="flex items-start gap-3 p-3 bg-theme-secondary/30 rounded-lg">
                <div className={`p-2 rounded-lg ${getEventColor(event.type)}`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-theme-primary">{event.symbol}</span>
                    <span className="text-sm text-theme-secondary">{event.name}</span>
                  </div>
                  
                  {event.type === 'dividend' && (
                    <div className="text-sm text-theme-secondary">
                      <span className="text-green-400 font-medium">
                        ${event.amount?.toFixed(2)} pro Aktie
                      </span>
                      <span className="text-theme-muted ml-2">• Ex-Dividend Date</span>
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
              <p className="text-theme-muted text-center py-4">
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