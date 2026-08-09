// src/components/portfolio/UpcomingDividendsPreview.tsx
// Kompakte Vorschau der nächsten Dividenden-Zahltage aus den aktuellen
// Positionen — Gegenstück zu PortfolioEarningsPreview auf dem Dashboard.
// Datenquelle ist derselbe Endpunkt wie im Dividenden-Tab.
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { BanknotesIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import Link from 'next/link'

interface DividendEvent {
  ticker: string
  /** Ex-Datum */
  date: string
  paymentDate: string
  /** Stückdividende in Börsenwährung (GBX-Ticker bereits in GBP) */
  dividend: number
  currency?: string
  /** Stückdividende in EUR – null wenn kein Wechselkurs verfügbar war */
  dividendEur?: number | null
  frequency: string
}

interface UpcomingDividendsPreviewProps {
  holdings: { symbol: string; name?: string; quantity: number }[]
  formatCurrency: (amount: number) => string
  /** Wechsel in den Dividenden-Tab (dort läuft die Premium-Prüfung) */
  onShowAll?: () => void
  limit?: number
}

const FREQUENCY_LABELS: Record<string, string> = {
  Monthly: 'Monatlich',
  Quarterly: 'Quartalsweise',
  'Semi-Annual': 'Halbjährlich',
  Annual: 'Jährlich',
}

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })

const getDaysUntil = (value: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(value)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Heute'
  if (diffDays === 1) return 'Morgen'
  if (diffDays < 7) return `In ${diffDays} Tagen`
  if (diffDays < 14) return 'Nächste Woche'
  if (diffDays < 60) return `In ${Math.ceil(diffDays / 7)} Wochen`
  return `In ${Math.round(diffDays / 30)} Monaten`
}

function Header({ subline, onShowAll }: { subline: string; onShowAll?: () => void }) {
  return (
    <div className="px-5 py-4 border-b border-neutral-800/60 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-white tracking-tight">Anstehende Dividenden</h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">{subline}</p>
      </div>
      {onShowAll ? (
        <button
          onClick={onShowAll}
          className="text-[11px] text-neutral-400 hover:text-white transition-colors"
        >
          Alle →
        </button>
      ) : (
        <Link
          href="/analyse/dividends"
          className="text-[11px] text-neutral-400 hover:text-white transition-colors"
        >
          Alle →
        </Link>
      )}
    </div>
  )
}

export default function UpcomingDividendsPreview({
  holdings,
  formatCurrency,
  onShowAll,
  limit = 5,
}: UpcomingDividendsPreviewProps) {
  const [dividends, setDividends] = useState<DividendEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Stückzahlen je Symbol summieren: in der "Alle Depots"-Ansicht liegt dieselbe
  // Aktie in mehreren Depots und darf nicht nur mit einer Teilmenge gerechnet werden.
  const positions = useMemo(() => {
    const map = new Map<string, { quantity: number; name?: string }>()
    holdings.forEach(h => {
      if (!h.symbol) return
      const existing = map.get(h.symbol)
      if (existing) existing.quantity += h.quantity
      else map.set(h.symbol, { quantity: h.quantity, name: h.name })
    })
    return map
  }, [holdings])

  const symbolKey = useMemo(() => [...positions.keys()].sort().join(','), [positions])

  useEffect(() => {
    if (!symbolKey) {
      setDividends([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`/api/dividends-calendar?tickers=${encodeURIComponent(symbolKey)}`)
      .then(r => (r.ok ? r.json() : []))
      .then((data: DividendEvent[]) => {
        if (cancelled) return
        const today = todayISO()
        // Maßgeblich ist der Zahltag, nicht das Ex-Datum — dazwischen liegen oft
        // Wochen (gleiche Logik wie im Dividenden-Tab).
        const relevantDate = (d: DividendEvent) => d.paymentDate || d.date
        const nextPerTicker = new Map<string, DividendEvent>()
        for (const d of Array.isArray(data) ? data : []) {
          if (!(d?.dividend > 0) || relevantDate(d) < today) continue
          const current = nextPerTicker.get(d.ticker)
          if (!current || relevantDate(d) < relevantDate(current)) nextPerTicker.set(d.ticker, d)
        }
        // Pro Titel nur der nächste Zahltag: sonst füllt ein Monatszahler die
        // ganze Vorschau mit seinen sechs kommenden Terminen.
        const upcoming = [...nextPerTicker.values()]
          .sort((a, b) => relevantDate(a).localeCompare(relevantDate(b)))
          .slice(0, limit)
        setDividends(upcoming)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [symbolKey, limit])

  const expectedTotal = useMemo(
    () =>
      dividends.reduce((sum, div) => {
        const quantity = positions.get(div.ticker)?.quantity ?? 0
        return typeof div.dividendEur === 'number' ? sum + div.dividendEur * quantity : sum
      }, 0),
    [dividends, positions]
  )

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header subline="Nächste Zahltage" onShowAll={onShowAll} />
        <div className="flex items-center justify-center py-10">
          <ArrowPathIcon className="w-5 h-5 text-neutral-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (dividends.length === 0) {
    return (
      <div className="flex flex-col">
        <Header subline="Nächste Zahltage" onShowAll={onShowAll} />
        <div className="flex flex-col items-center justify-center py-10 px-5">
          <BanknotesIcon className="w-7 h-7 text-neutral-700 mx-auto mb-2" />
          <p className="text-[12px] text-neutral-500 text-center">Keine angekündigten Zahltage</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header
        subline={
          (dividends.length === 1 ? 'Nächster Zahltag' : `Nächste ${dividends.length} Zahltage`) +
          (expectedTotal > 0 ? ` · ~${formatCurrency(expectedTotal)}` : '')
        }
        onShowAll={onShowAll}
      />

      <div>
        {dividends.map((div, index) => {
          const paymentDate = div.paymentDate || div.date
          const daysUntil = getDaysUntil(paymentDate)
          const isImminent = daysUntil === 'Heute' || daysUntil === 'Morgen'
          const position = positions.get(div.ticker)
          const displayName = position?.name || div.ticker
          // Nur die in EUR umgerechnete Stückdividende darf mit der Stückzahl
          // multipliziert werden — das Portfolio rechnet durchgängig in EUR.
          const perShareEur = typeof div.dividendEur === 'number' ? div.dividendEur : null
          const expected = position && perShareEur !== null ? position.quantity * perShareEur : 0
          const frequency = FREQUENCY_LABELS[div.frequency] || ''

          return (
            <Link
              key={`${div.ticker}-${paymentDate}-${index}`}
              href={`/analyse/stocks/${div.ticker.toLowerCase()}`}
              className="flex items-center justify-between py-2.5 px-5 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Logo ticker={div.ticker} alt={displayName} className="w-7 h-7" padding="none" />
                <div className="min-w-0">
                  <span className="font-medium text-white text-[13px] block truncate">{displayName}</span>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {perShareEur !== null
                      ? `${formatCurrency(perShareEur)}/Stk`
                      : `${div.dividend.toFixed(2)} ${div.currency || ''}/Stk`.trim()}
                    {frequency ? ` · ${frequency}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                {expected > 0 ? (
                  <p className="text-[12px] font-medium text-teal-300 tabular-nums">
                    ~{formatCurrency(expected)}
                  </p>
                ) : (
                  <p className="text-[12px] font-medium text-white tabular-nums">{formatDate(paymentDate)}</p>
                )}
                <p className={`text-[10px] tabular-nums ${isImminent ? 'text-amber-400 font-medium' : 'text-neutral-500'}`}>
                  {expected > 0 ? `${formatDate(paymentDate)} · ${daysUntil}` : daysUntil}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
