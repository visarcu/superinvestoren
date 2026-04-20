'use client'

// IndexChart — schöner Area-Chart für die Home-Page mit Time-Range-Switcher.
// Nutzt /api/v1/historical/{eodhdSymbol} (EODHD + Yahoo-Fallback).
// Live-Quote aus dashboard-cached fließt als Overlay oben ein, letzter Chart-Punkt
// wird auf den Live-Preis angepasst, sobald verfügbar.

import React, { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

interface LiveQuote {
  price: number
  change: number
  changePercent: number
  previousClose?: number
  dayHigh?: number
  dayLow?: number
}

interface IndexChartProps {
  /** Interne Home-Symbol-ID: spx, ixic, dji, dax, stoxx, btc, gold, silver, oil */
  indexSymbol: string
  label: string
  flag: string
  quote: LiveQuote
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y'

const TIMEFRAMES: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', '5Y']

/**
 * Interne Home-Symbole → Ticker für /api/v1/historical/[ticker].
 * Für Indizes nutzen wir die tatsächlichen EODHD Index-Codes (.INDX),
 * für Commodities liquide ETF-Proxies die fast identisch verlaufen.
 */
function toHistoricalSymbol(indexSymbol: string): string | null {
  const map: Record<string, string> = {
    spx: 'GSPC.INDX', // S&P 500
    ixic: 'NDX.INDX', // NASDAQ 100
    dji: 'DJI.INDX', // Dow Jones Industrial Average
    dax: 'GDAXI.INDX', // DAX
    stoxx: 'STOXX.INDX', // STOXX 600
    btc: 'BTC-USD.CC', // Bitcoin USD
    gold: 'GLD.US', // SPDR Gold Trust (Proxy)
    silver: 'SLV.US', // iShares Silver Trust (Proxy)
    oil: 'BNO.US', // United States Brent Oil Fund (Proxy)
  }
  return map[indexSymbol] ?? null
}

const TT: React.CSSProperties = {
  backgroundColor: 'rgba(6,6,14,0.96)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

const DAYS_PER_RANGE: Record<TimeRange, number> = {
  '1W': 14,
  '1M': 45,
  '3M': 120,
  '6M': 200,
  '1Y': 380,
  '5Y': 1900,
}

function fmtPrice(v: number): string {
  if (v >= 10000) return v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function IndexChart({ indexSymbol, label, flag, quote }: IndexChartProps) {
  const [range, setRange] = useState<TimeRange>('1M')
  const [points, setPoints] = useState<{ date: string; close: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const historicalSymbol = toHistoricalSymbol(indexSymbol)

  useEffect(() => {
    if (!historicalSymbol) {
      setError('Kein historisches Symbol-Mapping für diesen Index')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    // 1D / 1W nutzen Intraday-Bars (schöner, wie Broker-Charts)
    // 1M+ nutzen EOD-Bars (Tagesauflösung reicht)
    const useIntraday = range === '1W'
    // 1D hätten wir ja auch gehabt in IndexChart, aber hier haben wir kein 1D-Range
    // → für diese Home-Variante starten wir bei 1W.

    const fetchUrl = useIntraday
      ? `/api/v1/intraday/${encodeURIComponent(historicalSymbol)}?interval=15m&range=5d`
      : `/api/v1/historical/${encodeURIComponent(historicalSymbol)}?days=${DAYS_PER_RANGE[range]}`

    fetch(fetchUrl)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return
        let pts: { date: string; close: number }[] = []
        if (useIntraday) {
          // Intraday-Response: [{timestamp, date, time, close}]
          pts = (data?.points || [])
            .filter((p: any) => p.close > 0)
            .map((p: any) => ({
              // Für 1W eindeutigen Key nutzen (Datum + Uhrzeit) damit Recharts
              // jeden Intraday-Punkt einzeln rendert und nicht mergt
              date: `${p.date}T${p.time}`,
              close: p.close,
            }))
        } else {
          pts = [...((data?.historical || []) as { date: string; close: number }[])]
            .filter(p => p.close > 0)
            .sort((a, b) => a.date.localeCompare(b.date))
        }
        setPoints(pts)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [historicalSymbol, range])

  // Letzten Punkt mit Live-Quote aktualisieren
  const pointsWithLive = useMemo(() => {
    if (points.length === 0 || !quote?.price) return points
    const todayISO = new Date().toISOString().slice(0, 10)
    const last = points[points.length - 1]
    if (last.date === todayISO) {
      // Heutigen Punkt auf Live-Preis setzen
      return [...points.slice(0, -1), { date: last.date, close: quote.price }]
    }
    // Neuen heutigen Punkt anhängen
    return [...points, { date: todayISO, close: quote.price }]
  }, [points, quote?.price])

  const firstPrice = pointsWithLive[0]?.close ?? 0
  const lastPrice = pointsWithLive[pointsWithLive.length - 1]?.close ?? 0
  const rangeChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0
  const isPositive = rangeChange >= 0
  const color = isPositive ? '#22c55e' : '#ef4444'

  return (
    <div className="flex flex-col justify-between h-full">
      {/* Header: Label + Live-Quote */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-white/35 flex items-center gap-2">
              <span className="text-base">{flag}</span>
              {label}
            </p>
            <div className="flex items-baseline gap-3 mt-1.5">
              <p className="text-[28px] font-bold text-white tabular-nums">{fmtPrice(quote.price)}</p>
              <span
                className={`text-[14px] font-semibold tabular-nums ${
                  quote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {quote.changePercent >= 0 ? '+' : ''}
                {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
              </span>
              <span className="text-[10px] text-white/35">Heute</span>
            </div>
          </div>

          {/* Time-Range-Switcher */}
          <div className="flex gap-0.5 bg-white/[0.03] rounded-lg p-0.5">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setRange(tf)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                  range === tf
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[180px] mt-4 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-white/30">{error}</p>
          </div>
        )}

        {!loading && !error && pointsWithLive.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pointsWithLive} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id={`idxGrad-${indexSymbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={d => {
                  const date = new Date(d)
                  if (range === '1W') return date.toLocaleDateString('de-DE', { weekday: 'short' })
                  if (['1M', '3M'].includes(range)) {
                    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
                  }
                  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
                }}
                interval={Math.max(0, Math.floor(pointsWithLive.length / 6))}
              />
              <YAxis hide domain={['dataMin * 0.995', 'dataMax * 1.005']} />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0].payload as { date: string; close: number }
                  const since = firstPrice > 0 ? ((p.close - firstPrice) / firstPrice) * 100 : 0
                  return (
                    <div style={TT}>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                        {new Date(p.date).toLocaleDateString('de-DE', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
                        {fmtPrice(p.close)}
                      </p>
                      <p style={{ color: since >= 0 ? '#4ade80' : '#f87171', fontSize: '11px' }}>
                        {since >= 0 ? '+' : ''}
                        {since.toFixed(2)}% seit {range}
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#idxGrad-${indexSymbol})`}
                dot={false}
                activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats-Row: Tageshoch / Tagestief / Vortag + Range-Performance */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.04]">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-white/35 uppercase tracking-wider">Tageshoch</p>
          <p className="text-[13px] text-white/60 tabular-nums">
            {quote.dayHigh ? fmtPrice(quote.dayHigh) : '—'}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-white/35 uppercase tracking-wider">Tagestief</p>
          <p className="text-[13px] text-white/60 tabular-nums">
            {quote.dayLow ? fmtPrice(quote.dayLow) : '—'}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-white/35 uppercase tracking-wider">Vortag</p>
          <p className="text-[13px] text-white/60 tabular-nums">
            {quote.previousClose ? fmtPrice(quote.previousClose) : '—'}
          </p>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="text-[9px] text-white/35 uppercase tracking-wider">{range}</p>
          <p
            className={`text-[13px] font-semibold tabular-nums ${
              isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {rangeChange.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  )
}
