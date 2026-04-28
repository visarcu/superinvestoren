'use client'

// Insider-Tab: SEC Form 4 Insider-Trades aus eigener API.
// Summary-Strip + Filter-Pills + Tabelle. Premium-Gate für Free-User nach 5 Trades.
import React, { useEffect, useMemo, useState } from 'react'
import FeyPremiumGate from '../FeyPremiumGate'
import { fmt } from '../../_lib/format'

interface InsiderTabProps {
  ticker: string
  isPremium: boolean
  userLoading: boolean
}

interface InsiderTrade {
  insiderName: string
  title: string | null
  type: 'buy' | 'sell' | 'other' | null
  transactionCode: string | null
  transactionDate: string | null
  filingDate: string | null
  shares: number | null
  pricePerShare: number | null
  totalValue: number | null
  sharesAfter: number | null
  securityType: string | null
  filingUrl: string | null
}

interface InsiderResponse {
  ticker: string
  trades: InsiderTrade[]
  count: number
  summary: {
    totalBuys: number
    totalSells: number
    buyVolume: number
    sellVolume: number
  } | null
}

type Filter = 'all' | 'buy' | 'sell'

const FREE_LIMIT = 5

function fmtDate(d: string | null): string {
  if (!d) return '–'
  try {
    return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
  } catch {
    return d
  }
}

function fmtShares(v: number | null): string {
  if (v == null) return '–'
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2).replace('.', ',')}M`
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1).replace('.', ',')}K`
  return v.toLocaleString('de-DE')
}

