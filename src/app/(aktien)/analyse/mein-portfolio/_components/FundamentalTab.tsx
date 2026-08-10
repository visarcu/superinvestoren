'use client'

// Fundamentale Kennzahlen des Depots, gewichtet nach Positionswert.
// Daten kommen aus /api/portfolio/fundamentals — ausschliesslich eigene
// SEC-XBRL- bzw. DAX-Daten. Positionen ohne Datenbasis werden ausgewiesen
// statt stillschweigend aus der Rechnung zu fallen.

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Holding } from '../_lib/types'
import type { PortfolioFundamentals, AggregatedMetric } from '@/lib/portfolio/fundamentals'

interface FundamentalTabProps {
  holdings: Holding[]
  formatCurrency: (value: number) => string
}

// ─── Formatierung ────────────────────────────────────────────────────────────

function de(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',')
}

function fmtRatio(value: number | null, suffix = ''): string {
  if (value === null) return '–'
  return `${de(value, 1)}${suffix}`
}

function fmtPercent(value: number | null): string {
  if (value === null) return '–'
  const sign = value > 0 ? '+' : ''
  return `${sign}${de(value * 100, 1)} %`
}

function fmtPercentPlain(value: number | null): string {
  if (value === null) return '–'
  return `${de(value * 100, 1)} %`
}

// ─── Bausteine ───────────────────────────────────────────────────────────────

interface MetricCellProps {
  label: string
  metric: AggregatedMetric
  format: (v: number | null) => string
  hint?: string
  tone?: (v: number) => 'good' | 'warn' | 'bad' | null
}

function MetricCell({ label, metric, format, hint, tone }: MetricCellProps) {
  const toneClass =
    metric.value !== null && tone
      ? {
          good: 'text-emerald-400',
          warn: 'text-amber-400',
          bad: 'text-red-400',
        }[tone(metric.value) ?? 'good'] ?? 'text-white/90'
      : 'text-white/90'

  return (
    <div className="bg-[#0a0a12] px-5 py-4">
      <p className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em] mb-1.5">
        {label}
      </p>
      <p className={`text-[19px] font-semibold tracking-tight tabular-nums ${metric.value === null ? 'text-white/25' : toneClass}`}>
        {format(metric.value)}
      </p>
      <p className="text-[10px] text-white/25 mt-1">
        {metric.value === null
          ? 'keine Datenbasis'
          : hint ?? `${metric.positions} ${metric.positions === 1 ? 'Position' : 'Positionen'}`}
      </p>
    </div>
  )
}

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.04]">
        <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04]">{children}</div>
      {note && <p className="px-6 py-3 text-[10px] text-white/30 leading-relaxed">{note}</p>}
    </section>
  )
}

// ─── Hauptkomponente ─────────────────────────────────────────────────────────

