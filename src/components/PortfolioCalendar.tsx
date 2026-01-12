// src/components/PortfolioCalendar.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  BanknotesIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { currencyManager } from '@/lib/portfolioCurrency'

interface CalendarEvent {
  date: string
  type: 'dividend' | 'earnings' | 'split'
  symbol: string
  name: string
  amount?: number
  totalAmount?: number
  amountEUR?: number
  totalAmountEUR?: number
  estimate?: number
  actual?: number
  ratio?: string
  time?: string
  isPaymentDate?: boolean
  paymentDate?: string
  exDate?: string
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
  const [currentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

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
      const dividendResponse = await fetch('/api/dividend-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings })
      })

      if (dividendResponse.ok) {
        const dividendData = await dividendResponse.json()

        if (dividendData.success && dividendData.annualDividends) {
          const exchangeRate = await currencyManager.getCurrentUSDtoEURRate()

          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)

          dividendData.annualDividends.forEach((stock: any) => {
            const holding = holdings.find(h => h.symbol === stock.symbol)
            if (!holding) return

            if (stock.nextPaymentDate) {
              const paymentDate = new Date(stock.nextPaymentDate)

              if (paymentDate >= monthStart && paymentDate <= monthEnd) {
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
                        isPaymentDate: false,
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
          console.error(`Error loading ex-dates for ${holding.symbol}:`, error)
        }
      }

    } catch (error) {
      console.error('Error loading calendar events:', error)
    }

    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    setEvents(allEvents)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ArrowPathIcon className="w-5 h-5 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-neutral-400 text-sm">Lade Kalender-Events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Event List */}
      <div>
        <h2 className="text-sm font-medium text-neutral-400 mb-4">Kommende Dividenden & Events</h2>

        {events.length > 0 ? (
          <div className="space-y-0">
            {events.slice(0, 10).map((event, index) => {
              const holding = holdings.find(h => h.symbol === event.symbol)
              const quantity = holding?.quantity || 0

              return (
                <div
                  key={`${event.symbol}-${event.date}-${index}`}
                  className="flex items-center justify-between py-4 border-b border-neutral-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      event.isPaymentDate ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                    }`}>
                      {event.isPaymentDate ? (
                        <BanknotesIcon className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <CalendarIcon className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">{event.symbol}</span>
                        <span className="text-xs text-neutral-500">{event.name}</span>
                      </div>
                      <div className={`text-xs ${event.isPaymentDate ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {event.isPaymentDate ? 'Payment' : 'Ex-Date'}: {new Date(event.date).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>

                  {event.totalAmount && event.totalAmount > 0 && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                        {event.totalAmountEUR ? `€${event.totalAmountEUR.toFixed(2)}` : `$${event.totalAmount.toFixed(2)}`}
                      </div>
                      <div className="text-xs text-neutral-500">{quantity} Aktien</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <img
              src="/illustrations/undraw_investing_uzcu.svg"
              alt="Kalender"
              className="w-32 h-32 mx-auto mb-6 opacity-60"
            />
            <h3 className="text-base font-medium text-white mb-2">
              Keine Events gefunden
            </h3>
            <p className="text-neutral-500 text-sm max-w-sm mx-auto">
              Für deine Positionen wurden keine Dividenden-Events im aktuellen Monat gefunden.
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats - Flat inline */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4 pt-4 border-t border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BanknotesIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-neutral-500">Kommende Dividenden</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {events.filter(e => e.isPaymentDate).length}
          </p>
          <p className="text-xs text-emerald-400">
            ~€{events.filter(e => e.isPaymentDate).reduce((sum, e) => sum + (e.totalAmountEUR || 0), 0).toFixed(2)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-neutral-500">Ex-Dates</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {events.filter(e => !e.isPaymentDate).length}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <ChartBarIcon className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-neutral-500">Nächstes Event</span>
          </div>
          {events.length > 0 ? (
            <>
              <p className="text-lg font-semibold text-white">
                {new Date(events[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </p>
              <p className="text-xs text-neutral-500">{events[0].symbol} {events[0].isPaymentDate ? 'Payment' : 'Ex-Date'}</p>
            </>
          ) : (
            <p className="text-lg font-semibold text-neutral-600">-</p>
          )}
        </div>
      </div>
    </div>
  )
}
