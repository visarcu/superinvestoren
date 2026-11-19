'use client'

// Owner Earnings nach Buffett im Bewertungs-Tab: Herleitung des letzten Geschäftsjahres,
// Renditen auf den Börsenwert und der Mehrjahresvergleich mit Nettogewinn und Free Cashflow.
// Die Kennzahl ist eine Schätzung — deshalb wird die Rechnung vollständig offengelegt.

import React, { useMemo } from 'react'
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
import { fmt, fmtCompact, TT } from '../_lib/format'
import { priceCurrencyMatches } from '@/lib/portfolio/fundamentals'
import type { OwnerEarningsResult } from '@/lib/ownerEarnings'
import type { Period, CashFlowPeriod, Quote } from '../_lib/types'

interface OwnerEarningsCardProps {
  ticker: string
  income: Period[]
  cashflow: CashFlowPeriod[]
  ownerEarnings: OwnerEarningsResult[]
  quote: Quote | null
  financialSource: 'sec-xbrl' | 'finclue-manual' | 'no-data' | null
}

// Kategoriale Reihenfolge fest — gegen den Kartengrund #0c0c16 auf Farbsehschwäche geprüft.
const SERIES = [
  { key: 'netIncome', label: 'Nettogewinn', color: '#16a34a' },
  { key: 'ownerEarnings', label: 'Owner Earnings', color: '#8b5cf6' },
  { key: 'freeCashFlow', label: 'Free Cashflow', color: '#ea580c' },
] as const

function pct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '–'
  return `${(v * 100).toFixed(1).replace('.', ',')} %`
}

/** Kurze Achsenbeschriftung ohne Nachkommastelle — passt in eine Zeile. */
function axisLabel(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e12) return `${(v / 1e12).toFixed(1).replace('.', ',')} Bio.`
  if (a >= 1e9) return `${Math.round(v / 1e9)} Mrd.`
  if (a >= 1e6) return `${Math.round(v / 1e6)} Mio.`
  return fmtCompact(v)
}

function divide(a: number | null | undefined, b: number | null | undefined): number | null {
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return null
  }
  return a / b
}

