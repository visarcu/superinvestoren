// Öffentlicher IPO-Kalender — eigene Daten direkt aus SEC EDGAR
// Quelle: Form 424B4 (Pricing) + S-1/S-1A (Pending), keine FMP/EODHD-Abhängigkeit.
// /ipo-calendar
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { ArrowRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface IpoItem {
  cik: string
  ticker: string | null
  companyName: string
  filingType: string
  filingDate: string
  accessionNo: string
  filingUrl: string
  status: 'priced' | 'pending' | 'effective'
  sicCode: string | null
  bizState: string | null
  bizLocation: string | null
  source: string
}

type StatusFilter = 'all' | 'priced' | 'pending'

// SIC-Code → grobe Sektor-Bezeichnung (Top-Level Industries)
function sicToSector(sic: string | null): string | null {
  if (!sic) return null
  const code = parseInt(sic, 10)
  if (isNaN(code)) return null
  if (code >= 100 && code <= 999) return 'Agriculture'
  if (code >= 1000 && code <= 1499) return 'Mining'
  if (code >= 1500 && code <= 1799) return 'Construction'
  if (code >= 2000 && code <= 3999) return 'Manufacturing'
  if (code >= 4000 && code <= 4999) return 'Transport / Utilities'
  if (code >= 5000 && code <= 5199) return 'Wholesale'
  if (code >= 5200 && code <= 5999) return 'Retail'
  if (code >= 6000 && code <= 6799) return 'Finance'
  if (code >= 7000 && code <= 8999) return 'Services'
  if (code >= 9100 && code <= 9999) return 'Public Admin'
  return null
}

function formatGermanDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function groupByDate(items: IpoItem[]): { date: string; items: IpoItem[] }[] {
  const map = new Map<string, IpoItem[]>()
  for (const it of items) {
    if (!map.has(it.filingDate)) map.set(it.filingDate, [])
    map.get(it.filingDate)!.push(it)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }))
}

export default function IpoCalendarPage() {
  const [items, setItems] = useState<IpoItem[]>([])
  const [counts, setCounts] = useState<{ total: number; priced: number; pending: number }>({
    total: 0, priced: 0, pending: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch('/api/v1/ipos?limit=200')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        if (cancelled) return
        setItems(data.data || [])
        setCounts(data.counts || { total: 0, priced: 0, pending: 0 })
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Fehler beim Laden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter(it => it.status === filter)
  }, [items, filter])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">IPO-Kalender</h1>
          <p className="mt-2 text-[14px] text-white/55 max-w-2xl">
            Aktuelle und kommende US-Börsengänge — direkt aus SEC EDGAR. Form 424B4 = bereits gepricte IPOs (Listing in den nächsten Tagen), S-1 und S-1/A = geplante Listings.
          </p>
          <p className="mt-1 text-[11px] text-white/30">
            Quelle: SEC EDGAR · Eigene Daten, kein Drittanbieter
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/[0.06]">
          <FilterTab
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="Alle"
            count={counts.total}
          />
          <FilterTab
            active={filter === 'priced'}
            onClick={() => setFilter('priced')}
            label="Gepriced"
            count={counts.priced}
            accent="emerald"
          />
          <FilterTab
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
            label="Geplant"
            count={counts.pending}
            accent="blue"
          />
        </div>

        {/* Loading / Error / Empty */}
        {loading && (
          <div className="flex items-center gap-2 text-[13px] text-white/40 py-12 justify-center">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Lade IPO-Daten…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] px-4 py-3 text-[13px] text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && grouped.length === 0 && (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-6 py-12 text-center">
            <p className="text-[14px] text-white/55">
              Keine IPOs in diesem Zeitraum gefunden.
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              Der Kalender wird wöchentlich aktualisiert.
            </p>
          </div>
        )}

        {/* Grouped List */}
        {!loading && !error && grouped.length > 0 && (
          <div className="space-y-8">
            {grouped.map(group => (
              <section key={group.date}>
                <h2 className="text-[12px] font-semibold text-white/55 uppercase tracking-wider mb-3">
                  {formatGermanDate(group.date)}
                </h2>
                <div className="space-y-1.5">
                  {group.items.map(it => (
                    <IpoRow key={it.accessionNo} ipo={it} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// === Subcomponents ==========================================================

function FilterTab({
  active, onClick, label, count, accent = 'neutral',
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
  accent?: 'neutral' | 'emerald' | 'blue'
}) {
  const accentColor = active
    ? accent === 'emerald' ? 'text-emerald-300'
    : accent === 'blue' ? 'text-blue-300'
    : 'text-white'
    : 'text-white/45 hover:text-white/70'
  const borderColor = active
    ? accent === 'emerald' ? 'border-emerald-400/60'
    : accent === 'blue' ? 'border-blue-400/60'
    : 'border-white'
    : 'border-transparent'
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-2.5 text-[13px] font-medium transition-colors ${accentColor} border-b-2 -mb-px ${borderColor}`}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1.5 text-[11px] text-white/30 tabular-nums">
          {count}
        </span>
      )}
    </button>
  )
}

function IpoRow({ ipo }: { ipo: IpoItem }) {
  const sector = sicToSector(ipo.sicCode)
  const isPricedForm = ipo.status === 'priced'
  const formBadgeClass = isPricedForm
    ? 'bg-emerald-500/15 text-emerald-300/90'
    : ipo.status === 'pending'
      ? 'bg-blue-500/15 text-blue-300/90'
      : 'bg-violet-500/15 text-violet-300/90'

  return (
    <div className="group flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.10] hover:bg-white/[0.04] transition-all">
      {/* Logo / Initial */}
      {ipo.ticker ? (
        <Logo ticker={ipo.ticker} alt={ipo.ticker} className="w-9 h-9" padding="none" />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
          <span className="text-[12px] font-semibold text-white/60">
            {ipo.companyName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[13px] font-semibold text-white truncate">
            {ipo.companyName}
          </p>
          {ipo.ticker && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70 font-semibold flex-shrink-0">
              {ipo.ticker}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className={`uppercase tracking-wider px-1.5 py-0.5 rounded text-[9px] font-semibold ${formBadgeClass}`}>
            {ipo.filingType}
          </span>
          {sector && <span>{sector}</span>}
          {ipo.bizLocation && (
            <>
              <span className="text-white/20">·</span>
              <span>{ipo.bizLocation}</span>
            </>
          )}
        </div>
      </div>

      {/* Filing-Link */}
      <a
        href={ipo.filingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 text-[11px] text-white/40 hover:text-white/80 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05] flex items-center gap-1"
      >
        SEC
        <ArrowRightIcon className="w-3 h-3" />
      </a>
    </div>
  )
}
