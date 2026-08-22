// src/components/portfolio/PortfolioValueChart.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts'
import { ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { perfColor } from '@/utils/formatters'
import { supabase } from '@/lib/supabaseClient'

interface PortfolioValueChartProps {
  /** Einzel-Depot-ID. Bei "Alle Depots"-Ansicht ignoriert — dann portfolioIds nutzen. */
  portfolioId: string
  /**
   * UUIDs aller Depots in der "Alle Depots"-Ansicht. Wird nur gesetzt wenn der
   * User die Aggregat-Ansicht aktiv hat — sonst undefined. Die API nutzt dann
   * `.in('portfolio_id', portfolioIds)` statt einer einzelnen Abfrage.
   */
  portfolioIds?: string[]
  holdings: Array<{
    portfolio_id?: string
    symbol: string
    quantity: number
    purchase_price: number
    current_value?: number
    purchase_date?: string
  }>
  cashPosition: number
  formatCurrency: (amount: number) => string
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'MAX'
type ChartView = 'value' | 'performance'

interface ValueDataPoint {
  date: string
  value: number
  invested: number
  /** Kaufkosten der gehaltenen Positionen (Durchschnittskostenmethode) */
  costBasis?: number
  /** Netto-Einzahlungen — ohne reinvestierte Erlöse/Dividenden */
  contributed?: number
  label: string
}

interface PerformanceDataPoint {
  date: string
  portfolioPerformance: number
  spyPerformance: number
  msciWorldPerformance: number
  ftseAllWorldPerformance: number
  label: string
}

interface BenchmarkStats {
  label: string
  totalReturnPct: number
  annualizedPct: number | null
  diffTotalPct: number
  diffPaPct: number | null
  euroDiff: number | null
}

interface AttributionBucket {
  key: string
  label: string
  euroDiff: number
  paPct: number | null
}

interface BenchmarkAttribution {
  benchmarkLabel: string
  totalEuroDiff: number
  totalDiffPaPct: number | null
  buckets: AttributionBucket[]
  best: { symbol: string; euroDiff: number } | null
  worst: { symbol: string; euroDiff: number } | null
  cashDragEuro: number | null
}

interface BenchmarkComparison {
  startDate: string
  endDate: string
  periodYears: number
  portfolio: { totalReturnPct: number; annualizedPct: number | null }
  benchmarks: {
    ftseAllWorld: BenchmarkStats | null
    sp500: BenchmarkStats | null
    msciWorld: BenchmarkStats | null
  }
  attribution?: BenchmarkAttribution
}

interface RiskMeasures {
  periodDays: number
  annualizedReturnPct: number
  volatilityPct: number
  downsideDeviationPct: number
  sharpe: number | null
  sortino: number | null
  calmar: number | null
  maxDrawdownPct: number
  maxDrawdownPeak: string
  maxDrawdownValley: string
  recoveryMonths: number | null
  beta: number | null
  positiveMonths: number
  negativeMonths: number
  meanMonthlyReturnPct: number
}

interface RiskMeasuresPayload {
  riskFreePct: number | null
  portfolio: RiskMeasures | null
  ftseAllWorld: RiskMeasures | null
  sp500: RiskMeasures | null
  msciWorld: RiskMeasures | null
}

// "seit 5,2 Jahren" / "seit einem Jahr" / "in den letzten 8 Monaten"
function formatPeriodLabel(years: number): string {
  if (years >= 1) {
    const rounded = Math.round(years * 10) / 10
    if (rounded < 1.05) return 'seit einem Jahr'
    const str = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toLocaleString('de-DE', { maximumFractionDigits: 1 })
    return `seit ${str} Jahren`
  }
  const months = Math.max(1, Math.round(years * 12))
  return months === 1 ? 'im letzten Monat' : `in den letzten ${months} Monaten`
}

// Runde Euro-Beträge fürs Wording ("rund 2.500 €") — exakte Cent-Beträge
// würden hier Scheingenauigkeit suggerieren.
function formatEuroApprox(value: number): string {
  const abs = Math.abs(value)
  const rounded = abs >= 1000 ? Math.round(abs / 100) * 100 : Math.round(abs / 10) * 10
  return `${rounded.toLocaleString('de-DE')} €`
}

function formatDiffPct(value: number): string {
  return Math.abs(value).toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export default function PortfolioValueChart({
  portfolioId,
  portfolioIds,
  holdings,
  cashPosition,
  formatCurrency
}: PortfolioValueChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('MAX')
  const [chartView, setChartView] = useState<ChartView>('value')
  const [valueData, setValueData] = useState<ValueDataPoint[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [comparison, setComparison] = useState<BenchmarkComparison | null>(null)
  const [risk, setRisk] = useState<RiskMeasuresPayload | null>(null)
  const [riskLocked, setRiskLocked] = useState(false)
  const [showAttribution, setShowAttribution] = useState(false)
  // 'deposits': Wert inkl. Cash vs. echte Einzahlungen (Cash-Ledger vorhanden).
  // 'cost_basis': Wertpapierwert vs. Kostenbasis (Fallback ohne Cash-Daten).
  const [investedMode, setInvestedMode] = useState<'deposits' | 'cost_basis'>('cost_basis')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (holdings.length === 0) {
      setValueData([])
      setPerformanceData([])
      setComparison(null)
      setLoading(false)
      return
    }

    setLoading(true)

    // MAX: 15 Jahre erlauben — Backend trimmt auf das erste Transaktionsdatum,
    // sodass nur die tatsächlich relevante Historie geladen wird.
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'MAX': 5475 }[selectedRange]

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Nicht angemeldet')

      const response = await fetch('/api/portfolio-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          // Bei Alle-Depots-Ansicht: echte UUIDs aller Portfolios durchreichen.
          // Sonst würde die API die synthetische 'all'-ID als UUID interpretieren
          // und keine Transaktionen finden → Chart fällt auf Holdings-Fallback
          // zurück und zählt Symbole nur einfach statt aggregiert.
          portfolioId: portfolioIds && portfolioIds.length > 0 ? undefined : portfolioId,
          portfolioIds,
          holdings: holdings.map(h => ({
            portfolio_id: h.portfolio_id,
            symbol: h.symbol,
            quantity: h.quantity,
            purchase_date: h.purchase_date,
            purchase_price: h.purchase_price
          })),
          cashPosition,
          days
        })
      })

      if (!response.ok) throw new Error('API Error')
      const result = await response.json()

      // Jahresübergreifende Ranges: Jahr im Label zeigen
      const spansMultipleYears = ['1Y', 'MAX'].includes(selectedRange)
      const formatLabel = (dateStr: string) => {
        const d = new Date(dateStr)
        if (spansMultipleYears) {
          // "Jan. 25" statt "07. Jan." — kompakt mit Jahr
          return d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
        }
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
      }

      // Modus VOR dem Live-Punkt bestimmen: die historische Serie enthält Cash
      // nur im 'deposits'-Modus. Im 'cost_basis'-Modus (Serie = nur Wertpapiere)
      // darf der Live-Punkt das Cash nicht addieren — sonst springt der letzte
      // Punkt um die Cash-Position (bei negativem Cash: nach unten).
      const mode: 'deposits' | 'cost_basis' =
        result.meta?.investedMode === 'deposits' ? 'deposits' : 'cost_basis'

      if (result.data) {
        const mappedData = result.data.map((d: any) => ({
          ...d,
          label: formatLabel(d.date)
        }))

        const securitiesValue = holdings.reduce((sum, h) => sum + (Number(h.current_value) || 0), 0)
        const livePortfolioValue = mode === 'deposits' ? securitiesValue + cashPosition : securitiesValue
        if (mappedData.length > 0 && livePortfolioValue > 0) {
          const today = new Date().toISOString().split('T')[0]
          const last = mappedData[mappedData.length - 1]
          const livePoint = {
            ...last,
            date: today,
            label: formatLabel(today),
            value: Math.round(livePortfolioValue * 100) / 100,
            performance: last.invested > 0
              ? Math.round(((livePortfolioValue - last.invested) / last.invested) * 10000) / 100
              : 0,
          }

          if (last.date === today) mappedData[mappedData.length - 1] = livePoint
          else mappedData.push(livePoint)
        }

        setValueData(mappedData)
      }

      if (result.performanceData) {
        setPerformanceData(result.performanceData.map((d: any) => ({
          ...d,
          label: formatLabel(d.date)
        })))
      }

      setComparison(result.benchmarkComparison || null)
      setRisk(result.riskMeasures || null)
      setRiskLocked(!!result.riskMeasuresLocked)
      setInvestedMode(mode)
    } catch (error) {
      console.error('Chart data fetch error:', error)
    } finally {
      setLoading(false)
    }
  }, [portfolioId, portfolioIds, holdings, cashPosition, selectedRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const lastPerf = performanceData.length > 0 ? performanceData[performanceData.length - 1] : null

  // Benchmark-Insight: Headline-Vergleich gegen FTSE All-World ("Hättest du
  // einfach den Welt-ETF gekauft?"), S&P 500 und MSCI World als Zusatzzeile.
  const headlineBenchmark = comparison?.benchmarks?.ftseAllWorld ?? null
  let insight: {
    period: string
    diffText: string
    positive: boolean
    nearZero: boolean
    euroText: string | null
  } | null = null
  if (comparison && headlineBenchmark) {
    const diff = headlineBenchmark.diffPaPct ?? headlineBenchmark.diffTotalPct
    const isPa = headlineBenchmark.diffPaPct !== null
    const euro = headlineBenchmark.euroDiff
    // Euro-Satz nur zeigen, wenn sein Vorzeichen zur Prozent-Aussage passt.
    // Zeitgewichtete Differenz und geldgewichteter Euro-Betrag können legitim
    // auseinanderfallen (Timing der Einzahlungen) — dann würde "unterperformt …
    // zusätzlich eingebracht" nur verwirren. Vorher übernahm der Satz sogar
    // das %-Vorzeichen und deklarierte positive Beträge als "gekostet".
    const euroMatchesDiff = euro !== null && Math.abs(euro) >= 10 && (euro >= 0) === (diff >= 0)
    insight = {
      period: formatPeriodLabel(comparison.periodYears),
      diffText: `${formatDiffPct(diff)} ${isPa ? '% p.a.' : 'Prozentpunkte'}`,
      positive: diff >= 0,
      nearZero: Math.abs(diff) < 0.05,
      euroText: euroMatchesDiff ? formatEuroApprox(euro) : null,
    }
  }

  const secondaryStats = comparison
    ? [comparison.benchmarks.sp500, comparison.benchmarks.msciWorld].filter(
        (b): b is BenchmarkStats => !!b
      )
    : []

  const attribution =
    comparison?.attribution && comparison.attribution.buckets.length > 0
      ? comparison.attribution
      : null

  const formatEuro = (value: number) =>
    `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

  // Beide Kapital-Linien nur zeigen, wenn sie sich tatsächlich unterscheiden —
  // ohne Reinvestitionen liegen Kostenbasis und Einzahlungen aufeinander.
  const hasCapitalLines = valueData.some(p => p.costBasis !== undefined)
  const showContributedLine = hasCapitalLines &&
    valueData.some(p => Math.abs((p.contributed ?? 0) - (p.costBasis ?? 0)) > 1)

  const ValueTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload as ValueDataPoint | undefined
    if (!point) return null

    const hasBoth = point.costBasis !== undefined && point.contributed !== undefined
    // Gesamtgewinn immer gegen die Einzahlungen — die Differenz zur Kostenbasis
    // wäre nur der unrealisierte Gewinn auf den aktuellen Bestand.
    const reference = hasBoth ? point.contributed! : point.invested
    const difference = point.value - reference
    const dateLabel = new Date(point.date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    return (
      <div className="terminal-glass-strong rounded-xl px-3 py-2 text-xs">
        <div className="mb-2 font-semibold text-theme-primary">{dateLabel}</div>
        <div className="space-y-1">
          <div className="flex min-w-[190px] justify-between gap-5">
            <span className="text-theme-secondary">
              {investedMode === 'deposits' ? 'Depotwert (inkl. Cash)' : 'Portfoliowert'}
            </span>
            <span className="tabular-nums text-theme-primary">{formatEuro(point.value)}</span>
          </div>
          {hasBoth ? (
            <>
              <div className="flex min-w-[190px] justify-between gap-5">
                <span className="text-theme-secondary">Kostenbasis</span>
                <span className="tabular-nums text-theme-primary">{formatEuro(point.costBasis!)}</span>
              </div>
              <div className="flex min-w-[190px] justify-between gap-5">
                <span className="text-theme-secondary">Eingezahlt</span>
                <span className="tabular-nums text-theme-primary">{formatEuro(point.contributed!)}</span>
              </div>
            </>
          ) : (
            <div className="flex min-w-[190px] justify-between gap-5">
              <span className="text-theme-secondary">
                {investedMode === 'deposits' ? 'Eingezahltes Kapital' : 'Investiertes Kapital'}
              </span>
              <span className="tabular-nums text-theme-primary">{formatEuro(point.invested)}</span>
            </div>
          )}
          <div className="flex min-w-[190px] justify-between gap-5 border-t border-theme pt-1">
            <span className="text-theme-secondary">
              {hasBoth || investedMode === 'deposits' ? 'Gesamtgewinn' : 'Differenz'}
            </span>
            <span className={`tabular-nums font-medium ${difference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {difference >= 0 ? '+' : ''}{formatEuro(difference)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="terminal-input flex gap-1 rounded-xl p-0.5">
          <button
            onClick={() => setChartView('value')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              chartView === 'value'
                ? 'bg-theme-secondary text-theme-primary dark:bg-white/[0.08] dark:text-white'
                : 'text-theme-muted hover:text-theme-secondary'
            }`}
          >
            Wertentwicklung
          </button>
          <button
            onClick={() => setChartView('performance')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              chartView === 'performance'
                ? 'bg-theme-secondary text-theme-primary dark:bg-white/[0.08] dark:text-white'
                : 'text-theme-muted hover:text-theme-secondary'
            }`}
          >
            Performance vs. Benchmarks (TWR)
          </button>
        </div>

        <div className="terminal-input flex gap-1 rounded-xl p-0.5">
          {(['1M', '3M', '6M', '1Y', 'MAX'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                selectedRange === range
                  ? 'bg-theme-secondary text-theme-primary dark:bg-white/[0.08] dark:text-white'
                  : 'text-theme-muted hover:text-theme-secondary'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Labels */}
      {chartView === 'performance' && lastPerf && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-xs text-theme-secondary">Portfolio (TWR)</span>
            <span className={`text-xs font-medium ${perfColor(lastPerf.portfolioPerformance)}`}>
              {lastPerf.portfolioPerformance >= 0 ? '+' : ''}{lastPerf.portfolioPerformance.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-400 rounded-full" />
            <span className="text-xs text-theme-secondary">S&P 500</span>
            <span className={`text-xs font-medium ${lastPerf.spyPerformance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {lastPerf.spyPerformance >= 0 ? '+' : ''}{lastPerf.spyPerformance.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-violet-400 rounded-full" />
            <span className="text-xs text-theme-secondary">MSCI World</span>
            <span className={`text-xs font-medium ${lastPerf.msciWorldPerformance >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
              {lastPerf.msciWorldPerformance >= 0 ? '+' : ''}{lastPerf.msciWorldPerformance.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-400 rounded-full" />
            <span className="text-xs text-theme-secondary">FTSE All-World</span>
            <span className={`text-xs font-medium ${lastPerf.ftseAllWorldPerformance >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {lastPerf.ftseAllWorldPerformance >= 0 ? '+' : ''}{lastPerf.ftseAllWorldPerformance.toFixed(2)}%
            </span>
          </div>
          <span className="text-[11px] text-theme-muted">Benchmarks in EUR · Total Return</span>
        </div>
      )}

      {/* Chart */}
      <div className="h-[280px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <ArrowPathIcon className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : chartView === 'value' ? (
          valueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={valueData}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`
                    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`
                    return `${v.toFixed(0)}`
                  }}
                  width={50}
                />
                <Tooltip
                  content={<ValueTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  fill="url(#valueGradient)"
                />
                <Line
                  type="monotone"
                  dataKey={hasCapitalLines ? 'costBasis' : 'invested'}
                  stroke="var(--chart-axis)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                {showContributedLine && (
                  <Line
                    type="monotone"
                    dataKey="contributed"
                    stroke="#f59e0b"
                    strokeOpacity={0.65}
                    strokeWidth={1}
                    strokeDasharray="2 3"
                    dot={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
              Keine Daten verfügbar
            </div>
          )
        ) : (
          performanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#737373', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  width={45}
                />
                <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    color: 'var(--color-text-primary)',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      portfolioPerformance: 'Portfolio (TWR)',
                      spyPerformance: 'S&P 500',
                      msciWorldPerformance: 'MSCI World',
                      ftseAllWorldPerformance: 'FTSE All-World',
                    }
                    return [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, labels[name] || name]
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="portfolioPerformance"
                  stroke="#2dd4bf"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="spyPerformance"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="msciWorldPerformance"
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ftseAllWorldPerformance"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
              Keine Performancedaten verfügbar
            </div>
          )
        )}
      </div>

      {/* Erklärung der Kapital-Linien (je nach Datenlage) */}
      {!loading && chartView === 'value' && valueData.length > 0 && (
        <p className="mt-2 text-[10px] leading-relaxed text-theme-muted/70">
          {showContributedLine ? (
            <>
              Kostenbasis (grau gestrichelt): Kaufkosten der aktuell gehaltenen Positionen inkl.
              Gebühren (Durchschnittskostenmethode) — reinvestierte Erlöse und Dividenden erhöhen sie.
              Eingezahlt (gelb gepunktet): dein netto zugeführtes Kapital ohne Reinvestitionen
              {investedMode === 'deposits'
                ? ' (aus deinen Ein- und Auszahlungen inkl. Depotüberträgen)'
                : ' (Näherung aus Käufen abzüglich Verkaufserlösen und Dividenden)'}.
              Die Differenz zwischen Depotwert und Eingezahlt ist dein Gesamtgewinn.
            </>
          ) : investedMode === 'deposits' ? (
            <>
              Eingezahltes Kapital (gestrichelt): Summe deiner Ein- und Auszahlungen inkl.
              Depotüberträgen. Die Differenz zum Depotwert (inkl. Cash) ist dein Gesamtgewinn —
              inklusive realisierter Gewinne und Dividenden; Reinvestitionen erhöhen diese Linie nicht.
            </>
          ) : (
            <>
              Investiertes Kapital (gestrichelt): Kaufkosten der aktuell gehaltenen Positionen inkl.
              Gebühren (Durchschnittskostenmethode). Reinvestierte Verkaufserlöse und Dividenden
              erhöhen diesen Wert — er kann daher über der Summe deiner Einzahlungen liegen.
              Importierst du auch deine Ein-/Auszahlungen, zeigt die Linie stattdessen dein
              tatsächlich eingezahltes Kapital.
            </>
          )}
        </p>
      )}

      {/* Benchmark-Insight: Was hätte der Welt-ETF gebracht? */}
      {!loading && insight && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-theme-muted">
            Benchmark-Vergleich
          </p>
          <p className="text-sm leading-relaxed text-theme-secondary">
            {insight.nearZero ? (
              <>Du liegst {insight.period} praktisch gleichauf mit dem{' '}
              <span className="text-theme-primary">FTSE All-World</span>.</>
            ) : (
              <>
                Du hast den <span className="text-theme-primary">FTSE All-World</span>{' '}
                {insight.period} um{' '}
                <span className={`font-medium tabular-nums ${insight.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {insight.diffText}
                </span>{' '}
                {insight.positive ? 'geschlagen' : 'unterperformt'}.
                {insight.euroText && (
                  <>
                    {' '}
                    {insight.positive ? 'Das hat dir rund' : 'Das hat dich rund'}{' '}
                    <span className={`font-medium tabular-nums ${insight.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {insight.euroText}
                    </span>{' '}
                    {insight.positive ? 'zusätzlich eingebracht' : 'gekostet'}.
                  </>
                )}
              </>
            )}
          </p>

          {/* Attribution: exakte Zerlegung des Euro-Gaps nach Positionsgruppen */}
          {attribution && (
            <div className="mt-3 border-t border-white/[0.05] pt-3">
              <button
                type="button"
                onClick={() => setShowAttribution(v => !v)}
                className="flex items-center gap-1.5 text-xs text-theme-muted transition-colors hover:text-theme-secondary"
              >
                Woher kommt die Differenz?
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 transition-transform ${showAttribution ? 'rotate-180' : ''}`}
                />
              </button>
              {showAttribution && (
                <div className="mt-3 space-y-1.5">
                  {attribution.buckets.map(bucket => (
                    <div
                      key={bucket.key}
                      className="flex items-baseline justify-between gap-4 text-xs"
                    >
                      <span className="text-theme-secondary">{bucket.label}</span>
                      <span className="flex items-baseline gap-3 tabular-nums">
                        {bucket.paPct !== null && (
                          <span className={bucket.paPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {bucket.paPct >= 0 ? '+' : '−'}{formatDiffPct(bucket.paPct)} % p.a.
                          </span>
                        )}
                        <span
                          className={`font-medium ${bucket.euroDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                        >
                          {bucket.euroDiff >= 0 ? '+' : '−'}{formatEuroApprox(bucket.euroDiff)}
                        </span>
                      </span>
                    </div>
                  ))}
                  {(attribution.worst || attribution.best) && (
                    <p className="pt-1.5 text-[11px] text-theme-muted">
                      {attribution.worst && (
                        <>
                          Größter Kostenfaktor:{' '}
                          <span className="text-theme-secondary">{attribution.worst.symbol}</span>{' '}
                          <span className="tabular-nums text-red-400">
                            −{formatEuroApprox(attribution.worst.euroDiff)}
                          </span>
                        </>
                      )}
                      {attribution.worst && attribution.best && ' · '}
                      {attribution.best && (
                        <>
                          Stärkster Beitrag:{' '}
                          <span className="text-theme-secondary">{attribution.best.symbol}</span>{' '}
                          <span className="tabular-nums text-emerald-400">
                            +{formatEuroApprox(attribution.best.euroDiff)}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  {attribution.cashDragEuro !== null && attribution.cashDragEuro >= 10 && (
                    <p className="text-[11px] text-theme-muted">
                      Cash-Bestand: rund{' '}
                      <span className="tabular-nums text-theme-secondary">
                        {formatEuroApprox(attribution.cashDragEuro)}
                      </span>{' '}
                      entgangene Indexrendite — zusätzlich, nicht Teil des Vergleichs oben.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {secondaryStats.length > 0 && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1.5 border-t border-white/[0.05] pt-3">
              {secondaryStats.map(stat => {
                const d = stat.diffPaPct ?? stat.diffTotalPct
                const unit = stat.diffPaPct !== null ? '% p.a.' : 'Pp.'
                return (
                  <div key={stat.label} className="flex items-baseline gap-2 text-xs">
                    <span className="text-theme-muted">{stat.label}</span>
                    <span className={`font-medium tabular-nums ${d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {d >= 0 ? '+' : '−'}{formatDiffPct(d)} {unit}
                    </span>
                    {stat.euroDiff !== null && Math.abs(stat.euroDiff) >= 10 && (
                      <span className="tabular-nums text-theme-muted">
                        {stat.euroDiff >= 0 ? '+' : '−'}{formatEuroApprox(stat.euroDiff)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-theme-muted/70">
            Benchmarks in EUR, inkl. reinvestierter Dividenden (Total Return) · Euro-Betrag: dieselben
            Einzahlungen zu denselben Zeitpunkten in den Index investiert.
          </p>
        </div>
      )}

      {/* ===== Risiko-Kennzahlen (Premium) ===== */}
      {!loading && riskLocked && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-theme-muted">
            Risiko-Kennzahlen
          </p>
          <p className="text-sm leading-relaxed text-theme-secondary">
            Sharpe Ratio, Sortino, Max Drawdown, Volatilität und Beta deines Depots — im Vergleich zum
            FTSE All-World, echt berechnet aus deiner Wertentwicklung.
          </p>
          <a
            href="/pricing"
            className="mt-3 inline-flex items-center rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white"
          >
            Premium freischalten
          </a>
        </div>
      )}

      {!loading && risk && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-theme-muted">
            Risiko-Kennzahlen
          </p>
          {!risk.portfolio ? (
            <p className="text-sm leading-relaxed text-theme-secondary">
              Für belastbare Risiko-Kennzahlen braucht es mindestens ~6 Monate Kurshistorie im
              gewählten Zeitraum — wähle einen längeren Zeitraum oder schau später wieder vorbei.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-theme-muted">
                      <th className="py-2 text-left font-medium">Kennzahl</th>
                      <th className="py-2 text-right font-medium">Dein Depot</th>
                      <th className="py-2 text-right font-medium">FTSE All-World</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {([
                      ['Rendite p.a.', (m: RiskMeasures) => `${m.annualizedReturnPct >= 0 ? '+' : ''}${m.annualizedReturnPct.toFixed(1)}%`],
                      ['Sharpe Ratio', (m: RiskMeasures) => m.sharpe !== null ? m.sharpe.toFixed(2) : '—'],
                      ['Sortino Ratio', (m: RiskMeasures) => m.sortino !== null ? m.sortino.toFixed(2) : '—'],
                      ['Volatilität p.a.', (m: RiskMeasures) => `${m.volatilityPct.toFixed(1)}%`],
                      ['Downside Deviation', (m: RiskMeasures) => `${m.downsideDeviationPct.toFixed(1)}%`],
                      ['Max Drawdown', (m: RiskMeasures) => `${m.maxDrawdownPct.toFixed(1)}%`],
                      ['Recovery', (m: RiskMeasures) => m.recoveryMonths !== null ? `${m.recoveryMonths} Monat${m.recoveryMonths !== 1 ? 'e' : ''}` : 'läuft noch'],
                      ['Calmar Ratio', (m: RiskMeasures) => m.calmar !== null ? m.calmar.toFixed(2) : '—'],
                      ['Positive Monate', (m: RiskMeasures) => {
                        const total = m.positiveMonths + m.negativeMonths
                        return total > 0 ? `${m.positiveMonths}/${total} (${Math.round((m.positiveMonths / total) * 100)}%)` : '—'
                      }],
                    ] as [string, (m: RiskMeasures) => string][]).map(([label, fmt]) => (
                      <tr key={label} className="border-b border-white/[0.04] last:border-b-0">
                        <td className="py-1.5 text-theme-secondary">{label}</td>
                        <td className="py-1.5 text-right font-medium text-theme-primary">{fmt(risk.portfolio!)}</td>
                        <td className="py-1.5 text-right text-theme-secondary">
                          {risk.ftseAllWorld ? fmt(risk.ftseAllWorld) : '—'}
                        </td>
                      </tr>
                    ))}
                    {risk.portfolio.beta !== null && (
                      <tr>
                        <td className="py-1.5 text-theme-secondary">Beta vs. FTSE All-World</td>
                        <td className="py-1.5 text-right font-medium text-theme-primary">{risk.portfolio.beta.toFixed(2)}</td>
                        <td className="py-1.5 text-right text-theme-secondary">1.00</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-theme-muted/70">
                Berechnet aus Tagesrenditen des gewählten Zeitraums · Max Drawdown{' '}
                {new Date(risk.portfolio.maxDrawdownPeak).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })} –{' '}
                {new Date(risk.portfolio.maxDrawdownValley).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
                {risk.riskFreePct !== null && (
                  <> · Risikofreier Zins: {risk.riskFreePct.toFixed(1)}% p.a. (€STR via XEON)</>
                )}
                {' '}· Keine Anlageberatung.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