export default function OwnerEarningsCard({
  ticker,
  income,
  cashflow,
  ownerEarnings,
  quote,
  financialSource,
}: OwnerEarningsCardProps) {
  const rows = useMemo(
    () =>
      ownerEarnings
        .map((oe, idx) => {
          const cf = cashflow[idx]
          const inc = income.find(i => i.period === oe.period)
          return {
            period: oe.period,
            oe,
            netIncome: inc?.netIncome ?? null,
            depreciation: cf?.depreciation ?? null,
            capex: cf?.capitalExpenditure != null ? Math.abs(cf.capitalExpenditure) : null,
            freeCashFlow: cf?.freeCashFlow ?? null,
            ownerEarnings: oe.ownerEarnings,
          }
        })
        .filter(r => r.ownerEarnings !== null),
    [ownerEarnings, cashflow, income]
  )

  if (rows.length === 0) return null

  const latest = rows[rows.length - 1]
  const latestReported = cashflow[cashflow.length - 1]?.period
  // Renditen nur auf das jüngste Geschäftsjahr beziehen und nur, wenn Kurs- und
  // Berichtswährung sicher zusammenpassen (sonst wären es Äpfel durch Birnen).
  const marketCap = quote?.marketCap ?? null
  const yieldsAllowed =
    latest.period === latestReported &&
    financialSource !== null &&
    financialSource !== 'no-data' &&
    priceCurrencyMatches(ticker, financialSource) &&
    typeof marketCap === 'number' &&
    marketCap > 0

  const oeYield = yieldsAllowed ? divide(latest.ownerEarnings, marketCap) : null
  const fcfYield = yieldsAllowed ? divide(latest.freeCashFlow, marketCap) : null
  const earningsYield = yieldsAllowed ? divide(latest.netIncome, marketCap) : null

  const rawMaintenance =
    latest.capex !== null && latest.oe.growthCapex !== null ? latest.capex - latest.oe.growthCapex : null

  const chartData = rows.slice(-10)
  const hasNegative = chartData.some(d =>
    SERIES.some(s => typeof d[s.key] === 'number' && (d[s.key] as number) < 0)
  )

  return (
    <section className="mb-10">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium">
            Owner Earnings · GJ {latest.period}
          </p>
          <span className="text-[9.5px] uppercase tracking-wider text-violet-300/70 border border-violet-400/20 rounded px-1.5 py-px">
            Schätzung
          </span>
        </div>
        <h2 className="text-[18px] font-semibold text-white/90">Was ein Eigentümer verdient</h2>
        <p className="text-[12.5px] text-white/40 mt-1 max-w-2xl leading-relaxed">
          Warren Buffetts Kennzahl aus dem Aktionärsbrief von 1986: der Betrag, den ein Eigentümer jedes Jahr
          entnehmen könnte, ohne die Marktstellung des Unternehmens zu schwächen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Herleitung */}
        <div className="md:col-span-3 bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
          <p className="text-[11px] text-white/30 font-medium mb-4">Herleitung</p>
          <div className="space-y-2.5 text-[13px] tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-white/50">Nettogewinn</span>
              <span className="text-white/80">{fmt(latest.netIncome)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">+ Abschreibungen</span>
              <span className="text-white/80">{fmt(latest.depreciation)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">− Erhaltungs-Capex (geschätzt)</span>
              <span className="text-white/80">
                {latest.oe.maintenanceCapex !== null ? fmt(-latest.oe.maintenanceCapex) : '–'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2.5 mt-1">
              <span className="text-white/85 font-semibold">= Owner Earnings</span>
              <span className="text-white font-semibold text-[15px]">{fmt(latest.ownerEarnings)}</span>
            </div>
          </div>
        </div>

        {/* Renditen auf den Börsenwert */}
        <div className="md:col-span-2 bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
          <p className="text-[11px] text-white/30 font-medium mb-4">Rendite auf den Börsenwert</p>
          {yieldsAllowed ? (
            <>
              <p className="text-[26px] font-bold text-white leading-none tabular-nums">{pct(oeYield)}</p>
              <p className="text-[11px] text-white/35 mt-1.5">Owner-Earnings-Rendite</p>
              <div className="space-y-2 mt-4 pt-4 border-t border-white/[0.04] text-[12.5px] tabular-nums">
                <div className="flex items-center justify-between">
                  <span className="text-white/40">Free-Cashflow-Rendite</span>
                  <span className="text-white/75">{pct(fcfYield)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40">Gewinnrendite (1/KGV)</span>
                  <span className="text-white/75">{pct(earningsYield)}</span>
                </div>
              </div>
              <p className="text-[10px] text-white/25 mt-3">Bezogen auf {fmt(marketCap)} Marktkapitalisierung</p>
            </>
          ) : (
            <p className="text-[12px] text-white/35 leading-relaxed">
              {latest.period !== latestReported
                ? `Für das jüngste Geschäftsjahr ${latestReported ?? ''} fehlen Daten zur Schätzung — eine Rendite auf den heutigen Kurs wäre irreführend.`
                : 'Kurs und Abschluss liegen nicht sicher in derselben Währung vor — deshalb keine Rendite auf den Börsenwert.'}
            </p>
          )}
        </div>
      </div>

      {/* Mehrjahresvergleich */}
      {chartData.length > 1 && (
        <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5 mt-4">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
            <p className="text-[11px] text-white/30 font-medium">Nettogewinn, Owner Earnings und Free Cashflow</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
              {SERIES.map(s => (
                <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.25)' }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={axisLabel}
                />
                {hasNegative && <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />}
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div style={TT}>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', marginBottom: '6px' }}>
                          GJ {label}
                        </p>
                        {SERIES.map(s => {
                          const v = payload[0]?.payload?.[s.key]
                          return (
                            <div
                              key={s.key}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '3px' }}
                            >
                              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
                              <span style={{ color: 'rgba(255,255,255,0.5)', flex: 1 }}>{s.label}</span>
                              <span style={{ color: '#fff', fontWeight: 600, marginLeft: '12px' }}>
                                {typeof v === 'number' ? fmt(v) : '–'}
                              </span>
                            </div>
                          )
                        })}
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
      <div className="mt-4 text-[11.5px] text-white/35 leading-relaxed space-y-1.5 max-w-3xl">
        <p>
          <span className="text-white/55">So wird geschätzt:</span> Den Erhaltungs-Capex weist kein Unternehmen aus.
          Nach der Methode von Bruce Greenwald wird vom Capex der Teil abgezogen, der in Wachstum floss:
          durchschnittliche Sachanlagen je Umsatz
          {latest.oe.capitalIntensity !== null && (
            <> ({(latest.oe.capitalIntensity * 100).toFixed(0)} %)</>
          )}{' '}
          mal Umsatzzuwachs.
          {rawMaintenance !== null && latest.capex !== null && latest.oe.growthCapex !== null && (
            <>
              {' '}
              Im GJ {latest.period}: {fmt(latest.capex)} Capex − {fmt(latest.oe.growthCapex)} Wachstum ={' '}
              {fmt(rawMaintenance)}.
            </>
          )}
          {latest.oe.smoothingYears > 1 && latest.oe.maintenanceCapex !== null && (
            <>
              {' '}
              Angesetzt ist der Durchschnitt der letzten {latest.oe.smoothingYears} Jahre (
              {fmt(latest.oe.maintenanceCapex)}), weil Buffett vom durchschnittlich nötigen Capex spricht.
            </>
          )}
        </p>
        <p>
          Aktienvergütung ist im Nettogewinn bereits als Kosten abgezogen und wird nicht zurückgerechnet.
          Veränderungen im Working Capital bleiben außen vor.
        </p>
      </div>

      <Link
        href={`/analyse/dcf-rechner?ticker=${encodeURIComponent(ticker)}&basis=owner-earnings`}
        className="inline-flex items-center gap-1.5 mt-4 text-[12.5px] text-violet-300/80 hover:text-violet-200 transition-colors"
      >
        Mit Owner Earnings im DCF-Rechner bewerten
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>
    </section>
  )
}
