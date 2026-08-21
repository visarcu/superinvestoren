// src/components/WorkingStockChart.tsx - FEY/QUARTR CLEAN STYLE
'use client'
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ReferenceDot,
  ReferenceLine,
  ReferenceArea
} from 'recharts'
import { ArrowsPointingOutIcon, XMarkIcon, ArrowTopRightOnSquareIcon, ShareIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/useTheme'
import { useCurrency } from '@/lib/CurrencyContext'
import { detectTickerCurrency } from '@/lib/fmp'
import InvestorAvatar from '@/components/InvestorAvatar'
import type { CongressEvent, InsiderEvent, SmartMoneyEvent } from '@/lib/smartMoney.types'

interface StockData {
  date: string
  close: number
}

export interface PurchaseMarker {
  date: string      // YYYY-MM-DD
  priceEUR: number  // Kaufpreis in EUR
  quantity: number
  label: string     // "K1", "K2", "V1", "V2", "D1", "SO", ...
  type?: 'buy' | 'sell' | 'dividend' | 'spinoff'  // Default: 'buy'
}

interface Props {
  ticker: string
  data: StockData[]
  purchaseMarkers?: PurchaseMarker[]
  /** Superinvestor-Käufe/-Verkäufe als Quartals-Bänder (13F ist quartalsgenau) */
  smartMoneyEvents?: SmartMoneyEvent[]
  /** Insider-Trades (Form 4) als tagesgenaue Marker auf der Kurslinie */
  insiderEvents?: InsiderEvent[]
  /** Kongress-Trades (PTR) als tagesgenaue Diamant-Marker auf der Kurslinie */
  congressEvents?: CongressEvent[]
  week52High?: number | null
  week52Low?: number | null
  /** Override Währungssymbol — z.B. wenn data bereits in EUR umgerechnet wurde */
  displayCurrency?: 'EUR' | 'USD' | 'GBP' | 'CHF'
  /** Explizite Chart-Höhe für Layouts, in denen ResponsiveContainer sonst keine feste Höhe bekommt. */
  chartHeightClass?: string
}

const TIME_RANGES = [
  { label: '1D', days: 1 },
  { label: '5D', days: 5 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: 'YTD', days: 'ytd' as const },
  { label: '1Y', days: 365 },
  { label: '10Y', days: 3650 },
  { label: '5Y', days: 1825 },
  { label: 'MAX', days: 'max' as const },
]

const CHART_MODES = [
  { id: 'price', label: 'Preis' },
  { id: 'total_return', label: 'Performance' },
]

// ─── Smart-Money-Layer (Superinvestor-Quartals-Bänder) ─────────────────────

// Quartals-Bänder brauchen genug sichtbare Zeit — unterhalb 6M nur Rauschen
const SMART_MONEY_RANGES = new Set(['6M', 'YTD', '1Y', '5Y', '10Y', 'MAX'])

interface SmartMoneyCluster {
  quarter: string
  x1: string
  x2: string
  buys: number
  sells: number
  events: SmartMoneyEvent[]
}

// Mehrheits-Färbung: bei breit gehaltenen Aktien ist ein Quartal nie einstimmig —
// klare Mehrheit (1,5×) färbt, sonst neutral
function smartMoneyColor(cluster: SmartMoneyCluster): string {
  if (cluster.buys >= cluster.sells * 1.5 && cluster.buys > cluster.sells) return '#10b981'
  if (cluster.sells >= cluster.buys * 1.5 && cluster.sells > cluster.buys) return '#ef4444'
  return '#f59e0b'
}

function formatQuarterDE(quarter: string): string {
  const m = quarter.match(/^(\d{4})-Q([1-4])$/)
  return m ? `Q${m[2]} ${m[1]}` : quarter
}

function formatUsdCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mrd. $`
  if (abs >= 1e6) return `${(value / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 0 })} Mio. $`
  return `${(value / 1e3).toLocaleString('de-DE', { maximumFractionDigits: 0 })}K $`
}

function smartMoneyActionLabel(ev: SmartMoneyEvent): { text: string; color: string } {
  switch (ev.action) {
    case 'new':
      return { text: 'Neu gekauft', color: 'text-emerald-400' }
    case 'add':
      return {
        text: `Aufgestockt ${ev.changePct != null ? `+${ev.changePct.toLocaleString('de-DE', { maximumFractionDigits: 0 })}%` : ''}`,
        color: 'text-emerald-400',
      }
    case 'trim':
      return {
        text: `Reduziert ${ev.changePct != null ? `${ev.changePct.toLocaleString('de-DE', { maximumFractionDigits: 0 })}%` : ''}`,
        color: 'text-red-400',
      }
    case 'exit':
      return { text: 'Komplett verkauft', color: 'text-red-400' }
  }
}

// ─── Insider-Marker ──────────────────────────────────────────────────────────

// Insider-Trades desselben (Chart-)Tages zu einem klickbaren Punkt gruppiert
interface InsiderDayGroup {
  date: string
  y: number
  buys: number
  sells: number
  cluster: boolean
  totalValue: number
  events: InsiderEvent[]
}

// Maximal so viele Insider-Punkte gleichzeitig — sonst wird die Linie zugekleistert.
// Cluster-Buys haben immer Vorrang, danach entscheidet das Volumen.
const MAX_INSIDER_DOTS = 40

// Klickbarer Insider-Punkt (custom shape der ReferenceDot)
function InsiderDotShape(props: any) {
  const { cx, cy, group, onSelect } = props as {
    cx?: number
    cy?: number
    group: InsiderDayGroup
    onSelect: (group: InsiderDayGroup, x: number, y: number) => void
  }
  if (typeof cx !== 'number' || typeof cy !== 'number') return null

  const isBuyDominant = group.buys >= group.sells
  const fill = isBuyDominant ? '#10b981' : '#ef4444'
  const r = group.cluster ? 6 : 4

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(group, cx, cy)
      }}
    >
      {/* Cluster-Buy: auffälliger Außenring */}
      {group.cluster && (
        <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={fill} strokeWidth={1.5} opacity={0.5} />
      )}
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={group.cluster ? '#ffffff' : (isBuyDominant ? '#064e3b' : '#5f1a1a')} strokeWidth={1.5} />
      {/* Unsichtbare größere Klickfläche */}
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
    </g>
  )
}

// ─── Kongress-Marker ─────────────────────────────────────────────────────────

// Kongress-Trades desselben (Chart-)Tages zu einem klickbaren Diamanten gruppiert.
// PTRs nennen keine Preise → Y-Position ist der Kurs am Handelstag.
interface CongressDayGroup {
  date: string
  y: number
  buys: number
  sells: number
  totalMid: number
  events: CongressEvent[]
}

const MAX_CONGRESS_DOTS = 30

// Klickbarer Kongress-Diamant (custom shape der ReferenceDot)
function CongressDotShape(props: any) {
  const { cx, cy, group, onSelect } = props as {
    cx?: number
    cy?: number
    group: CongressDayGroup
    onSelect: (group: CongressDayGroup, x: number, y: number) => void
  }
  if (typeof cx !== 'number' || typeof cy !== 'number') return null

  const isBuyDominant = group.buys >= group.sells
  const fill = isBuyDominant ? '#10b981' : '#ef4444'
  const s = 4.5 // halbe Diagonale

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(group, cx, cy)
      }}
    >
      <rect
        x={cx - s}
        y={cy - s}
        width={s * 2}
        height={s * 2}
        transform={`rotate(45 ${cx} ${cy})`}
        fill={fill}
        stroke={isBuyDominant ? '#064e3b' : '#5f1a1a'}
        strokeWidth={1.5}
      />
      {/* Unsichtbare größere Klickfläche */}
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
    </g>
  )
}

// Klickbares Zähler-Badge am oberen Rand eines Quartals-Bands.
// Wird von Recharts als ReferenceArea-Label geklont und bekommt viewBox (px).
function SmartMoneyBandLabel(props: any) {
  const { viewBox, cluster, onSelect } = props as {
    viewBox?: { x: number; y: number; width: number; height: number }
    cluster: SmartMoneyCluster
    onSelect: (cluster: SmartMoneyCluster, x: number, y: number) => void
  }
  if (!viewBox) return null

  const cx = viewBox.x + viewBox.width / 2
  // Etwas unterhalb der Oberkante: y+14 würde mit dem Performance-Label
  // oben rechts kollidieren (jüngstes Quartal liegt am rechten Rand)
  const cy = viewBox.y + 34
  const color = smartMoneyColor(cluster)
  // Badge an die Bandbreite anpassen — bei 5Y/MAX stehen viele schmale
  // Quartale nebeneinander, volle "▲8 ▼5"-Badges würden kollidieren
  const fullText = cluster.sells === 0
    ? `▲${cluster.buys}`
    : cluster.buys === 0
      ? `▼${cluster.sells}`
      : `▲${cluster.buys} ▼${cluster.sells}`
  const compactText = `${cluster.events.length}`
  const text = viewBox.width >= 16 + fullText.length * 6.5 ? fullText : compactText
  const w = Math.min(16 + text.length * 6.5, Math.max(viewBox.width - 4, 18))

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(cluster, cx, cy)
      }}
    >
      <rect x={cx - w / 2} y={cy - 11} rx={11} width={w} height={22} fill={color} opacity={0.92} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff">
        {text}
      </text>
    </g>
  )
}

export default function WorkingStockChart({ ticker, data, purchaseMarkers, smartMoneyEvents, insiderEvents, congressEvents, week52High, week52Low, displayCurrency, chartHeightClass }: Props) {
  const [selectedRange, setSelectedRange] = useState('1Y')
  const [selectedMode, setSelectedMode] = useState('price')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMA, setShowMA] = useState(false)
  const [show52W, setShow52W] = useState(false)
  const [showSmartMoney, setShowSmartMoney] = useState(true)
  const [showInsiders, setShowInsiders] = useState(true)
  const [showCongress, setShowCongress] = useState(true)
  const [activeCluster, setActiveCluster] = useState<{ cluster: SmartMoneyCluster; x: number; y: number } | null>(null)
  const [activeInsiderDay, setActiveInsiderDay] = useState<{ group: InsiderDayGroup; x: number; y: number } | null>(null)
  const [activeCongressDay, setActiveCongressDay] = useState<{ group: CongressDayGroup; x: number; y: number } | null>(null)
  const [intradayData, setIntradayData] = useState<StockData[] | null>(null)
  const [intradayLoading, setIntradayLoading] = useState(false)
  const [chartSizeKey, setChartSizeKey] = useState('initial')
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartAreaRef = useRef<HTMLDivElement>(null)

  const { theme } = useTheme()
  const { formatPercentage } = useCurrency()

  const isDark = theme === 'dark'

  // Intraday-Daten laden wenn 1D ausgewählt
  useEffect(() => {
    if (selectedRange !== '1D') {
      setIntradayData(null)
      return
    }

    let cancelled = false
    setIntradayLoading(true)

    fetch(`/api/intraday/${ticker}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        setIntradayData(data?.intraday || [])
      })
      .catch(() => {
        if (!cancelled) setIntradayData([])
      })
      .finally(() => {
        if (!cancelled) setIntradayLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedRange, ticker])

  // Währung basierend auf Ticker erkennen (z.B. G24.DE → EUR, AAPL → USD).
  // displayCurrency-Prop überschreibt das, falls data bereits umgerechnet wurde.
  const tickerCurrency = useMemo(
    () => displayCurrency ?? detectTickerCurrency(ticker),
    [ticker, displayCurrency]
  )
  const currencySymbol = tickerCurrency === 'EUR' ? '€' : tickerCurrency === 'GBP' ? '£' : tickerCurrency === 'CHF' ? 'CHF' : '$'

  const formatStockPrice = useCallback((price: number, showCurrency: boolean = true): string => {
    if (!price && price !== 0) return '–'
    const formatted = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
    return showCurrency ? `${formatted} ${currencySymbol}` : formatted
  }, [currencySymbol])

  // Filter data by time range
  const getFilteredData = (stockData: StockData[]) => {
    if (!stockData.length) return []

    const now = new Date()
    let cutoffDate: Date

    if (selectedRange === 'YTD') {
      cutoffDate = new Date(now.getFullYear(), 0, 1)
    } else if (selectedRange === 'MAX') {
      return stockData.sort((a, b) => a.date.localeCompare(b.date))
    } else {
      const timeRange = TIME_RANGES.find(r => r.label === selectedRange)
      if (!timeRange || typeof timeRange.days !== 'number') {
        return stockData.sort((a, b) => a.date.localeCompare(b.date))
      }

      const days = timeRange.days
      // 1D wird über intradayData behandelt, nicht über daily data
      if (days === 1) return []

      cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    }

    const filtered = stockData
      .filter(d => new Date(d.date) >= cutoffDate)
      .sort((a, b) => a.date.localeCompare(b.date))

    if (filtered.length === 0 && stockData.length > 0) {
      const sortedData = stockData.sort((a, b) => b.date.localeCompare(a.date))
      return sortedData.slice(0, Math.min(10, sortedData.length)).reverse()
    }

    return filtered
  }

  // Calculate chart data
  const calculateChartData = (stockData: StockData[], mode: string) => {
    const filteredData = getFilteredData(stockData)
    if (!filteredData.length) return []

    const basePrice = filteredData[0].close

    return filteredData.map(d => {
      if (mode === 'total_return') {
        return { date: d.date, value: ((d.close - basePrice) / basePrice) * 100 }
      }
      return { date: d.date, value: d.close }
    })
  }

  // Moving Average
  const calculateMA = (stockData: StockData[], period: number) => {
    return stockData.map((item, index) => {
      if (index < period - 1) return null
      const slice = stockData.slice(index - period + 1, index + 1)
      return slice.reduce((sum, d) => sum + d.close, 0) / period
    })
  }

  // Chart data
  const chartData = useMemo(() => {
    // 1D: Intraday-Daten verwenden
    if (selectedRange === '1D') {
      if (!intradayData?.length) return []
      const basePrice = intradayData[0].close
      return intradayData.map(d => {
        const time = d.date.includes(' ') ? d.date.split(' ')[1].slice(0, 5) : d.date
        const value = selectedMode === 'total_return'
          ? ((d.close - basePrice) / basePrice) * 100
          : d.close
        return {
          date: d.date,
          [ticker]: value,
          ma50: null,
          formattedDate: time,
        }
      })
    }

    const mainData = calculateChartData(data, selectedMode)
    if (!mainData.length) return []

    const filteredData = getFilteredData(data)
    const ma50 = showMA ? calculateMA(filteredData, 50) : []

    let result = mainData.map((d, i) => ({
      date: d.date,
      [ticker]: d.value,
      ma50: ma50[i] || null,
      formattedDate: new Date(d.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
    }))

    return result
  }, [data, selectedRange, selectedMode, ticker, showMA, intradayData])

  // Current price & stats
  const currentPrice = useMemo(() => {
    if (!data.length) return 0
    const sortedData = [...data].sort((a, b) => b.date.localeCompare(a.date))
    return sortedData[0].close
  }, [data])

  const performanceStats = useMemo(() => {
    if (!chartData.length) return null
    const firstValue = chartData[0][ticker] as number
    const lastValue = chartData[chartData.length - 1][ticker] as number

    if (typeof firstValue !== 'number' || typeof lastValue !== 'number' || firstValue <= 0) return null

    if (selectedMode === 'total_return') {
      return { changePercent: lastValue }
    }

    return { changePercent: ((lastValue - firstValue) / firstValue) * 100 }
  }, [chartData, ticker, selectedMode])

  // Fullscreen
  const toggleFullscreen = async () => {
    if (!chartContainerRef.current) return
    try {
      if (!isFullscreen) {
        await chartContainerRef.current.requestFullscreen?.()
      } else {
        await document.exitFullscreen?.()
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const node = chartAreaRef.current
    if (!node) return

    let rafId: number | null = null
    const updateSizeKey = () => {
      const rect = node.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      setChartSizeKey(`${Math.round(rect.width)}x${Math.round(rect.height)}`)
    }

    const scheduleUpdate = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateSizeKey)
    }

    scheduleUpdate()
    const observer = new ResizeObserver(scheduleUpdate)
    observer.observe(node)
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      observer.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [chartData.length, isFullscreen])

  // Format functions
  const formatValue = (value: number) => {
    return selectedMode === 'total_return' ? formatPercentage(value) : formatStockPrice(value)
  }


  // Custom Tooltip - Clean Style
  const renderTooltip = (props: any) => {
    const { active, payload } = props
    if (!active || !payload?.length) return null

    const data = payload[0].payload

    return (
      <div className="bg-theme-card border border-theme-light rounded-lg p-3 shadow-lg">
        <p className="text-xs text-theme-muted mb-2">{data.formattedDate}</p>
        {payload.map((entry: any, index: number) => {
          if (entry.dataKey === 'ma50') return null
          return (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-theme-primary font-medium">
                {entry.dataKey}: {formatValue(entry.value)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // Resolve purchase markers to chart data points
  const resolvedMarkers = useMemo(() => {
    if (!purchaseMarkers?.length || !chartData.length || selectedMode !== 'price') return []

    return purchaseMarkers.map(marker => {
      // Exakten Match oder nächsten Datenpunkt finden (für X-Achse)
      let bestMatch = chartData[0]
      let bestDiff = Infinity

      for (const point of chartData) {
        const diff = Math.abs(new Date(point.date).getTime() - new Date(marker.date).getTime())
        if (diff < bestDiff) {
          bestDiff = diff
          bestMatch = point
        }
      }

      const chartValue = bestMatch[ticker] as number
      if (typeof chartValue !== 'number') return null

      // Kaufpreis verwenden wenn verfügbar (zeigt echten EK statt Schlusskurs),
      // Fallback auf Chart-Schlusskurs wenn priceEUR fehlt oder 0
      const yValue = marker.priceEUR > 0 ? marker.priceEUR : chartValue

      return {
        date: bestMatch.date,
        value: yValue,
        label: marker.label,
        type: marker.type || 'buy',
      }
    }).filter(Boolean) as { date: string; value: number; label: string; type: 'buy' | 'sell' | 'dividend' | 'spinoff' }[]
  }, [purchaseMarkers, chartData, selectedMode, ticker])

  // Y-Achsen-Bereich: Kauf-/Verkaufsmarker mit einbeziehen. Die Kurslinie ist
  // (je nach Range) tagesgesampelt — kaufte man exakt an einem Intraday-Hoch/
  // -Tief, kann der echte Marker-Preis über/unter allen sichtbaren Punkten
  // liegen und würde sonst aus dem Chart fallen. Nur an der erweiterten Seite
  // etwas Luft lassen, damit Punkt + Label nicht am Rand kleben; liegen alle
  // Marker im Kursbereich, bleibt die Skalierung wie zuvor (dataMin/dataMax).
  const yDomain = useMemo((): [number, number] | ['dataMin', 'dataMax'] => {
    if (selectedMode !== 'price' || chartData.length === 0) return ['dataMin', 'dataMax']
    let lo = Infinity
    let hi = -Infinity
    for (const d of chartData) {
      const v = d[ticker]
      if (typeof v === 'number') { lo = Math.min(lo, v); hi = Math.max(hi, v) }
      const ma = d.ma50
      if (typeof ma === 'number') { lo = Math.min(lo, ma); hi = Math.max(hi, ma) }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return ['dataMin', 'dataMax']

    const dataLo = lo
    const dataHi = hi
    for (const m of resolvedMarkers) {
      // Dividendenmarker tragen den Ausschüttungsbetrag (kein Kurs) — würden die
      // Skala verzerren; nur echte Kurspreise (Kauf/Verkauf/Spin-off) einbeziehen.
      if (m.type === 'dividend') continue
      if (typeof m.value === 'number' && m.value > 0) { lo = Math.min(lo, m.value); hi = Math.max(hi, m.value) }
    }
    if (lo >= dataLo && hi <= dataHi) return ['dataMin', 'dataMax']

    const range = hi - lo || Math.abs(hi) || 1
    return [
      lo < dataLo ? lo - range * 0.04 : lo,
      hi > dataHi ? hi + range * 0.04 : hi,
    ]
  }, [selectedMode, chartData, ticker, resolvedMarkers])

  // Smart-Money-Events zu Quartals-Clustern gruppieren und auf sichtbare
  // Chart-Datenpunkte mappen (Kategorie-X-Achse braucht exakte date-Werte)
  const smartMoneyClusters = useMemo((): SmartMoneyCluster[] => {
    if (!showSmartMoney || !smartMoneyEvents?.length || !chartData.length) return []
    if (!SMART_MONEY_RANGES.has(selectedRange)) return []

    const byQuarter = new Map<string, SmartMoneyEvent[]>()
    for (const ev of smartMoneyEvents) {
      const list = byQuarter.get(ev.reportQuarter)
      if (list) list.push(ev)
      else byQuarter.set(ev.reportQuarter, [ev])
    }

    const clusters: SmartMoneyCluster[] = []
    byQuarter.forEach((evs, quarter) => {
      const { quarterStart, quarterEnd } = evs[0]
      let x1: string | null = null
      let x2: string | null = null
      for (const point of chartData) {
        const d = String(point.date).slice(0, 10)
        if (d >= quarterStart && d <= quarterEnd) {
          if (!x1) x1 = point.date as string
          x2 = point.date as string
        }
      }
      // Quartal (fast) außerhalb des sichtbaren Bereichs → kein Band
      if (!x1 || !x2 || x1 === x2) return

      const buys = evs.filter(e => e.action === 'new' || e.action === 'add').length
      clusters.push({
        quarter,
        x1,
        x2,
        buys,
        sells: evs.length - buys,
        events: [...evs].sort((a, b) => b.valueUsd - a.valueUsd),
      })
    })

    return clusters.sort((a, b) => a.quarter.localeCompare(b.quarter))
  }, [showSmartMoney, smartMoneyEvents, chartData, selectedRange])

  // Insider-Events auf sichtbare Chart-Tage mappen und pro Tag gruppieren.
  // Y-Position = Transaktionspreis (zeigt, WO der Insider gekauft hat) —
  // deshalb nur im Preis-Modus; 1D (Intraday) hat keine Tages-X-Achse.
  const insiderDayGroups = useMemo((): InsiderDayGroup[] => {
    if (!showInsiders || !insiderEvents?.length || !chartData.length) return []
    if (selectedMode !== 'price' || selectedRange === '1D') return []

    const firstDate = String(chartData[0].date).slice(0, 10)
    const lastDate = String(chartData[chartData.length - 1].date).slice(0, 10)

    const byDate = new Map<string, InsiderDayGroup>()
    for (const ev of insiderEvents) {
      if (ev.date < firstDate || ev.date > lastDate) continue

      // Nächstgelegenen Chart-Datenpunkt finden (Wochenend-Trades → Handelstag)
      let bestDate: string | null = null
      let bestDiff = Infinity
      const evTime = new Date(ev.date).getTime()
      for (const point of chartData) {
        const diff = Math.abs(new Date(point.date).getTime() - evTime)
        if (diff < bestDiff) {
          bestDiff = diff
          bestDate = point.date as string
        }
      }
      if (!bestDate) continue

      const existing = byDate.get(bestDate)
      if (existing) {
        existing.events.push(ev)
        existing.totalValue += ev.valueUsd
        existing.buys += ev.action === 'buy' ? 1 : 0
        existing.sells += ev.action === 'sell' ? 1 : 0
        existing.cluster = existing.cluster || ev.clusterBuy
        // Y-Position vom größten Trade des Tages
        if (ev.price && ev.valueUsd >= Math.max(...existing.events.map(e => e.valueUsd))) {
          existing.y = ev.price
        }
      } else {
        byDate.set(bestDate, {
          date: bestDate,
          y: ev.price ?? 0,
          buys: ev.action === 'buy' ? 1 : 0,
          sells: ev.action === 'sell' ? 1 : 0,
          cluster: ev.clusterBuy,
          totalValue: ev.valueUsd,
          events: [ev],
        })
      }
    }

    let groups = Array.from(byDate.values()).filter(g => g.y > 0)
    for (const g of groups) g.events.sort((a, b) => b.valueUsd - a.valueUsd)

    // Deckeln: Cluster-Buys immer, Rest nach Volumen
    if (groups.length > MAX_INSIDER_DOTS) {
      groups.sort((a, b) =>
        Number(b.cluster) - Number(a.cluster) || b.totalValue - a.totalValue
      )
      groups = groups.slice(0, MAX_INSIDER_DOTS)
    }

    return groups.sort((a, b) => a.date.localeCompare(b.date))
  }, [showInsiders, insiderEvents, chartData, selectedMode, selectedRange])

  // Kongress-Trades auf sichtbare Chart-Tage mappen. PTRs haben keinen Preis —
  // der Diamant sitzt auf der Kurslinie des Handelstags.
  const congressDayGroups = useMemo((): CongressDayGroup[] => {
    if (!showCongress || !congressEvents?.length || !chartData.length) return []
    if (selectedMode !== 'price' || selectedRange === '1D') return []

    const firstDate = String(chartData[0].date).slice(0, 10)
    const lastDate = String(chartData[chartData.length - 1].date).slice(0, 10)

    const byDate = new Map<string, CongressDayGroup>()
    for (const ev of congressEvents) {
      if (ev.date < firstDate || ev.date > lastDate) continue

      let bestPoint: any = null
      let bestDiff = Infinity
      const evTime = new Date(ev.date).getTime()
      for (const point of chartData) {
        const diff = Math.abs(new Date(point.date).getTime() - evTime)
        if (diff < bestDiff) {
          bestDiff = diff
          bestPoint = point
        }
      }
      const lineValue = bestPoint ? bestPoint[ticker] : null
      if (!bestPoint || typeof lineValue !== 'number') continue

      const key = bestPoint.date as string
      const existing = byDate.get(key)
      if (existing) {
        existing.events.push(ev)
        existing.totalMid += ev.amountMidUsd
        existing.buys += ev.action === 'buy' ? 1 : 0
        existing.sells += ev.action === 'sell' ? 1 : 0
      } else {
        byDate.set(key, {
          date: key,
          y: lineValue,
          buys: ev.action === 'buy' ? 1 : 0,
          sells: ev.action === 'sell' ? 1 : 0,
          totalMid: ev.amountMidUsd,
          events: [ev],
        })
      }
    }

    let groups = Array.from(byDate.values())
    for (const g of groups) g.events.sort((a, b) => b.amountMidUsd - a.amountMidUsd)

    if (groups.length > MAX_CONGRESS_DOTS) {
      groups.sort((a, b) => b.totalMid - a.totalMid)
      groups = groups.slice(0, MAX_CONGRESS_DOTS)
    }

    return groups.sort((a, b) => a.date.localeCompare(b.date))
  }, [showCongress, congressEvents, chartData, selectedMode, selectedRange, ticker])

  // Popover schließen, wenn sich der Chart-Kontext ändert
  useEffect(() => {
    setActiveCluster(null)
    setActiveInsiderDay(null)
    setActiveCongressDay(null)
  }, [selectedRange, selectedMode, ticker, showSmartMoney, showInsiders, showCongress])

  const handleClusterSelect = useCallback((cluster: SmartMoneyCluster, x: number, y: number) => {
    setActiveInsiderDay(null)
    setActiveCongressDay(null)
    setActiveCluster(prev =>
      prev?.cluster.quarter === cluster.quarter ? null : { cluster, x, y }
    )
  }, [])

  const handleInsiderSelect = useCallback((group: InsiderDayGroup, x: number, y: number) => {
    setActiveCluster(null)
    setActiveCongressDay(null)
    setActiveInsiderDay(prev =>
      prev?.group.date === group.date ? null : { group, x, y }
    )
  }, [])

  const handleCongressSelect = useCallback((group: CongressDayGroup, x: number, y: number) => {
    setActiveCluster(null)
    setActiveInsiderDay(null)
    setActiveCongressDay(prev =>
      prev?.group.date === group.date ? null : { group, x, y }
    )
  }, [])

  const isPositive = performanceStats && performanceStats.changePercent >= 0
  const chartColor = isPositive ? '#10b981' : '#ef4444'

  return (
    <div
      ref={chartContainerRef}
      className={`bg-theme-card rounded-xl border border-theme-light h-full flex flex-col ${isFullscreen ? 'p-6' : ''}`}
    >
      {/* Header */}
      <div className="p-5 border-b border-theme-light">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-theme-muted mb-1">{ticker} • Historischer Kursverlauf</p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-theme-primary">
                {formatStockPrice(currentPrice)}
              </span>
              {performanceStats && (
                <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '↗' : '↘'}{formatPercentage(performanceStats.changePercent, false)}
                </span>
              )}
              <span className="text-xs text-theme-muted">({selectedRange})</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Smart-Money-Chart als Bild teilen */}
            {smartMoneyEvents && smartMoneyEvents.length > 0 && (
              <a
                href={`/api/og/smart-money/${ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-theme-secondary/30 text-theme-muted transition-colors"
                title="Smart-Money-Chart als Bild teilen"
              >
                <ShareIcon className="w-5 h-5" />
              </a>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-theme-secondary/30 text-theme-muted transition-colors"
              title={isFullscreen ? 'Schließen' : 'Vollbild'}
            >
              {isFullscreen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <ArrowsPointingOutIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 space-y-4">
        {/* Mode & Time Range */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-theme-muted">Modus:</span>
            <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg">
              {CHART_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    selectedMode === mode.id
                      ? 'bg-theme-card text-theme-primary shadow-sm'
                      : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range - Pill Style */}
          <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg overflow-x-auto">
            {TIME_RANGES.map(range => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(range.label)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  selectedRange === range.label
                    ? 'bg-theme-card text-theme-primary shadow-sm'
                    : 'text-theme-muted hover:text-theme-secondary'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* MA Toggle */}
          {selectedMode === 'price' && (
            <button
              onClick={() => setShowMA(!showMA)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                showMA
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-theme-secondary/30 text-theme-muted hover:text-theme-secondary'
              }`}
            >
              MA
            </button>
          )}

          {/* 52W Toggle */}
          {selectedMode === 'price' && (week52High || week52Low) && (
            <button
              onClick={() => setShow52W(!show52W)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                show52W
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-theme-secondary/30 text-theme-muted hover:text-theme-secondary'
              }`}
            >
              52W
            </button>
          )}

          {/* Smart-Money Toggle (Superinvestor-Quartale) */}
          {smartMoneyEvents && smartMoneyEvents.length > 0 && (
            <button
              onClick={() => setShowSmartMoney(!showSmartMoney)}
              title={SMART_MONEY_RANGES.has(selectedRange)
                ? 'Superinvestor-Käufe & -Verkäufe (13F, quartalsgenau)'
                : 'Ab Zeitraum 6M sichtbar'}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                showSmartMoney
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-theme-secondary/30 text-theme-muted hover:text-theme-secondary'
              }`}
            >
              Gurus
            </button>
          )}

          {/* Insider Toggle (Form 4, tagesgenau) */}
          {insiderEvents && insiderEvents.length > 0 && (
            <button
              onClick={() => setShowInsiders(!showInsiders)}
              title="Insider-Käufe & -Verkäufe (Form 4, tagesgenau)"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                showInsiders
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'bg-theme-secondary/30 text-theme-muted hover:text-theme-secondary'
              }`}
            >
              Insider
            </button>
          )}

          {/* Kongress Toggle (PTR, tagesgenau) */}
          {congressEvents && congressEvents.length > 0 && (
            <button
              onClick={() => setShowCongress(!showCongress)}
              title="Käufe & Verkäufe von US-Kongressmitgliedern (PTR, tagesgenau)"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                showCongress
                  ? 'bg-fuchsia-500/20 text-fuchsia-400'
                  : 'bg-theme-secondary/30 text-theme-muted hover:text-theme-secondary'
              }`}
            >
              Kongress
            </button>
          )}
        </div>

      </div>

      {/* Chart - Clean minimal style like Fey */}
      <div
        ref={chartAreaRef}
        className={`relative px-2 pb-2 ${isFullscreen ? 'h-[calc(100vh-250px)]' : chartHeightClass || 'flex-1 min-h-[350px]'}`}
      >
        {intradayLoading && selectedRange === '1D' ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-theme-muted text-sm">Intraday-Daten laden...</div>
          </div>
        ) : (
        <ResponsiveContainer key={`${ticker}-${selectedRange}-${selectedMode}-${chartSizeKey}`} width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Minimal X-Axis like Fey - just a few date labels, no lines */}
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#6b7280' : '#9ca3af', fontSize: 11 }}
              tickFormatter={(value) => {
                if (selectedRange === '1D') {
                  // Intraday: Uhrzeit anzeigen (z.B. "14:30")
                  if (value.includes(' ')) return value.split(' ')[1].slice(0, 5)
                  return value
                }
                const date = new Date(value)
                if (['1Y', '3Y', '5Y', 'MAX'].includes(selectedRange)) {
                  // Jahres-/Mehrjahres-Ranges: "Jan. 25" — immer mit Jahr
                  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
                }
                // Kurzfristige Ranges (1M, 3M, 6M, YTD): Tag + Monat reicht
                return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
              }}
              interval="preserveStartEnd"
              minTickGap={80}
            />
            <YAxis hide domain={yDomain} />
            <Tooltip content={renderTooltip} cursor={{ stroke: isDark ? '#4b5563' : '#d1d5db', strokeWidth: 1 }} />

            {/* Smart-Money-Quartalsbänder (Hintergrund, vor der Kurslinie).
                Neutrale Quartale (kein klares Mehrheitssignal) deutlich dezenter,
                sonst entsteht bei 5Y/MAX ein Band-Teppich ohne Aussage */}
            {smartMoneyClusters.map(cluster => {
              const color = smartMoneyColor(cluster)
              const isNeutral = color === '#f59e0b'
              return (
                <ReferenceArea
                  key={`smb-${cluster.quarter}`}
                  x1={cluster.x1}
                  x2={cluster.x2}
                  fill={color}
                  fillOpacity={isNeutral ? 0.03 : (isDark ? 0.08 : 0.07)}
                  stroke="none"
                  ifOverflow="hidden"
                />
              )
            })}

            {/* Performance Label */}
            {performanceStats && (
              <text
                x="97%"
                y="25"
                textAnchor="end"
                fill={chartColor}
                fontSize="13"
                fontWeight="600"
              >
                {formatPercentage(performanceStats.changePercent)}
              </text>
            )}

            {/* Main Area/Line */}
            {selectedMode === 'price' ? (
              <Area
                type="monotone"
                dataKey={ticker}
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#chartGradient)"
                dot={false}
                activeDot={{ r: 4, fill: chartColor }}
              />
            ) : (
              <Line
                type="monotone"
                dataKey={ticker}
                stroke={chartColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: chartColor }}
              />
            )}

            {/* MA50 */}
            {showMA && selectedMode === 'price' && (
              <Line
                type="monotone"
                dataKey="ma50"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
            )}

            {/* 52W High/Low Lines */}
            {show52W && selectedMode === 'price' && week52High && (
              <ReferenceLine
                y={week52High}
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="6 3"
                ifOverflow="extendDomain"
                label={{
                  value: `52W H  ${formatStockPrice(week52High, false)}`,
                  position: 'insideTopLeft',
                  offset: 8,
                  style: { fontSize: 10, fontWeight: 600, fill: '#f97316' }
                }}
              />
            )}
            {show52W && selectedMode === 'price' && week52Low && (
              <ReferenceLine
                y={week52Low}
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="6 3"
                ifOverflow="extendDomain"
                label={{
                  value: `52W L  ${formatStockPrice(week52Low, false)}`,
                  position: 'insideBottomLeft',
                  offset: 8,
                  style: { fontSize: 10, fontWeight: 600, fill: '#f97316' }
                }}
              />
            )}

            {/* Kauf-, Verkaufs- und Dividendenmarker */}
            {resolvedMarkers.map((marker) => {
              const isDividend = marker.type === 'dividend'
              const isSell = marker.type === 'sell'
              const isSpinoff = marker.type === 'spinoff'
              const dotFill = isDividend ? '#10b981' : isSell ? '#ef4444' : isSpinoff ? '#a855f7' : '#3b82f6'
              const dotStroke = isDividend ? '#064e3b' : isSell ? '#5f1a1a' : isSpinoff ? '#4a1d6e' : '#1e3a5f'
              return (
                <ReferenceDot
                  key={marker.label}
                  x={marker.date}
                  y={marker.value}
                  r={isDividend ? 5 : 6}
                  fill={dotFill}
                  stroke={dotStroke}
                  strokeWidth={2}
                  isFront
                  label={{
                    value: marker.label,
                    position: isDividend ? 'bottom' : 'top',
                    offset: 12,
                    style: { fontSize: isDividend ? 9 : 10, fontWeight: 700, fill: dotFill }
                  }}
                />
              )
            })}

            {/* Smart-Money-Badges: eigene transparente ReferenceAreas NACH der
                Kurslinie, damit die Klickfläche zuoberst im SVG liegt */}
            {smartMoneyClusters.map(cluster => (
              <ReferenceArea
                key={`sml-${cluster.quarter}`}
                x1={cluster.x1}
                x2={cluster.x2}
                fill="transparent"
                stroke="none"
                ifOverflow="hidden"
                label={<SmartMoneyBandLabel cluster={cluster} onSelect={handleClusterSelect} />}
              />
            ))}

            {/* Insider-Punkte: tagesgenau, auf Höhe des Transaktionspreises */}
            {insiderDayGroups.map(group => (
              <ReferenceDot
                key={`ins-${group.date}`}
                x={group.date}
                y={group.y}
                ifOverflow="hidden"
                isFront
                shape={<InsiderDotShape group={group} onSelect={handleInsiderSelect} />}
              />
            ))}

            {/* Kongress-Diamanten: tagesgenau, auf der Kurslinie */}
            {congressDayGroups.map(group => (
              <ReferenceDot
                key={`cg-${group.date}`}
                x={group.date}
                y={group.y}
                ifOverflow="hidden"
                isFront
                shape={<CongressDotShape group={group} onSelect={handleCongressSelect} />}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        )}

        {/* Smart-Money-Popover */}
        {activeCluster && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setActiveCluster(null)} />
            <div
              className="absolute z-20 w-72 bg-theme-card border border-theme-light rounded-xl shadow-xl"
              style={{
                left: Math.min(
                  Math.max(activeCluster.x - 144, 8),
                  Math.max((chartAreaRef.current?.clientWidth ?? 600) - 296, 8)
                ),
                top: activeCluster.y + 16,
              }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-theme-light">
                <p className="text-xs font-semibold text-theme-primary">
                  Superinvestoren · {formatQuarterDE(activeCluster.cluster.quarter)}
                </p>
                <button
                  onClick={() => setActiveCluster(null)}
                  className="p-1 rounded hover:bg-theme-secondary/30 text-theme-muted"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {activeCluster.cluster.events.map((ev, i) => {
                  const action = smartMoneyActionLabel(ev)
                  return (
                    <div key={`${ev.actor.slug}-${i}`} className="flex items-center gap-2.5 px-4 py-2">
                      <InvestorAvatar
                        name={ev.actor.name}
                        imageUrl={ev.actor.imageUrl}
                        size="sm"
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-theme-primary truncate">{ev.actor.name}</p>
                        <p className={`text-[11px] ${action.color}`}>
                          {action.text}
                          <span className="text-theme-muted"> · {formatUsdCompact(ev.valueUsd)}</span>
                        </p>
                      </div>
                      {ev.sourceUrl && (
                        <a
                          href={ev.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="SEC-Filing öffnen"
                          className="p-1 rounded hover:bg-theme-secondary/30 text-theme-muted flex-shrink-0"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="px-4 py-2 border-t border-theme-light text-[10px] text-theme-muted">
                13F-Meldung, quartalsgenau — exaktes Kaufdatum unbekannt
                {activeCluster.cluster.events[0]?.filedDate &&
                  ` · öffentlich seit ${new Date(activeCluster.cluster.events[0].filedDate).toLocaleDateString('de-DE')}`}
              </p>
            </div>
          </>
        )}

        {/* Insider-Popover */}
        {activeInsiderDay && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setActiveInsiderDay(null)} />
            <div
              className="absolute z-20 w-72 bg-theme-card border border-theme-light rounded-xl shadow-xl"
              style={{
                left: Math.min(
                  Math.max(activeInsiderDay.x - 144, 8),
                  Math.max((chartAreaRef.current?.clientWidth ?? 600) - 296, 8)
                ),
                top: Math.min(activeInsiderDay.y + 16, (chartAreaRef.current?.clientHeight ?? 400) - 60),
              }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-theme-light">
                <p className="text-xs font-semibold text-theme-primary">
                  Insider · {new Date(activeInsiderDay.group.date).toLocaleDateString('de-DE')}
                  {activeInsiderDay.group.cluster && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      Cluster-Buy
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setActiveInsiderDay(null)}
                  className="p-1 rounded hover:bg-theme-secondary/30 text-theme-muted"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {activeInsiderDay.group.events.map((ev, i) => (
                  <div key={`${ev.actor.name}-${i}`} className="flex items-center gap-2.5 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-theme-primary truncate">
                        {ev.actor.name}
                        {ev.actor.role && <span className="text-theme-muted font-normal"> · {ev.actor.role}</span>}
                      </p>
                      <p className={`text-[11px] ${ev.action === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ev.action === 'buy' ? 'Kauf' : 'Verkauf'}
                        {' '}{ev.shares.toLocaleString('de-DE')} Stk.
                        {ev.price ? ` @ ${ev.price.toLocaleString('de-DE', { maximumFractionDigits: 2 })} $` : ''}
                        <span className="text-theme-muted"> · {formatUsdCompact(ev.valueUsd)}</span>
                      </p>
                    </div>
                    {ev.sourceUrl && (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="SEC Form 4 öffnen"
                        className="p-1 rounded hover:bg-theme-secondary/30 text-theme-muted flex-shrink-0"
                      >
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <p className="px-4 py-2 border-t border-theme-light text-[10px] text-theme-muted">
                Form 4, tagesgenau · Punkt liegt auf Höhe des Transaktionspreises
              </p>
            </div>
          </>
        )}

        {/* Kongress-Popover */}
        {activeCongressDay && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setActiveCongressDay(null)} />
            <div
              className="absolute z-20 w-72 bg-theme-card border border-theme-light rounded-xl shadow-xl"
              style={{
                left: Math.min(
                  Math.max(activeCongressDay.x - 144, 8),
                  Math.max((chartAreaRef.current?.clientWidth ?? 600) - 296, 8)
                ),
                top: Math.min(activeCongressDay.y + 16, (chartAreaRef.current?.clientHeight ?? 400) - 60),
              }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-theme-light">
                <p className="text-xs font-semibold text-theme-primary">
                  Kongress · {new Date(activeCongressDay.group.date).toLocaleDateString('de-DE')}
                </p>
                <button
                  onClick={() => setActiveCongressDay(null)}
                  className="p-1 rounded hover:bg-theme-secondary/30 text-theme-muted"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {activeCongressDay.group.events.map((ev, i) => (
                  <div key={`${ev.actor.slug}-${i}`} className="flex items-center gap-2.5 px-4 py-2">
                    <InvestorAvatar
                      name={ev.actor.name}
                      imageUrl={ev.actor.photoUrl}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-theme-primary truncate">
                        {ev.actor.name}
                        {(ev.actor.party || ev.actor.state) && (
                          <span className="text-theme-muted font-normal">
                            {' '}· {[ev.actor.party, ev.actor.state].filter(Boolean).join('-')}
                          </span>
                        )}
                      </p>
                      <p className={`text-[11px] ${ev.action === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ev.action === 'buy' ? 'Kauf' : 'Verkauf'} · {ev.amountRange}
                        {ev.owner && ev.owner.toLowerCase() !== 'self' && (
                          <span className="text-theme-muted"> · {ev.owner === 'Spouse' ? 'Ehepartner' : ev.owner}</span>
                        )}
                      </p>
                    </div>
                    {ev.sourceUrl && (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Original-Meldung (PTR) öffnen"
                        className="p-1 rounded hover:bg-theme-secondary/30 text-theme-muted flex-shrink-0"
                      >
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <p className="px-4 py-2 border-t border-theme-light text-[10px] text-theme-muted">
                PTR-Meldung · Beträge nur als Spanne
                {activeCongressDay.group.events[0]?.disclosedDate &&
                  ` · öffentlich seit ${new Date(activeCongressDay.group.events[0].disclosedDate).toLocaleDateString('de-DE')}`}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer / Legende */}
      {(resolvedMarkers.length > 0 || smartMoneyClusters.length > 0 || insiderDayGroups.length > 0 || congressDayGroups.length > 0 || (showMA && selectedMode === 'price') || (show52W && selectedMode === 'price')) && (
        <div className="px-5 pb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          {smartMoneyClusters.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-theme-muted">
              <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
              <span>Superinvestor-Aktivität (Quartal, klickbar)</span>
            </div>
          )}
          {insiderDayGroups.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-theme-muted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-900 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-900 inline-block" />
              </span>
              <span>Insider-Kauf / -Verkauf (Tag, klickbar)</span>
            </div>
          )}
          {insiderDayGroups.some(g => g.cluster) && (
            <div className="flex items-center gap-1.5 text-xs text-theme-muted">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40 border border-white inline-block" />
              <span>Cluster-Buy (≥3 Insider in 30 Tagen)</span>
            </div>
          )}
          {congressDayGroups.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-theme-muted">
              <span className="w-2.5 h-2.5 bg-emerald-500 border border-emerald-900 inline-block rotate-45" />
              <span>Kongress-Trade (Tag, klickbar)</span>
            </div>
          )}
          {showMA && selectedMode === 'price' && (
            <div className="flex items-center gap-2 text-xs text-theme-muted">
              <div className="w-4 h-0.5 bg-purple-400" style={{ backgroundImage: 'repeating-linear-gradient(to right, #a855f7, #a855f7 3px, transparent 3px, transparent 6px)' }} />
              <span>MA50</span>
            </div>
          )}
          {show52W && selectedMode === 'price' && week52High && (
            <div className="flex items-center gap-2 text-xs text-theme-muted">
              <div className="w-4 h-0.5" style={{ backgroundImage: 'repeating-linear-gradient(to right, #f97316, #f97316 4px, transparent 4px, transparent 7px)' }} />
              <span>52W Hoch / Tief</span>
            </div>
          )}
          {resolvedMarkers.some(m => m.type !== 'sell' && m.type !== 'dividend') && (
            <div className="flex items-center gap-1.5 text-xs text-theme-muted">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Kauf</span>
            </div>
          )}
          {resolvedMarkers.some(m => m.type === 'sell') && (
            <div className="flex items-center gap-1.5 text-xs text-theme-muted">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Verkauf</span>
            </div>
          )}
          {resolvedMarkers.some(m => m.type === 'dividend') && (
            <div className="flex items-center gap-1.5 text-xs text-theme-muted">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Dividende</span>
            </div>
          )}
          {resolvedMarkers.some(m => m.type === 'spinoff') && (
            <div className="flex items-center gap-1.5 text-xs text-theme-muted">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Spin-off</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
