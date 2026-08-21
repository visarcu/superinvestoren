// src/components/portfolio/LookthroughSection.tsx
// "Durchblick": Look-Through-Analyse des Depots — was steckt WIRKLICH drin.
// Zerlegt ETFs serverseitig in Einzelaktien (via /api/portfolio/lookthrough)
// und zeigt effektive Top-Positionen, echte Regionen/Sektoren und
// ETF-Überschneidungen.
'use client'

import React, { useState } from 'react'
import { type Holding } from '@/hooks/usePortfolio'
import { useLookthrough, type UseLookthroughState, type WeightSlice, type EtfCoverageInfo } from '@/hooks/useLookthrough'
import Logo from '@/components/Logo'
import { translateSector } from '@/utils/sectorUtils'
import Link from 'next/link'
import {
  ChevronDownIcon,
  ArrowsRightLeftIcon,
  ViewfinderCircleIcon,
  GlobeAltIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  LockClosedIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const PALETTE = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#8b5cf6', '#14b8a6']

const STATUS_LABEL: Record<EtfCoverageInfo['status'], { text: string; className: string }> = {
  exact: { text: 'zerlegt', className: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  approximated: { text: 'angenähert', className: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  'no-proxy': { text: 'keine Daten', className: 'text-neutral-400 border-white/[0.14] bg-white/[0.06]' },
  'non-equity': { text: 'kein Aktienfonds', className: 'text-neutral-400 border-white/[0.14] bg-white/[0.06]' },
}

function SliceCard({
  title,
  subtitle,
  items,
  icon,
  translate,
}: {
  title: string
  subtitle: string
  items: WeightSlice[]
  icon?: React.ReactNode
  translate?: boolean
}) {
  const top = items.slice(0, 8)
  return (
    <div className="bg-theme-card border border-theme rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">{subtitle}</p>
      </div>
      {top.length > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.06] mb-4">
          {top.map((item, i) => (
            <div
              key={i}
              style={{ width: `${item.percent}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
              title={`${item.label}: ${item.percent.toFixed(1)}%`}
            />
          ))}
        </div>
      )}
      <div className="space-y-1">
        {top.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
              <span className="text-[12px] text-neutral-200 truncate">
                {translate ? translateSector(item.label) : item.label}
              </span>
            </div>
            <span className="text-[12px] font-medium text-white tabular-nums flex-shrink-0 ml-3">
              {item.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LookthroughSection({
  holdings,
  formatCurrency,
  preloaded,
}: {
  holdings: Holding[]
  formatCurrency: (amount: number) => string
  /** Vorgeladenes Ergebnis (z.B. vom Workspace) — spart den eigenen Fetch */
  preloaded?: UseLookthroughState
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCoverage, setShowCoverage] = useState(false)

  // Eigener Fetch nur, wenn kein vorgeladenes Ergebnis übergeben wurde
  // (leeres Holdings-Array → Hook lädt nichts)
  const own = useLookthrough(preloaded ? [] : holdings)
  const { result, loading, error } = preloaded ?? own

  // Ohne ETFs im Depot bringt Look-Through nichts Neues — Sektion ausblenden
  const hasEtfs = result ? result.etfCoverage.length > 0 : true
  if (!loading && (!result || !hasEtfs || error)) return null

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ViewfinderCircleIcon className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-medium text-white">Durchblick: Was du wirklich besitzt</h3>
        </div>
        <div className="space-y-2.5 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-white/[0.06]" />
          ))}
        </div>
        <p className="text-[11px] text-neutral-500 mt-4">ETFs werden in ihre Bestandteile zerlegt …</p>
      </div>
    )
  }

  if (!result) return null

  const decomposedEtfs = result.etfCoverage.filter(e => e.status === 'exact' || e.status === 'approximated')
  const hasApprox = result.etfCoverage.some(e => e.status === 'approximated')

  // ===== Premium-Teaser: Insights bleiben sichtbar, der Rest ist gesperrt =====
  if (result.premiumLocked) {
    return (
      <div className="space-y-5">
        {(result.insights?.length ?? 0) > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {result.insights.map((insight, i) => {
              const isWarn = insight.severity === 'warn'
              const Icon = isWarn ? ExclamationTriangleIcon : LightBulbIcon
              return (
                <div key={i} className={`rounded-xl border p-4 ${isWarn ? 'border-amber-500/20 bg-amber-500/[0.06]' : 'border-white/[0.06] bg-white/[0.04]'}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isWarn ? 'text-amber-400' : 'text-teal-300'}`} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white leading-snug">{insight.title}</p>
                      <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed">{insight.text}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-white/[0.04] rounded-xl border border-teal-300/15 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-400/10">
              <LockClosedIcon className="h-5 w-5 text-teal-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <ViewfinderCircleIcon className="w-4 h-4 text-teal-300" />
                Durchblick: Was du wirklich besitzt
              </h3>
              <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed">
                {decomposedEtfs.length > 0
                  ? `${decomposedEtfs.length} deiner ETFs können in ihre Einzelaktien zerlegt werden.`
                  : 'Deine ETFs können in ihre Einzelaktien zerlegt werden.'}{' '}
                Mit Premium siehst du das komplette effektive Portfolio:
              </p>
              <ul className="mt-3 space-y-1.5 text-[12px] text-neutral-300">
                <li>· Effektive Top-Positionen — direkt + über alle ETFs zusammengerechnet</li>
                <li>· ETF-Überschneidungen — wie stark sich deine Fonds doppeln</li>
                <li>· Echtes Regionen- und Sektor-Exposure nach Zerlegung</li>
                <li>· Größenklassen und gewichtetes KGV</li>
                <li>· Superinvestor-Abgleich mit deinen effektiven Positionen</li>
              </ul>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white"
              >
                Premium freischalten
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ===== Insight-Hinweise (deskriptiv, keine Empfehlungen) ===== */}
      {(result.insights?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {result.insights.map((insight, i) => {
            const isWarn = insight.severity === 'warn'
            const Icon = isWarn ? ExclamationTriangleIcon : LightBulbIcon
            return (
              <div
                key={i}
                className={`rounded-xl border p-4 ${
                  isWarn
                    ? 'border-amber-500/20 bg-amber-500/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isWarn ? 'text-amber-400' : 'text-teal-300'}`} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white leading-snug">{insight.title}</p>
                    <p className="text-[12px] text-neutral-400 mt-1 leading-relaxed">{insight.text}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== Effektive Top-Positionen ===== */}
      <div className="bg-theme-card border border-theme rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <ViewfinderCircleIcon className="w-4 h-4 text-emerald-400" />
            Durchblick: Was du wirklich besitzt
          </h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {decomposedEtfs.length} ETF{decomposedEtfs.length !== 1 ? 's' : ''} in Einzelaktien zerlegt · Analyse deckt{' '}
            {result.coveragePercent.toFixed(0)}% des Depotwerts ab
          </p>
        </div>

        <div>
          {result.topExposures.slice(0, 12).map(exposure => {
            const isOpen = expanded === exposure.symbol
            const hasBreakdown = exposure.etfCount > 0 || !!exposure.superinvestors
            return (
              <div key={`${exposure.symbol}-${exposure.isin ?? ''}`} className="border-b border-white/[0.05] last:border-b-0">
                <button
                  type="button"
                  onClick={() => hasBreakdown && setExpanded(isOpen ? null : exposure.symbol)}
                  className={`w-full flex items-center justify-between px-5 py-2.5 text-left transition-colors ${
                    hasBreakdown ? 'hover:bg-white/[0.04] cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Logo ticker={exposure.symbol} alt={exposure.symbol} className="w-7 h-7 flex-shrink-0" padding="none" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{exposure.name}</p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {exposure.directValue > 0 && exposure.etfCount > 0
                          ? `Direkt + in ${exposure.etfCount} ETF${exposure.etfCount !== 1 ? 's' : ''} enthalten`
                          : exposure.etfCount > 0
                            ? `In ${exposure.etfCount} ETF${exposure.etfCount !== 1 ? 's' : ''} enthalten`
                            : 'Direktposition'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {exposure.superinvestors && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-teal-300/20 bg-teal-400/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-teal-300"
                        title={`Von ${exposure.superinvestors.count} Superinvestoren gehalten`}
                      >
                        <UserGroupIcon className="w-3 h-3" />
                        {exposure.superinvestors.count}
                      </span>
                    )}
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-white tabular-nums">{exposure.percent.toFixed(1)}%</p>
                      <p className="text-[11px] text-neutral-500 tabular-nums">{formatCurrency(exposure.value)}</p>
                    </div>
                    {hasBreakdown && (
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-3 pt-1 bg-white/[0.03]">
                    {exposure.directValue > 0 && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[12px] text-neutral-300">Direktbestand</span>
                        <span className="text-[12px] text-white tabular-nums">{formatCurrency(exposure.directValue)}</span>
                      </div>
                    )}
                    {exposure.sources.map(source => (
                      <div key={source.etfSymbol} className="flex items-center justify-between py-1.5 border-t border-white/[0.05]">
                        <span className="text-[12px] text-neutral-400 truncate mr-3">
                          via <span className="text-neutral-300">{source.etfName}</span>
                        </span>
                        <span className="text-[12px] text-neutral-300 tabular-nums flex-shrink-0">
                          {formatCurrency(source.value)}
                        </span>
                      </div>
                    ))}
                    {exposure.superinvestors && (
                      <div className="pt-2 mt-1 border-t border-white/[0.05]">
                        <p className="text-[11px] text-teal-300/90 flex items-start gap-1.5 leading-relaxed">
                          <UserGroupIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>
                            {exposure.superinvestors.top.map(si => `${si.name} (${si.trend})`).join(', ')}
                            {exposure.superinvestors.count > exposure.superinvestors.top.length &&
                              ` und ${exposure.superinvestors.count - exposure.superinvestors.top.length} weitere Superinvestoren`}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== Echte Regionen + Sektoren ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SliceCard
          title="Echtes Regionen-Exposure"
          subtitle="Inkl. der Länderaufteilung deiner ETFs"
          items={result.regions}
          icon={<GlobeAltIcon className="w-3.5 h-3.5 text-neutral-400" />}
        />
        <SliceCard
          title="Echte Sektor-Verteilung"
          subtitle="ETFs nach Sektoren aufgelöst"
          items={result.sectors}
          icon={<ChartPieIcon className="w-3.5 h-3.5 text-neutral-400" />}
          translate
        />
      </div>

      {/* ===== Größenklassen (Size-Exposure) ===== */}
      {result.sizeExposure && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SliceCard
            title="Größenklassen (Size)"
            subtitle={`Nach Market Cap · deckt ${result.sizeExposure.coveragePercent.toFixed(0)}% des analysierten Werts ab`}
            items={result.sizeExposure.slices}
            icon={<ChartPieIcon className="w-3.5 h-3.5 text-neutral-400" />}
          />
          <div className="bg-theme-card border border-theme rounded-xl p-5 flex flex-col justify-center">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Gewichtetes KGV</p>
            <p className="text-2xl font-semibold text-white tabular-nums">
              {result.sizeExposure.weightedPE ? result.sizeExposure.weightedPE.toFixed(1) : '—'}
            </p>
            <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
              Harmonisches Mittel über deine effektiven Positionen (Direktbestände + ETF-Anteile).
              Zum Vergleich: Der Weltmarkt lag historisch meist zwischen 15 und 20.
            </p>
          </div>
        </div>
      )}

      {/* ===== ETF-Überschneidungen ===== */}
      {result.overlaps.length > 0 && (
        <div className="bg-theme-card border border-theme rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-neutral-400" />
              ETF-Überschneidungen
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Wie stark sich deine ETFs in denselben Aktien doppeln (gewichtete Überschneidung)
            </p>
          </div>
          <div>
            {result.overlaps.slice(0, 6).map((pair, i) => (
              <div key={i} className="px-5 py-3 border-b border-white/[0.05] last:border-b-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[12px] text-neutral-200 truncate mr-3">
                    {pair.nameA} <span className="text-neutral-500">×</span> {pair.nameB}
                  </p>
                  <span
                    className={`text-[13px] font-semibold tabular-nums flex-shrink-0 ${
                      pair.overlapPercent >= 60 ? 'text-red-400' : pair.overlapPercent >= 30 ? 'text-amber-400' : 'text-neutral-200'
                    }`}
                  >
                    {pair.overlapPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full ${
                      pair.overlapPercent >= 60 ? 'bg-red-400/80' : pair.overlapPercent >= 30 ? 'bg-amber-400/80' : 'bg-emerald-400/80'
                    }`}
                    style={{ width: `${Math.min(100, pair.overlapPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-500 truncate">
                  {pair.sharedCount} gemeinsame Titel, u.a. {pair.topShared.slice(0, 3).map(s => s.symbol).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Datengrundlage ===== */}
      <div className="bg-white/[0.02] rounded-xl border border-white/[0.05] px-5 py-4">
        <button
          type="button"
          onClick={() => setShowCoverage(!showCoverage)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-[12px] font-medium text-neutral-300">
            Datengrundlage: {decomposedEtfs.length} von {result.etfCoverage.length} ETFs zerlegt
            {hasApprox && ' (teils angenähert)'}
          </span>
          <ChevronDownIcon className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${showCoverage ? 'rotate-180' : ''}`} />
        </button>

        {showCoverage && (
          <div className="mt-3 space-y-2">
            {result.etfCoverage.map(etf => {
              const badge = STATUS_LABEL[etf.status]
              return (
                <div key={etf.symbol} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] text-neutral-200 truncate">{etf.name}</p>
                    {etf.note && <p className="text-[11px] text-neutral-500">{etf.note}</p>}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${badge.className}`}>
                    {badge.text}
                    {etf.proxyLabel ? ` · via ${etf.proxyLabel}` : ''}
                  </span>
                </div>
              )
            })}
            <p className="text-[11px] text-neutral-500 leading-relaxed pt-2 border-t border-white/[0.05]">
              UCITS-ETFs werden über US-Fonds mit gleichem bzw. ähnlichem Index aufgelöst — die Werte sind
              fundierte Näherungen, keine exakten Fondsdaten und keine Anlageberatung.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