export default function FundamentalTab({ holdings, formatCurrency }: FundamentalTabProps) {
  const [data, setData] = useState<PortfolioFundamentals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Nur Symbol, Wert und Kurs — mehr braucht die Route nicht.
  const positions = useMemo(
    () =>
      holdings.map(h => ({
        symbol: h.symbol,
        name: h.name,
        value: h.value,
        // Notierungswährung, passend zur Berichtswährung der Fundamentaldaten.
        price: h.current_price,
      })),
    [holdings],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (positions.length === 0) {
        setData(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          if (!cancelled) setError('Nicht angemeldet.')
          return
        }

        const response = await fetch('/api/portfolio/fundamentals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ positions }),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json: PortfolioFundamentals = await response.json()
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setError('Fundamentaldaten konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [positions])

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] border-dashed p-12 text-center">
        <p className="text-[13px] font-semibold text-white/70 tracking-tight mb-1">
          Keine Positionen im Depot
        </p>
        <p className="text-[11px] text-white/30">
          Sobald du Aktien hältst, siehst du hier die Fundamentaldaten deines Depots.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] border-dashed p-12 text-center">
        <p className="text-[13px] font-semibold text-white/70 tracking-tight mb-1">
          {error ?? 'Keine Daten'}
        </p>
      </div>
    )
  }

  const { coverage } = data
  const coveredShare = coverage.totalValue > 0 ? coverage.coveredValue / coverage.totalValue : 0

  return (
    <div className="space-y-5">
      <Section
        title="Bewertung"
        note="KGV und KUV werden über die Kehrwerte gewichtet (Summe Marktwert ÷ Summe Gewinn bzw. Umsatz) — der einfache Durchschnitt würde einzelne teure Positionen massiv überbewerten. Positionen mit Verlustjahr fließen nicht ein."
      >
        <MetricCell
          label="KGV (gewichtet)"
          metric={data.peRatio}
          format={v => fmtRatio(v)}
          tone={v => (v < 15 ? 'good' : v < 30 ? 'warn' : 'bad')}
        />
        <MetricCell
          label="KUV (gewichtet)"
          metric={data.psRatio}
          format={v => fmtRatio(v)}
          tone={v => (v < 2 ? 'good' : v < 6 ? 'warn' : 'bad')}
        />
        <MetricCell
          label="FCF-Rendite"
          metric={data.fcfYield}
          format={fmtPercentPlain}
          tone={v => (v > 0.05 ? 'good' : v > 0.02 ? 'warn' : 'bad')}
        />
        <MetricCell
          label="Nettomarge"
          metric={data.netMargin}
          format={fmtPercentPlain}
          tone={v => (v > 0.15 ? 'good' : v > 0.05 ? 'warn' : 'bad')}
        />
      </Section>

      <Section
        title="Wachstum"
        note="Jährliche Wachstumsrate (CAGR) über bis zu 3 Geschäftsjahre. Positionen mit Verlustjahren am Anfang oder Ende bleiben außen vor — eine Prozentzahl wäre dort nicht aussagekräftig."
      >
        <MetricCell label="Umsatz p. a." metric={data.revenueGrowth3y} format={fmtPercent} tone={v => (v > 0.1 ? 'good' : v > 0 ? 'warn' : 'bad')} />
        <MetricCell label="Gewinn p. a." metric={data.earningsGrowth3y} format={fmtPercent} tone={v => (v > 0.1 ? 'good' : v > 0 ? 'warn' : 'bad')} />
        <MetricCell
          label="Nettoverschuldung / FCF"
          metric={data.netDebtToFcf}
          format={v => fmtRatio(v, '×')}
          tone={v => (v < 2 ? 'good' : v < 4 ? 'warn' : 'bad')}
        />
        <MetricCell
          label="Dividendendeckung"
          metric={data.dividendCoverage}
          format={v => fmtRatio(v, '×')}
          tone={v => (v > 2 ? 'good' : v > 1 ? 'warn' : 'bad')}
        />
      </Section>

      {/* Datenbasis — bewusst prominent, nicht im Kleingedruckten. */}
      <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.04] flex items-baseline gap-2.5">
          <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">Datenbasis</h2>
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
            eigene SEC-Daten
          </span>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[12px] text-white/60">
              {coverage.coveredPositions} von {coverage.totalPositions} Positionen abgedeckt
            </p>
            <p className="text-[12px] font-semibold text-white/90 tabular-nums">
              {de(coveredShare * 100, 0)} % des Depotwerts
            </p>
          </div>

          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400/70"
              style={{ width: `${Math.min(100, Math.max(0, coveredShare * 100))}%` }}
            />
          </div>

          {coverage.missing.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em] mb-2">
                Ohne Fundamentaldaten
              </p>
              <ul className="space-y-1">
                {coverage.missing.map(m => (
                  <li key={m.symbol} className="flex items-baseline justify-between gap-3 text-[11px]">
                    <span className="text-white/60 truncate">
                      {m.symbol}
                      <span className="text-white/25"> · {m.name}</span>
                    </span>
                    <span className="text-white/25 shrink-0 tabular-nums">
                      {formatCurrency(m.value)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-white/30 leading-relaxed mt-3">
                Abgedeckt sind US-Titel aus SEC-Filings sowie eingepflegte DAX-Werte. Für übrige
                europäische Aktien und ETFs liegen noch keine eigenen Fundamentaldaten vor — sie
                sind aus allen Kennzahlen oben herausgerechnet.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
