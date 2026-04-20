'use client'

import React from 'react'
import Link from 'next/link'

interface StockDividendSummary {
  symbol: string
  name: string
  total: number
  count: number
  lastDate: string
}

interface DividendsByStockProps {
  data: StockDividendSummary[]
  formatCurrency: (v: number) => string
}

export default function DividendsByStock({ data, formatCurrency }: DividendsByStockProps) {
  if (data.length === 0) return null

  const grandTotal = data.reduce((s, d) => s + d.total, 0)

  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <h2 className="text-[13px] font-semibold text-white/80">Pro Aktie</h2>
        <p className="text-[11px] text-white/25 mt-0.5">{data.length} Dividenden-Zahler im Portfolio</p>
      </div>

      <div>
        {data.map(d => {
          const share = grandTotal > 0 ? (d.total / grandTotal) * 100 : 0
          return (
            <Link
              key={d.symbol}
              href={`/analyse/mein-portfolio/aktien/${d.symbol}`}
              className="grid grid-cols-12 gap-3 items-center px-6 py-3 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.015] transition-colors group"
            >
              {/* Aktie */}
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/logo/${d.symbol}?size=60`}
                  alt={d.symbol}
                  className="w-7 h-7 rounded-lg bg-white/[0.06] object-contain flex-shrink-0"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white/70 group-hover:text-white">{d.symbol}</p>
                  <p className="text-[10px] text-white/35 truncate">{d.name}</p>
                </div>
              </div>

              {/* Anzahl Zahlungen */}
              <div className="col-span-2 text-right">
                <p className="text-[11px] text-white/30 tabular-nums">
                  {d.count} {d.count === 1 ? 'Zahlung' : 'Zahlungen'}
                </p>
              </div>

              {/* Letzte Zahlung */}
              <div className="col-span-2 text-right">
                <p className="text-[11px] text-white/30 tabular-nums">
                  {new Date(d.lastDate).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
                </p>
              </div>

              {/* Total + Anteil */}
              <div className="col-span-3 text-right">
                <p className="text-[12px] font-semibold text-emerald-400 tabular-nums">
                  +{formatCurrency(d.total)}
                </p>
                <p className="text-[10px] text-white/25 tabular-nums">{share.toFixed(1).replace('.', ',')}% Anteil</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
