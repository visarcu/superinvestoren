// src/components/portfolio/QuantSection.tsx
// Quant-Analysen im Analyse-Tab (Premium): Korrelationsmatrix, Stresstests,
// Monte-Carlo-Projektion und Fama-French-Faktoranalyse. Daten kommen aus der
// portfolio-history Route (quant:true) — alle Zahlen echt berechnet aus der
// eigenen Depot-Historie, keine Platzhalter.
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import { type Holding } from '@/hooks/usePortfolio'
import { BeakerIcon, ShieldExclamationIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

// --- Typen: Spiegel der API-Payload (portfolioQuant.ts) ---

interface CorrelationPayload {
  symbols: string[]
  weightsPct: number[]
  matrix: (number | null)[][]
  avgPairwise: number | null
  minObs: number
}

interface MonteCarloPayload {
  startValue: number
  horizonYears: number
  paths: number
  basedOnDays: number
  bands: Array<{ month: number; p5: number; p25: number; p50: number; p75: number; p95: number }>
  lossProbabilityPct: { y1: number; y3: number; y5: number; y10: number }
}

interface StressPayload {
  key: string
  label: string
  from: string
  to: string
  description: string
  marketReturnPct: number
  portfolioReturnPct: number
  portfolioImpactEur: number
  realDataWeightPct: number
  positions: Array<{ symbol: string; weightPct: number; returnPct: number; source: 'history' | 'beta' }>
}

interface FactorPayload {
  nObs: number
  from: string
  to: string
  alphaAnnualPct: number
  alphaTStat: number | null
  alphaSignificant: boolean
  r2: number
  loadings: Array<{ key: string; beta: number; tStat: number | null; significant: boolean }>
}

interface QuantPayload {
  correlation: CorrelationPayload | null
  monteCarlo: MonteCarloPayload | null
  stressTests: StressPayload[]
  factorRegression: FactorPayload | null
}

interface QuantSectionProps {
  holdings: Holding[]
  cashPosition: number
  formatCurrency: (amount: number) => string
  portfolioId?: string
  portfolioIds?: string[]
}

// --- Helfer ---

const FACTOR_META: Record<string, { label: string; positive: string; negative: string }> = {
  mktRf: { label: 'Markt-Beta', positive: 'offensiver als der Weltmarkt', negative: 'defensiver als der Weltmarkt' },
  smb: { label: 'Size (SMB)', positive: 'Neigung zu kleinen Unternehmen', negative: 'Neigung zu Large Caps' },
  hml: { label: 'Value (HML)', positive: 'Value-Tilt (günstig bewertete Firmen)', negative: 'Growth-Tilt (Wachstumsfirmen)' },
  rmw: { label: 'Profitabilität (RMW)', positive: 'Neigung zu hochprofitablen Firmen', negative: 'Neigung zu margenschwachen Firmen' },
  cma: { label: 'Investment (CMA)', positive: 'konservativ investierende Firmen', negative: 'aggressiv investierende Firmen' },
}

/** Zellfarbe der Korrelationsmatrix: -1 → Blau, 0 → neutral, +1 → Rot */
function corrColor(value: number): string {
  if (value >= 0) {
    const alpha = 0.05 + Math.min(1, value) * 0.5
    return `rgba(239, 68, 68, ${alpha.toFixed(2)})`
  }
  const alpha = 0.05 + Math.min(1, -value) * 0.5
  return `rgba(59, 130, 246, ${alpha.toFixed(2)})`
}

function formatCompactEur(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000).toLocaleString('de-DE')}k €`
  return `${Math.round(value).toLocaleString('de-DE')} €`
}

function formatWindow(from: string, to: string): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })
  return `${fmt(from)} – ${fmt(to)}`
}

// =====================================================
// Hauptkomponente
// =====================================================

export default function QuantSection({
  holdings,
  cashPosition,
  formatCurrency,
  portfolioId,
  portfolioIds,
}: QuantSectionProps) {
  const [data, setData] = useState<QuantPayload | null>(null)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Stabiler Inhalts-Schlüssel statt Array-Referenzen: holdings bekommt bei
  // jedem Live-Quote-Update eine neue Referenz und portfolioIds entsteht im
  // Workspace per .map() bei jedem Render — daran aufgehängt würde die teure
  // Quant-Berechnung in Dauerschleife neu feuern. Neu rechnen muss sie nur,
  // wenn sich Bestand (Symbol/Menge) oder Depot-Auswahl wirklich ändern.
  const requestKey = useMemo(() => {
    const holdingsKey = holdings
      .map(h => `${h.portfolio_id || ''}|${h.symbol}|${h.quantity}`)
      .sort()
      .join(';')
    const scopeKey =
      portfolioIds && portfolioIds.length > 0 ? [...portfolioIds].sort().join(',') : portfolioId || ''
    return `${scopeKey}::${holdingsKey}`
  }, [holdings, portfolioId, portfolioIds])

  // Props für den Fetch per Ref bereitstellen — der Effekt hängt bewusst nur
  // am requestKey, nutzt aber immer die aktuellen Werte.
  const propsRef = React.useRef({ holdings, cashPosition, portfolioId, portfolioIds })
  propsRef.current = { holdings, cashPosition, portfolioId, portfolioIds }

  useEffect(() => {
    if (propsRef.current.holdings.length === 0) {
      setLoading(false)
      return
    }
    const controller = new AbortController()

    const fetchQuant = async () => {
      setLoading(true)
      setError(false)
      try {
        const { holdings, cashPosition, portfolioId, portfolioIds } = propsRef.current
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('Nicht angemeldet')

        const response = await fetch('/api/portfolio-history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            portfolioId: portfolioIds && portfolioIds.length > 0 ? undefined : portfolioId,
            portfolioIds,
            holdings: holdings.map(h => ({
              portfolio_id: h.portfolio_id,
              symbol: h.symbol,
              quantity: h.quantity,
              purchase_date: h.purchase_date,
              purchase_price: h.purchase_price,
            })),
            cashPosition,
            // 5 Jahre: genug Historie für Korrelation/Beta/Bootstrap, ohne die
            // MAX-Ladezeit alter Depots zu erben
            days: 1825,
            quant: true,
          }),
        })
        if (!response.ok) throw new Error('API Error')
        const result = await response.json()
        setData(result.quant || null)
        setLocked(!!result.quantLocked)
        setLoading(false)
      } catch (e) {
        // Abbruch beim Unmount/Depotwechsel ist kein Fehler — und danach darf
        // kein State mehr gesetzt werden (der nächste Effekt übernimmt).
        if (controller.signal.aborted) return
        console.error('Quant fetch error:', e)
        setError(true)
        setLoading(false)
      }
    }

    fetchQuant()
    return () => controller.abort()
  }, [requestKey])

  if (holdings.length === 0) return null

  // Lade-Karte nur beim Erstaufruf — bei einem Refresh (z.B. Bestand geändert)
  // bleiben die vorhandenen Karten stehen, statt durch den Spinner zu flackern.
  if (loading && !data && !locked) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-5">
        <div className="flex items-center gap-2 text-[12px] text-neutral-500">
          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
          Quant-Analyse wird berechnet — Korrelationen, Stresstests, Monte-Carlo, Faktoren …
        </div>
      </div>
    )
  }

  if (locked) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-5">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-theme-muted">
          Quant-Analyse
        </p>
        <p className="text-sm leading-relaxed text-theme-secondary">
          Korrelationsmatrix, historische Stresstests (2008, 2020, 2022), Monte-Carlo-Projektion und
          Fama-French-Faktoranalyse deines Depots — echt berechnet aus deiner eigenen Historie.
        </p>
        <a
          href="/pricing"
          className="mt-3 inline-flex items-center rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white"
        >
          Premium freischalten
        </a>
      </div>
    )
  }

  // Kein Ergebnis (auch nach Fehler): nichts rendern. Schlägt dagegen nur ein
  // Refresh fehl, bleibt data gesetzt und die alten Karten stehen.
  if (!data) return null

  const hasAny = data.correlation || data.monteCarlo || data.stressTests.length > 0 || data.factorRegression
  if (!hasAny) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-5">
        <h3 className="text-sm font-medium text-white mb-1">Quant-Analyse</h3>
        <p className="text-[12px] text-neutral-500 leading-relaxed">
          Für belastbare Quant-Kennzahlen braucht es mindestens ~6 Monate Kurshistorie im Depot.
          Sobald genug Daten vorliegen, erscheinen hier Korrelationen, Stresstests, Monte-Carlo und Faktoranalyse.
        </p>
      </div>
    )
  }

  const hasBothCharts = !!data.monteCarlo && !!data.factorRegression

  return (
    <div className="space-y-5">
      {data.stressTests.length > 0 && <StressTestCard tests={data.stressTests} formatCurrency={formatCurrency} />}
      {data.correlation && <CorrelationCard corr={data.correlation} />}
      {/* Monte-Carlo + Faktoranalyse nebeneinander, sobald der Platz reicht */}
      {(data.monteCarlo || data.factorRegression) && (
        <div className={`grid grid-cols-1 gap-5 ${hasBothCharts ? 'xl:grid-cols-2' : ''}`}>
          {data.monteCarlo && <MonteCarloCard mc={data.monteCarlo} />}
          {data.factorRegression && <FactorCard reg={data.factorRegression} />}
        </div>
      )}
    </div>
  )
}

// =====================================================
// Stresstests
// =====================================================

function StressTestCard({ tests, formatCurrency }: { tests: StressPayload[]; formatCurrency: (n: number) => string }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="bg-theme-card border border-theme rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <ShieldExclamationIcon className="w-3.5 h-3.5 text-neutral-400" />
          Stresstests
        </h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Wie hätte sich dein heutiges Depot in echten Krisen geschlagen? Gemessen an den tatsächlichen
          Kursen von damals (EUR-Sicht) — Positionen, die es noch nicht gab, werden über ihr Beta genähert.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tests.map(test => {
          const isOpen = expanded === test.key
          return (
            <button
              key={test.key}
              onClick={() => setExpanded(isOpen ? null : test.key)}
              className="text-left rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 hover:bg-white/[0.05] transition-colors"
            >
              <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">{test.label}</p>
              <p className={`text-xl font-semibold tabular-nums ${test.portfolioReturnPct < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {test.portfolioReturnPct > 0 ? '+' : ''}{test.portfolioReturnPct.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%
              </p>
              <p className={`text-[12px] tabular-nums mt-0.5 ${test.portfolioImpactEur < 0 ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
                {test.portfolioImpactEur > 0 ? '+' : ''}{formatCompactEur(test.portfolioImpactEur)}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                {formatWindow(test.from, test.to)} · Markt (S&amp;P 500, EUR): {test.marketReturnPct.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%
              </p>
              <p className="text-[10px] text-neutral-600 mt-1">
                {test.realDataWeightPct >= 99.5
                  ? 'Vollständig aus echten Kursen von damals'
                  : `${test.realDataWeightPct.toLocaleString('de-DE', { maximumFractionDigits: 0 })}% des Depots aus echten Kursen, Rest Beta-Näherung`}
              </p>

              {isOpen && test.positions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
                  {test.positions.slice(0, 6).map(pos => (
                    <div key={pos.symbol} className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-300 truncate">
                        {pos.symbol}
                        {pos.source === 'beta' && <span className="text-neutral-600 ml-1">(β)</span>}
                      </span>
                      <span className={`tabular-nums ml-2 ${pos.returnPct < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {pos.returnPct > 0 ? '+' : ''}{pos.returnPct.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[11px] text-neutral-500 leading-relaxed mt-4">
        Die Szenarien legen die Krisen-Kursverläufe auf deine heutige Depotstruktur (ohne Cash).
        Vergangene Krisen sind keine Garantie für künftige Verläufe — sie zeigen die Größenordnung,
        die dein Depot verkraften können sollte. Klick auf ein Szenario zeigt die Positionen.
      </p>
    </div>
  )
}

// =====================================================
// Korrelationsmatrix
// =====================================================

function CorrelationCard({ corr }: { corr: CorrelationPayload }) {
  const diversificationHint =
    corr.avgPairwise === null ? null
      : corr.avgPairwise >= 0.7 ? 'Deine Positionen bewegen sich stark im Gleichschritt — Diversifikation über Anzahl täuscht hier.'
      : corr.avgPairwise >= 0.4 ? 'Moderater Gleichlauf — typisch für ein aktienlastiges Depot.'
      : 'Geringer Gleichlauf — deine Positionen diversifizieren sich gegenseitig gut.'

  // Auffälligkeiten: alle Paare einmal einsammeln und sortieren
  const pairs = useMemo(() => {
    const list: Array<{ a: string; b: string; value: number; combinedWeightPct: number }> = []
    for (let i = 0; i < corr.symbols.length; i++) {
      for (let j = i + 1; j < corr.symbols.length; j++) {
        const value = corr.matrix[i][j]
        if (value === null) continue
        list.push({
          a: corr.symbols[i],
          b: corr.symbols[j],
          value,
          combinedWeightPct: corr.weightsPct[i] + corr.weightsPct[j],
        })
      }
    }
    return list.sort((x, y) => y.value - x.value)
  }, [corr])

  const strongest = pairs.slice(0, 3)
  const bestDiversifiers = pairs.slice(-2).reverse()
  const shortName = (symbol: string) => symbol.replace(/\.(DE|L|PA|AS|MI|SW)$/i, '')
  // Zwillings-Warnung: hoch korreliert UND zusammen ein relevanter Depotanteil
  const twinPair = pairs.find(p => p.value >= 0.9 && p.combinedWeightPct >= 20)

  return (
    <div className="bg-theme-card border border-theme rounded-xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-white">Korrelationsmatrix</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Gleichlauf der Tagesrenditen (EUR) deiner größten Positionen · +1 = identisch, 0 = unabhängig, −1 = gegenläufig
          </p>
        </div>
        {corr.avgPairwise !== null && (
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Ø Paar</p>
            <p className="text-lg font-semibold text-white tabular-nums">{corr.avgPairwise.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[auto_minmax(240px,1fr)] gap-6 items-start">
      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th />
              {corr.symbols.map(symbol => (
                <th key={symbol} className="text-[10px] font-medium text-neutral-400 px-1 pb-1 min-w-[38px] max-w-[52px] truncate align-bottom">
                  {symbol.replace(/\.(DE|L|PA|AS|MI|SW)$/i, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {corr.symbols.map((rowSymbol, i) => (
              <tr key={rowSymbol}>
                <td className="text-[10px] font-medium text-neutral-400 pr-2 text-right whitespace-nowrap">
                  {rowSymbol.replace(/\.(DE|L|PA|AS|MI|SW)$/i, '')}
                  <span className="text-neutral-600 ml-1">{corr.weightsPct[i].toFixed(0)}%</span>
                </td>
                {corr.symbols.map((colSymbol, j) => {
                  const value = corr.matrix[i][j]
                  return (
                    <td
                      key={colSymbol}
                      className="text-center text-[10px] tabular-nums rounded"
                      style={{
                        backgroundColor: value === null ? 'rgba(255,255,255,0.02)' : corrColor(value),
                        color: value === null ? '#525252' : i === j ? 'rgba(255,255,255,0.35)' : '#fff',
                        width: 40,
                        height: 26,
                      }}
                      title={value === null ? 'Zu wenig gemeinsame Handelstage' : `${rowSymbol} × ${colSymbol}: ${value.toFixed(2)}`}
                    >
                      {value === null ? '–' : value.toFixed(2).replace('0.', '.').replace('-0.', '-.')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Auffälligkeiten neben der Matrix — füllt den Raum mit Substanz */}
      {pairs.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2">Stärkster Gleichlauf</p>
            <div className="space-y-1.5">
              {strongest.map(pair => (
                <div key={`${pair.a}-${pair.b}`} className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-neutral-200 truncate">
                    {shortName(pair.a)} <span className="text-neutral-600">×</span> {shortName(pair.b)}
                  </span>
                  <span className="text-[12px] font-medium tabular-nums text-red-400 flex-shrink-0">
                    {pair.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2">Beste Diversifizierer</p>
            <div className="space-y-1.5">
              {bestDiversifiers.map(pair => (
                <div key={`${pair.a}-${pair.b}`} className="flex items-center justify-between gap-3">
                  <span className="text-[12px] text-neutral-200 truncate">
                    {shortName(pair.a)} <span className="text-neutral-600">×</span> {shortName(pair.b)}
                  </span>
                  <span className="text-[12px] font-medium tabular-nums text-blue-400 flex-shrink-0">
                    {pair.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {twinPair && (
            <p className="text-[12px] text-neutral-300 leading-relaxed border-l-2 border-amber-400/50 pl-3">
              {shortName(twinPair.a)} und {shortName(twinPair.b)} laufen mit {twinPair.value.toFixed(2)} praktisch
              im Gleichschritt und machen zusammen {twinPair.combinedWeightPct.toFixed(0)}% des Depots aus —
              faktisch dasselbe Investment doppelt. Details siehe ETF-Überschneidungen.
            </p>
          )}
        </div>
      )}
      </div>

      {diversificationHint && (
        <p className="text-[11px] text-neutral-500 leading-relaxed mt-4">
          {diversificationHint} Basis: gemeinsame Handelstage der letzten 5 Jahre (min. {corr.minObs} Tage pro Paar);
          Prozentwert = aktuelles Depotgewicht.
        </p>
      )}
    </div>
  )
}

// =====================================================
// Monte-Carlo-Projektion
// =====================================================

function MonteCarloCard({ mc }: { mc: MonteCarloPayload }) {
  const chartData = useMemo(
    () =>
      mc.bands.map(b => ({
        years: b.month / 12,
        outer: [b.p5, b.p95] as [number, number],
        inner: [b.p25, b.p75] as [number, number],
        median: b.p50,
      })),
    [mc.bands],
  )

  const end = mc.bands[mc.bands.length - 1]

  return (
    <div className="bg-theme-card border border-theme rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <BeakerIcon className="w-3.5 h-3.5 text-neutral-400" />
          Monte-Carlo-Projektion
        </h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          {mc.paths.toLocaleString('de-DE')} simulierte Verläufe über {mc.horizonYears} Jahre — gebootstrappt aus
          deinen eigenen {mc.basedOnDays.toLocaleString('de-DE')} Handelstagen (ohne Sparraten)
        </p>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="years"
              type="number"
              domain={[0, mc.horizonYears]}
              ticks={[0, 2, 4, 6, 8, 10].filter(t => t <= mc.horizonYears)}
              tickFormatter={(v: number) => `${v}J`}
              tick={{ fill: '#737373', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompactEur(v)}
              tick={{ fill: '#737373', fontSize: 10 }}
              width={62}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number | [number, number], name: string) => {
                if (Array.isArray(value)) {
                  return [`${formatCompactEur(value[0])} – ${formatCompactEur(value[1])}`, name === 'outer' ? '90% der Verläufe' : '50% der Verläufe']
                }
                return [formatCompactEur(value), 'Median']
              }}
              labelFormatter={(v: number) => `nach ${v.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Jahren`}
              contentStyle={{ backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
            />
            <Area dataKey="outer" stroke="none" fill="#14b8a6" fillOpacity={0.1} isAnimationActive={false} />
            <Area dataKey="inner" stroke="none" fill="#14b8a6" fillOpacity={0.2} isAnimationActive={false} />
            <Line dataKey="median" stroke="#2dd4bf" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Heute</p>
          <p className="text-sm font-semibold text-white tabular-nums">{formatCompactEur(mc.startValue)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Median in {mc.horizonYears}J</p>
          <p className="text-sm font-semibold text-white tabular-nums">{formatCompactEur(end.p50)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Spanne (90%)</p>
          <p className="text-sm font-semibold text-white tabular-nums">
            {formatCompactEur(end.p5)} – {formatCompactEur(end.p95)}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Verlust-Risiko 1J / 5J</p>
          <p className="text-sm font-semibold text-white tabular-nums">
            {mc.lossProbabilityPct.y1.toLocaleString('de-DE', { maximumFractionDigits: 0 })}% / {mc.lossProbabilityPct.y5.toLocaleString('de-DE', { maximumFractionDigits: 0 })}%
          </p>
        </div>
      </div>

      <p className="text-[11px] text-neutral-500 leading-relaxed mt-4">
        Keine Prognose: Die Simulation würfelt deine eigene historische Renditeverteilung in die Zukunft
        (Bootstrap, ohne Normalverteilungs-Annahme). Sie zeigt die Bandbreite, nicht den wahrscheinlichsten
        Einzelverlauf. „Verlust-Risiko" = Anteil der Verläufe unter dem heutigen Wert.
      </p>
    </div>
  )
}

// =====================================================
// Fama-French-Faktoranalyse
// =====================================================

function FactorCard({ reg }: { reg: FactorPayload }) {
  // Interpretations-Satz aus den signifikanten Ladungen bauen
  const interpretation = useMemo(() => {
    const parts: string[] = []
    for (const loading of reg.loadings) {
      const meta = FACTOR_META[loading.key]
      if (!meta || loading.key === 'mktRf') continue
      if (!loading.significant || Math.abs(loading.beta) < 0.1) continue
      parts.push(loading.beta > 0 ? meta.positive : meta.negative)
    }
    const market = reg.loadings.find(l => l.key === 'mktRf')
    const marketPart = market
      ? market.beta > 1.1 ? 'Dein Depot ist offensiver als der Weltmarkt'
        : market.beta < 0.9 ? 'Dein Depot ist defensiver als der Weltmarkt'
        : 'Dein Depot bewegt sich etwa im Takt des Weltmarkts'
      : null
    if (!marketPart) return null
    return parts.length > 0 ? `${marketPart}, mit ${parts.join(', ')}.` : `${marketPart}.`
  }, [reg.loadings])

  // Balken-Skala: symmetrisch um 0, mind. ±1.5 damit Markt-Beta 1 sichtbar einordnet
  const maxAbs = Math.max(1.5, ...reg.loadings.map(l => Math.abs(l.beta)))

  return (
    <div className="bg-theme-card border border-theme rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white">Faktoranalyse (Fama-French)</h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Welche Stil-Faktoren treiben deine Rendite? Regression deiner Tagesrenditen auf das
          5-Faktoren-Modell (Developed Markets, Ken French Data Library)
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Alpha p.a.</p>
          <p className={`text-xl font-semibold tabular-nums ${reg.alphaAnnualPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {reg.alphaAnnualPct > 0 ? '+' : ''}{reg.alphaAnnualPct.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            {reg.alphaSignificant ? 'statistisch belastbar' : 'statistisch nicht von 0 unterscheidbar'}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">R²</p>
          <p className="text-xl font-semibold text-white tabular-nums">
            {(reg.r2 * 100).toLocaleString('de-DE', { maximumFractionDigits: 0 })}%
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">der Rendite durch Faktoren erklärt</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 col-span-2 lg:col-span-1">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Datenbasis</p>
          <p className="text-xl font-semibold text-white tabular-nums">{reg.nObs.toLocaleString('de-DE')}</p>
          <p className="text-[11px] text-neutral-500 mt-1">gemeinsame Handelstage</p>
        </div>
      </div>

      {/* Faktor-Ladungen als divergierende Balken */}
      <div className="space-y-2.5">
        {reg.loadings.map(loading => {
          const meta = FACTOR_META[loading.key]
          if (!meta) return null
          const widthPct = (Math.abs(loading.beta) / maxAbs) * 50
          return (
            <div key={loading.key} className="flex items-center gap-3">
              <div className="w-36 flex-shrink-0 text-right">
                <span className="text-[12px] text-neutral-200">{meta.label}</span>
              </div>
              <div className="flex-1 relative h-4 rounded bg-white/[0.04]">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.15]" />
                <div
                  className={`absolute inset-y-0.5 rounded-sm ${loading.beta >= 0 ? 'bg-teal-400/70' : 'bg-blue-400/70'}`}
                  style={
                    loading.beta >= 0
                      ? { left: '50%', width: `${widthPct}%` }
                      : { right: '50%', width: `${widthPct}%` }
                  }
                />
              </div>
              <div className="w-20 flex-shrink-0 text-[12px] tabular-nums text-white">
                {loading.beta > 0 ? '+' : ''}{loading.beta.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                {!loading.significant && <span className="text-neutral-600 ml-1" title="statistisch nicht belastbar (|t| < 2)">≈</span>}
              </div>
            </div>
          )
        })}
      </div>

      {interpretation && (
        <p className="text-[12px] text-neutral-300 leading-relaxed mt-4 border-l-2 border-teal-400/40 pl-3">
          {interpretation}
        </p>
      )}

      <p className="text-[11px] text-neutral-500 leading-relaxed mt-3">
        Faktoren: Markt, Size (klein vs. groß), Value (günstig vs. teuer), Profitabilität, Investment.
        „≈" markiert Ladungen, die statistisch nicht belastbar sind (|t| &lt; 2). Die Regression läuft in USD
        (Denominierung der Faktordaten), Zeitraum {formatWindow(reg.from, reg.to)}.
      </p>
    </div>
  )
}
