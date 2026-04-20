'use client'

import React from 'react'
import Link from 'next/link'
import { fmtPrice, fmtPct, fmtVolume, formatEarningsDate } from '../_lib/format'
import type { WatchlistItem, StockData, EarningsEvent, SortColumn, SortDirection } from '../_lib/types'

interface WatchlistListProps {
  items: WatchlistItem[]
  stockData: Record<string, StockData>
  earningsEvents: EarningsEvent[]
  sortColumn: SortColumn
  sortDirection: SortDirection
  onSort: (col: SortColumn) => void
  onRemove: (id: string, ticker: string) => void
}

const ChevronIcon = ({ direction }: { direction: SortDirection }) => (
  <svg
    className={`w-3 h-3 transition-transform ${direction === 'asc' ? '' : 'rotate-180'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
)

interface SortHeaderProps {
  column: SortColumn
  label: string
  align?: 'left' | 'right'
  sortColumn: SortColumn
  sortDirection: SortDirection
  onSort: (col: SortColumn) => void
}

function SortHeader({ column, label, align = 'left', sortColumn, sortDirection, onSort }: SortHeaderProps) {
  const active = sortColumn === column
  return (
    <th
      onClick={() => onSort(column)}
      className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest cursor-pointer transition-colors select-none ${
        active ? 'text-white/60' : 'text-white/35 hover:text-white/40'
      } ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {active && <ChevronIcon direction={sortDirection} />}
      </div>
    </th>
  )
}

export default function WatchlistList({
  items,
  stockData,
  earningsEvents,
  sortColumn,
  sortDirection,
  onSort,
  onRemove,
}: WatchlistListProps) {
  const getNextEarnings = (ticker: string): EarningsEvent | undefined =>
    earningsEvents.find(e => e.symbol === ticker)

  return (
    <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-white/[0.04]">
            <tr>
              <SortHeader column="ticker" label="Aktie" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortHeader column="price" label="Kurs" align="right" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortHeader column="changePercent" label="% Heute" align="right" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortHeader column="revenueGrowthYOY" label="Umsatz YoY" align="right" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortHeader column="earnings" label="Earnings" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <SortHeader column="volume" label="Volumen" align="right" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} />
              <th className="w-12" aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const data = stockData[item.ticker]
              const earnings = getNextEarnings(item.ticker)
              const positive = (data?.changePercent ?? 0) >= 0

              return (
                <tr
                  key={item.id}
                  className="border-t border-white/[0.03] hover:bg-white/[0.015] transition-colors group"
                >
                  {/* Aktie (Logo + Ticker + Name) */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/analyse/aktien/${item.ticker}`}
                      className="flex items-center gap-3 group/link"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/v1/logo/${item.ticker}?size=64`}
                        alt={item.ticker}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] object-contain flex-shrink-0"
                        onError={e => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-white tracking-tight">{item.ticker}</p>
                        <p className="text-[11px] text-white/30 truncate max-w-[200px]">
                          {data?.companyName ?? '–'}
                        </p>
                      </div>
                    </Link>
                  </td>

                  {/* Kurs */}
                  <td className="px-4 py-3 text-right">
                    {data ? (
                      <p className="text-[13px] font-semibold text-white tabular-nums">
                        {fmtPrice(data.price)} $
                      </p>
                    ) : (
                      <div className="h-4 w-16 bg-white/[0.03] rounded animate-pulse ml-auto" />
                    )}
                  </td>

                  {/* % Heute */}
                  <td className="px-4 py-3 text-right">
                    {data ? (
                      <p
                        className={`text-[13px] font-semibold tabular-nums ${
                          positive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {fmtPct(data.changePercent)}
                      </p>
                    ) : (
                      <div className="h-4 w-12 bg-white/[0.03] rounded animate-pulse ml-auto" />
                    )}
                  </td>

                  {/* Umsatz YoY */}
                  <td className="px-4 py-3 text-right">
                    {data?.revenueGrowthYOY != null ? (
                      <p
                        className={`text-[12px] font-medium tabular-nums ${
                          data.revenueGrowthYOY >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'
                        }`}
                      >
                        {fmtPct(data.revenueGrowthYOY)}
                      </p>
                    ) : (
                      <p className="text-[12px] text-white/30">–</p>
                    )}
                  </td>

                  {/* Earnings */}
                  <td className="px-4 py-3">
                    {earnings ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <p className="text-[12px] text-white/60 tabular-nums">{formatEarningsDate(earnings)}</p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-white/30">–</p>
                    )}
                  </td>

                  {/* Volumen */}
                  <td className="px-4 py-3 text-right">
                    <p className="text-[12px] text-white/40 tabular-nums">
                      {data?.volume != null ? fmtVolume(data.volume) : '–'}
                    </p>
                  </td>

                  {/* Remove */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onRemove(item.id, item.ticker)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      title={`${item.ticker} aus Watchlist entfernen`}
                      aria-label={`${item.ticker} aus Watchlist entfernen`}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
