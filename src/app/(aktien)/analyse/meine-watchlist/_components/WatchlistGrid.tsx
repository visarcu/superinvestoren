'use client'

import React from 'react'
import Link from 'next/link'
import { fmtPrice, fmtPct, fmtMarketCap, formatEarningsDate } from '../_lib/format'
import type { WatchlistItem, StockData, EarningsEvent } from '../_lib/types'

interface WatchlistGridProps {
  items: WatchlistItem[]
  stockData: Record<string, StockData>
  earningsEvents: EarningsEvent[]
  onRemove: (id: string, ticker: string) => void
}

export default function WatchlistGrid({ items, stockData, earningsEvents, onRemove }: WatchlistGridProps) {
  const getNextEarnings = (ticker: string): EarningsEvent | undefined =>
    earningsEvents.find(e => e.symbol === ticker)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => {
        const data = stockData[item.ticker]
        const earnings = getNextEarnings(item.ticker)
        const positive = (data?.changePercent ?? 0) >= 0

        // 52W-Range Position für Mini-Bar (0–100%)
        const rangePos =
          data?.week52Low && data?.week52High && data.week52High > data.week52Low
            ? Math.max(0, Math.min(100, ((data.price - data.week52Low) / (data.week52High - data.week52Low)) * 100))
            : null

        return (
          <div
            key={item.id}
            className="relative bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.08] transition-all group"
          >
            {/* Remove-Button (top right, hover) */}
            <button
              onClick={() => onRemove(item.id, item.ticker)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all z-10"
              title={`${item.ticker} aus Watchlist entfernen`}
              aria-label={`${item.ticker} aus Watchlist entfernen`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <Link href={`/analyse/aktien/${item.ticker}`} className="block">
              {/* Header: Logo + Ticker + Name */}
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/logo/${item.ticker}?size=64`}
                  alt={item.ticker}
                  className="w-9 h-9 rounded-xl bg-white/[0.04] object-contain flex-shrink-0"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className="min-w-0 flex-1 pr-8">
                  <p className="text-[14px] font-bold text-white tracking-tight">{item.ticker}</p>
                  <p className="text-[11px] text-white/30 truncate">{data?.companyName ?? '–'}</p>
                </div>
              </div>

              {/* Preis + Change */}
              <div className="mb-4">
                {data ? (
                  <>
                    <p className="text-2xl font-bold text-white tabular-nums">{fmtPrice(data.price)} $</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[12px] font-semibold tabular-nums ${
                          positive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {fmtPct(data.changePercent)}
                      </span>
                      <span className={`text-[11px] tabular-nums ${positive ? 'text-emerald-400/50' : 'text-red-400/50'}`}>
                        {data.change >= 0 ? '+' : ''}
                        {data.change.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-6 w-24 bg-white/[0.03] rounded animate-pulse" />
                    <div className="h-3 w-16 bg-white/[0.03] rounded animate-pulse mt-2" />
                  </>
                )}
              </div>

              {/* 52W Range Bar */}
              {rangePos !== null && (
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-white/15 uppercase tracking-wider">52W</span>
                    {data?.isDip && (
                      <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider">Dip</span>
                    )}
                  </div>
                  <div className="relative h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full bg-white/[0.15]"
                      style={{ width: `${rangePos}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                      style={{ left: `${rangePos}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-white/20 tabular-nums">{fmtPrice(data?.week52Low)}</span>
                    <span className="text-[9px] text-white/20 tabular-nums">{fmtPrice(data?.week52High)}</span>
                  </div>
                </div>
              )}

              {/* Footer-Stats */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.03] text-[11px]">
                <div>
                  <p className="text-white/20 mb-0.5">MKT Cap</p>
                  <p className="text-white/60 tabular-nums">{data?.marketCap ? fmtMarketCap(data.marketCap) : '–'}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/20 mb-0.5">Earnings</p>
                  {earnings ? (
                    <p className="text-white/60 tabular-nums flex items-center gap-1 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {formatEarningsDate(earnings)}
                    </p>
                  ) : (
                    <p className="text-white/20">–</p>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )
      })}
    </div>
  )
}
