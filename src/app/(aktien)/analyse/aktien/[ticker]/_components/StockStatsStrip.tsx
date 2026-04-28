'use client'

import React, { useMemo } from 'react'
import type { Quote, PricePoint, AftermarketQuote } from '../_lib/types'
import { fmt } from '../_lib/format'

interface StockStatsStripProps {
  quote: Quote | null
  fullPriceHistory: PricePoint[]
  aftermarket?: AftermarketQuote | null
}

const formatPrice = (v: number | null | undefined): string => {
  if (v == null) return '–'
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface RangeBarProps {
  low: number
  high: number
  current: number
  lowLabel: string
  highLabel: string
}

function RangeBar({ low, high, current, lowLabel, highLabel }: RangeBarProps) {
  const span = high - low
  const pct = span > 0 ? Math.min(100, Math.max(0, ((current - low) / span) * 100)) : 50

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="relative h-1 rounded-full bg-white/[0.06] overflow-visible">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/85 shadow-[0_0_0_3px_rgba(10,10,15,1)]"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10.5px] tabular-nums text-white/35">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}

interface StatProps {
  label: string
  children: React.ReactNode
}

function Stat({ label, children }: StatProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10.5px] uppercase tracking-wider text-white/30 font-medium">{label}</span>
      <div className="text-[13px] text-white/85 font-medium tabular-nums">{children}</div>
    </div>
  )
}

export default function StockStatsStrip({
  quote,
  fullPriceHistory,
  aftermarket,
}: StockStatsStripProps) {
  const fiftyTwoWeek = useMemo(() => {
    if (fullPriceHistory.length === 0) return null
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 1)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const window = fullPriceHistory.filter(p => p.date >= cutoffStr)
    if (window.length === 0) return null
    const prices = window.map(p => p.price)
    return { low: Math.min(...prices), high: Math.max(...prices) }
  }, [fullPriceHistory])

  if (!quote) return null

  const dayLow = quote.dayLow ?? null
  const dayHigh = quote.dayHigh ?? null
  const hasDayRange = dayLow != null && dayHigh != null && dayHigh > dayLow

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-4 py-4 border-y border-white/[0.04]">
        <Stat label="Eröffnung">{formatPrice(quote.open)} $</Stat>
        <Stat label="Vortag">{formatPrice(quote.previousClose)} $</Stat>
        <Stat label="Tagesbereich">
          {hasDayRange ? (
            <RangeBar
              low={dayLow}
              high={dayHigh}
              current={quote.price}
              lowLabel={`${formatPrice(dayLow)}`}
              highLabel={`${formatPrice(dayHigh)}`}
            />
          ) : (
            '–'
          )}
        </Stat>
        <Stat label="52W-Bereich">
          {fiftyTwoWeek ? (
            <RangeBar
              low={fiftyTwoWeek.low}
              high={fiftyTwoWeek.high}
              current={quote.price}
              lowLabel={formatPrice(fiftyTwoWeek.low)}
              highLabel={formatPrice(fiftyTwoWeek.high)}
            />
          ) : (
            '–'
          )}
        </Stat>
        <Stat label="Marktkap.">{quote.marketCap ? fmt(quote.marketCap) : '–'}</Stat>
      </div>

      {/* Aftermarket-Zeile: nur wenn FMP Daten liefert */}
      {aftermarket?.available && aftermarket.price ? <AftermarketRow am={aftermarket} /> : null}
    </div>
  )
}

function AftermarketRow({ am }: { am: AftermarketQuote }) {
  if (!am.price) return null
  const change = am.change ?? 0
  const changePct = am.changePct ?? 0
  const positive = change >= 0
  const time = am.timestamp
    ? new Date(am.timestamp * 1000).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="flex items-center justify-end gap-2 py-2 text-[11.5px] tabular-nums">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 flex-shrink-0" />
      <span className="text-white/35 uppercase tracking-wider text-[10px] font-medium">
        Nachbörslich
      </span>
      <span className="text-white/85 font-semibold">
        {am.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
      </span>
      {am.referencePrice ? (
        <>
          <span
            className={`font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {positive ? '+' : ''}
            {changePct.toFixed(2).replace('.', ',')}%
          </span>
          <span
            className={`text-[10.5px] ${positive ? 'text-emerald-400/55' : 'text-red-400/55'}`}
          >
            {positive ? '+' : ''}
            {change.toFixed(2).replace('.', ',')}
          </span>
        </>
      ) : null}
      {time ? <span className="text-white/30">· {time}</span> : null}
    </div>
  )
}
