'use client'

// Owner Earnings nach Buffett für den Bewertungs-Tab (/analyse/stocks/[ticker]/valuation):
// Herleitung, Rendite auf den Börsenwert und Mehrjahresvergleich mit Gewinn und Free Cashflow.
// Die Kennzahl ist eine Schätzung, deshalb steht die Rechnung komplett auf der Karte.

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { loadOwnerEarnings, type OwnerEarningsLoad } from '@/lib/ownerEarningsData'

// Reihenfolge fest. Geprüft auf #111113 und #ffffff (Kontrast, Farbsehschwäche).
const SERIES = [
  { key: 'netIncome', label: 'Nettogewinn', color: '#16a34a' },
  { key: 'ownerEarnings', label: 'Owner Earnings', color: '#8b5cf6' },
  { key: 'freeCashFlow', label: 'Free Cashflow', color: '#ea580c' },
] as const

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' }

function compact(v: number, digits: number): string {
  const de = (n: number, d: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−')
  const a = Math.abs(v)
  if (a >= 1e12) return `${de(v / 1e12, Math.max(digits, 1))} Bio.`
  if (a >= 1e9) return `${de(v / 1e9, digits)} Mrd.`
  if (a >= 1e6) return `${de(v / 1e6, 0)} Mio.`
  return de(v, 0)
}

function percent(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return 'k. A.'
  return `${(v * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace('-', '−')} %`
}

export default function OwnerEarningsCard({ ticker }: { ticker: string }) {
  const [load, setLoad] = useState<OwnerEarningsLoad | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoad(null)
    loadOwnerEarnings(ticker).then(result => {
      if (!cancelled) setLoad(result)
    })
    return () => {
      cancelled = true
    }
  }, [ticker])

  if (load === null) {
    return (
      <div className="bg-theme-card rounded-xl p-6 border border-theme">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-theme-muted border-t-transparent rounded-full animate-spin" />
          <span className="text-theme-muted text-sm">Lade Owner Earnings…</span>
        </div>
      </div>
    )
  }

  if (load.status === 'unavailable') return null

  const { latest, currency, convertedFrom, marketCap, years } = load
  const symbol = SYMBOLS[currency] ?? currency
  const money = (v: number | null) => (v === null ? 'k. A.' : `${compact(v, 1)} ${symbol}`)
  const yieldOf = (v: number | null) => (v === null || marketCap === null ? null : v / marketCap)

  const chartData = years.filter(y => y.ownerEarnings !== null)
  const hasNegative = chartData.some(y => SERIES.some(s => (y[s.key] ?? 0) < 0))
  const rawMaintenance = latest.capex !== null && latest.growthCapex !== null ? latest.capex - latest.growthCapex : null

  // Greenwald stößt bei Hyperwachstum an Grenzen (Nvidia: Erhaltungs-Capex 0)
  const allGrowth = latest.depreciation !== null && latest.maintenanceCapex < latest.depreciation * 0.25

  return (
    <div className="bg-theme-card rounded-xl border border-theme overflow-hidden">
      {/* Kopf */}
      <div className="px-6 py-4 border-b border-theme">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-theme-primary">{ticker.toUpperCase()} Owner Earnings</h3>
            <p className="text-xs text-theme-muted mt-1 max-w-2xl">
              Warren Buffetts Kennzahl von 1986: was ein Eigentümer jedes Jahr entnehmen könnte, ohne das Geschäft zu
              schwächen. Geschäftsjahr {latest.period}
              {convertedFrom ? `, umgerechnet aus ${convertedFrom} zum aktuellen Kurs` : ''}.
            </p>
          </div>
          <span className="shrink-0 text-xs text-theme-muted bg-theme-secondary px-2 py-1 rounded-md">Schätzung</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-theme">
        {/* Herleitung */}
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-theme-primary mb-3">Herleitung</p>
          <dl className="text-sm tabular-nums">
            <div className="flex items-center justify-between py-2">
              <dt className="text-theme-secondary">Nettogewinn</dt>
              <dd className="text-theme-primary">{money(latest.netIncome)}</dd>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-theme">
              <dt className="text-theme-secondary">+ Abschreibungen</dt>
              <dd className="text-theme-primary">{money(latest.depreciation)}</dd>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-theme">
              <dt className="text-theme-secondary">− Erhaltungs-Capex (geschätzt)</dt>
              <dd className="text-theme-primary">{money(latest.maintenanceCapex)}</dd>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-theme">
              <dt className="font-semibold text-theme-primary">= Owner Earnings</dt>
              <dd className="text-lg font-semibold text-theme-primary">{money(latest.ownerEarnings)}</dd>
            </div>
          </dl>
        </div>

        {/* Rendite */}
        <div className="px-6 py-5 border-t md:border-t-0 border-theme">
          <p className="text-sm font-medium text-theme-primary mb-3">Rendite auf den Börsenwert</p>
          {marketCap !== null ? (
            <dl className="text-sm tabular-nums">
              <div className="flex items-center justify-between py-2">
                <dt className="font-semibold text-theme-primary">Owner Earnings</dt>
                <dd className="text-lg font-semibold text-theme-primary">{percent(yieldOf(latest.ownerEarnings))}</dd>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-theme">
                <dt className="text-theme-secondary">Free Cashflow</dt>
                <dd className="text-theme-primary">{percent(yieldOf(latest.freeCashFlow))}</dd>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-theme">
                <dt className="text-theme-secondary">Nettogewinn (1/KGV)</dt>
                <dd className="text-theme-primary">{percent(yieldOf(latest.netIncome))}</dd>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-theme">
                <dt className="text-theme-muted">Börsenwert</dt>
                <dd className="text-theme-muted">{money(marketCap)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-theme-muted">
              Kurs und Abschluss liegen nicht sicher in derselben Währung vor. Deshalb steht hier keine Rendite.
            </p>
          )}
        </div>
      </div>

      {/* Mehrjahresvergleich */}
      {chartData.length > 1 && (
        <div className="px-6 py-5 border-t border-theme">
          <div className="flex items-center justify-between gap-x-4 gap-y-2 flex-wrap mb-4">
            <p className="text-sm font-medium text-theme-primary">Vergleich über die Jahre</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
              {SERIES.map(s => (
                <span key={s.key} className="flex items-center gap-1.5 text-xs text-theme-secondary">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="var(--color-divider)" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tickFormatter={(v: number) => compact(v, 0)}
                />
                {hasNegative && <ReferenceLine y={0} stroke="var(--color-text-muted)" strokeWidth={1} />}
                <Tooltip
                  cursor={{ fill: 'var(--color-divider)', opacity: 0.4 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0].payload
                    return (
                      <div className="bg-theme-card border border-theme rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-xs text-theme-muted mb-1.5">Geschäftsjahr {label}</p>
                        {SERIES.map(s => (
                          <div key={s.key} className="flex items-center gap-2 text-xs mt-1">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                            <span className="text-theme-secondary flex-1">{s.label}</span>
                            <span className="text-theme-primary font-semibold tabular-nums ml-3">{money(row[s.key])}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                {SERIES.map(s => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    radius={hasNegative ? [4, 4, 4, 4] : [4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Methode */}
      <div className="px-6 py-4 border-t border-theme bg-theme-secondary/20 text-xs text-theme-muted leading-relaxed space-y-2">
        <p>
          Den Erhaltungs-Capex weist kein Unternehmen aus. Nach der Methode von Bruce Greenwald wird vom gesamten Capex
          der Teil abgezogen, der in Wachstum floss: durchschnittliche Sachanlagen je Umsatz
          {latest.capitalIntensity !== null ? ` (${Math.round(latest.capitalIntensity * 100)} %)` : ''} mal
          Umsatzzuwachs.
          {rawMaintenance !== null && (
            <>
              {' '}
              Im Geschäftsjahr {latest.period}: {money(latest.capex)} Capex minus {money(latest.growthCapex)} Wachstum
              gleich {money(rawMaintenance)}.
            </>
          )}
          {latest.smoothingYears > 1 && (
            <>
              {' '}
              Angesetzt ist der Durchschnitt der letzten {latest.smoothingYears} Jahre ({money(latest.maintenanceCapex)}),
              weil Buffett vom durchschnittlich nötigen Capex spricht.
            </>
          )}{' '}
          Aktienvergütung bleibt als Kosten im Nettogewinn, Veränderungen im Working Capital bleiben außen vor.
        </p>
        {allGrowth && (
          <p className="text-theme-secondary">
            Bei so starkem Wachstum zählt die Methode fast den gesamten Capex als Wachstum. Die Owner Earnings fallen
            hier eher zu hoch aus.
          </p>
        )}
        <Link
          href={`/analyse/dcf?ticker=${encodeURIComponent(ticker.toUpperCase())}&basis=owner-earnings`}
          className="inline-block text-brand hover:underline"
        >
          Mit Owner Earnings im DCF-Rechner bewerten →
        </Link>
      </div>
    </div>
  )
}