export default function InsiderTab({ ticker, isPremium, userLoading }: InsiderTabProps) {
  const [data, setData] = useState<InsiderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/v1/insider-trades/${ticker}?limit=50`)
      .then(r => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(d => {
        if (!cancelled) setData(d)
      })
      .catch(e => {
        if (!cancelled) setError(typeof e === 'string' ? e : 'Fehler beim Laden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticker])

  const filtered = useMemo(() => {
    if (!data?.trades) return []
    if (filter === 'all') return data.trades
    return data.trades.filter(t => t.type === filter)
  }, [data, filter])

  const visible = isPremium ? filtered : filtered.slice(0, FREE_LIMIT)
  const hiddenCount = filtered.length - visible.length

  if (loading) {
    return (
      <div className="w-full max-w-5xl flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-5xl py-20 text-center">
        <p className="text-[13px] text-white/40">Keine Insider-Daten verfügbar für {ticker}</p>
        <p className="text-[11px] text-white/25 mt-2">SEC Form 4 wird hier nicht eingereicht oder Endpoint nicht erreichbar</p>
      </div>
    )
  }

  if (data.trades.length === 0) {
    return (
      <div className="w-full max-w-5xl py-20 text-center">
        <p className="text-[13px] text-white/40">Keine Insider-Trades in den letzten 12 Monaten</p>
      </div>
    )
  }

  const buys = data.summary?.totalBuys ?? 0
  const sells = data.summary?.totalSells ?? 0
  const buyVol = data.summary?.buyVolume ?? 0
  const sellVol = data.summary?.sellVolume ?? 0
  const net = buyVol - sellVol

  return (
    <div className="w-full max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium mb-1">
            SEC Form 4 · {ticker}
          </p>
          <h2 className="text-[18px] font-semibold text-white/90">Insider-Aktivität</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px] text-white/30">
          <span className="w-1 h-1 rounded-full bg-emerald-400/70" />
          <span className="uppercase tracking-widest font-medium">Eigene SEC-Daten</span>
        </div>
      </div>

      {/* Summary-Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 py-4 border-y border-white/[0.04]">
        <Stat label="Käufe (12M)" valueClass="text-emerald-400/90">
          {buys} · {buyVol > 0 ? `+${fmt(buyVol)}` : '–'}
        </Stat>
        <Stat label="Verkäufe (12M)" valueClass="text-red-400/90">
          {sells} · {sellVol > 0 ? `-${fmt(sellVol)}` : '–'}
        </Stat>
        <Stat label="Netto" valueClass={net >= 0 ? 'text-emerald-400/90' : 'text-red-400/90'}>
          {net >= 0 ? '+' : ''}{fmt(net)}
        </Stat>
        <Stat label="Letzter Trade">
          {fmtDate(data.trades[0]?.transactionDate ?? null)}
        </Stat>
      </div>

      {/* Filter-Pills */}
      <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] rounded-xl p-0.5 w-fit">
        {(
          [
            { key: 'all', label: 'Alle', count: data.trades.length },
            { key: 'buy', label: 'Käufe', count: buys },
            { key: 'sell', label: 'Verkäufe', count: sells },
          ] as { key: Filter; label: string; count: number }[]
        ).map(f => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                active ? 'bg-white/[0.08] text-white/90' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {f.label}
              <span className={`text-[10.5px] tabular-nums ${active ? 'text-white/45' : 'text-white/25'}`}>
                {f.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tabelle */}
      <div className="rounded-xl border border-white/[0.04] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] tabular-nums">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                <Th>Datum</Th>
                <Th className="min-w-[200px]">Insider</Th>
                <Th>Aktion</Th>
                <Th className="text-right">Shares</Th>
                <Th className="text-right">Preis</Th>
                <Th className="text-right">Gesamt</Th>
                <Th className="text-right">Bestand</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t, idx) => (
                <tr
                  key={`${t.insiderName}-${t.transactionDate}-${idx}`}
                  className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">{fmtDate(t.transactionDate)}</td>
                  <td className="px-4 py-3">
                    <p className="text-[12.5px] font-medium text-white/85 truncate max-w-[220px]">{t.insiderName}</p>
                    <p className="text-[10.5px] text-white/35 truncate max-w-[220px]">{t.title || '–'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge type={t.type} code={t.transactionCode} />
                  </td>
                  <td className="px-4 py-3 text-right text-white/80 whitespace-nowrap">{fmtShares(t.shares)}</td>
                  <td className="px-4 py-3 text-right text-white/65 whitespace-nowrap">
                    {t.pricePerShare != null
                      ? `${t.pricePerShare.toFixed(2).replace('.', ',')} $`
                      : '–'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right whitespace-nowrap font-medium ${
                      t.type === 'buy' ? 'text-emerald-400/90' : t.type === 'sell' ? 'text-red-400/90' : 'text-white/70'
                    }`}
                  >
                    {t.totalValue != null ? fmt(Math.abs(t.totalValue)) : '–'}
                  </td>
                  <td className="px-4 py-3 text-right text-white/45 whitespace-nowrap">{fmtShares(t.sharesAfter)}</td>
                  <td className="px-4 py-3 text-right">
                    {t.filingUrl ? (
                      <a
                        href={t.filingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-white/35 hover:text-white/75 transition-colors inline-flex items-center gap-1"
                        title="SEC-Filing öffnen"
                      >
                        SEC →
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium-Gate für Free-User wenn mehr Trades verfügbar */}
      {!isPremium && hiddenCount > 0 && (
        <FeyPremiumGate
          isPremium={false}
          loading={userLoading}
          feature="Insider-History"
          description={`${hiddenCount} weitere Insider-Trades für ${ticker} aus den letzten 12 Monaten — Premium-Feature.`}
        >
          <div className="h-32 rounded-xl bg-white/[0.01] border border-white/[0.04]" />
        </FeyPremiumGate>
      )}

      <p className="text-[10.5px] text-white/25 px-1">
        Daten direkt aus SEC EDGAR (Form 4) · 100% eigene Quelle, keine Drittanbieter
      </p>
    </div>
  )
}

function Stat({
  label,
  valueClass,
  children,
}: {
  label: string
  valueClass?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10.5px] uppercase tracking-wider text-white/30 font-medium">{label}</span>
      <div className={`text-[13px] font-medium tabular-nums whitespace-nowrap ${valueClass ?? 'text-white/85'}`}>
        {children}
      </div>
    </div>
  )
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-4 py-3 text-[10.5px] uppercase tracking-widest text-white/45 font-medium whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  )
}

function ActionBadge({ type, code }: { type: 'buy' | 'sell' | 'other' | null; code: string | null }) {
  if (type === 'buy') {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5 uppercase tracking-wider">
        Kauf {code ? <span className="text-emerald-400/55 normal-case font-normal">· {code}</span> : null}
      </span>
    )
  }
  if (type === 'sell') {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-0.5 uppercase tracking-wider">
        Verkauf {code ? <span className="text-red-400/55 normal-case font-normal">· {code}</span> : null}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-white/45 bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5 uppercase tracking-wider">
      {code || 'Sonstige'}
    </span>
  )
}
