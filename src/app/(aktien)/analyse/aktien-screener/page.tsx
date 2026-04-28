// /analyse/aktien-screener — Fey-Style Stock Screener
// Filter: Sektor, Marktkap, Land/Exchange, Beta, Dividende, Preis
// Daten via /api/v1/screener (FMP-Proxy)
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ScreenerResult {
  symbol: string
  name: string
  marketCap: number | null
  sector: string | null
  industry: string | null
  beta: number | null
  price: number | null
  dividendYield: number | null
  volume: number | null
  exchange: string | null
  country: string | null
}

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Communication Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Industrials',
  'Energy',
  'Basic Materials',
  'Real Estate',
  'Utilities',
] as const

const SECTORS_DE: Record<(typeof SECTORS)[number], string> = {
  Technology: 'Technologie',
  Healthcare: 'Gesundheit',
  'Financial Services': 'Finanzen',
  'Communication Services': 'Kommunikation',
  'Consumer Cyclical': 'Zyklischer Konsum',
  'Consumer Defensive': 'Basiskonsum',
  Industrials: 'Industrie',
  Energy: 'Energie',
  'Basic Materials': 'Grundstoffe',
  'Real Estate': 'Immobilien',
  Utilities: 'Versorger',
}

const COUNTRIES = [
  { code: '', label: 'Alle' },
  { code: 'US', label: 'USA' },
  { code: 'DE', label: 'Deutschland' },
  { code: 'GB', label: 'UK' },
  { code: 'FR', label: 'Frankreich' },
  { code: 'CH', label: 'Schweiz' },
  { code: 'JP', label: 'Japan' },
  { code: 'CN', label: 'China' },
] as const

const MCAP_PRESETS = [
  { label: 'Alle', value: 0 },
  { label: '> 1 Mrd.', value: 1_000_000_000 },
  { label: '> 10 Mrd.', value: 10_000_000_000 },
  { label: '> 100 Mrd.', value: 100_000_000_000 },
  { label: '> 1 Bio.', value: 1_000_000_000_000 },
] as const

function fmtMcap(v: number | null): string {
  if (!v) return '–'
  if (v >= 1e12) return `${(v / 1e12).toFixed(2).replace('.', ',')} Bio.`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} Mrd.`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} Mio.`
  return v.toLocaleString('de-DE')
}

function fmtPrice(v: number | null): string {
  if (v == null) return '–'
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SparklesIcon() {
  return (
    <svg className="w-5 h-5 text-violet-300/85" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function fmtVolume(v: number | null): string {
  if (!v) return '–'
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString('de-DE')
}

export default function AktienScreenerPage() {
  const router = useRouter()
  const [sector, setSector] = useState<string>('')
  const [country, setCountry] = useState<string>('')
  const [mcapMin, setMcapMin] = useState<number>(10_000_000_000) // Default 10 Mrd.
  const [betaMax, setBetaMax] = useState<string>('')
  const [dividendMin, setDividendMin] = useState<string>('')
  const [results, setResults] = useState<ScreenerResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // AI-Search State
  const [aiQuery, setAiQuery] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHint, setAiHint] = useState<string | null>(null)

  const runAiSearch = async (override?: string) => {
    const q = (override ?? aiQuery).trim()
    if (!q) return
    setAiLoading(true)
    setAiHint(null)
    try {
      const res = await fetch('/api/stock-finder/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      if (!res.ok) throw new Error('AI-Suche fehlgeschlagen')
      const data = await res.json()
      const f = data.filters || {}

      // Filter-State setzen (Parse-Output → unsere Filter-State)
      setSector(typeof f.sector === 'string' ? f.sector : '')
      setCountry(typeof f.country === 'string' ? f.country : '')
      setMcapMin(typeof f.marketCapMin === 'number' ? f.marketCapMin : 0)
      setBetaMax(typeof f.betaMax === 'number' ? String(f.betaMax) : '')
      // Hinweis wenn AI thematische Suche (kann Filter allein nicht voll abbilden)
      if (f.isThematic && f.thematicTopic) {
        setAiHint(`Thematische Filter aktiv: „${f.thematicTopic}" — basis-Filter unten gesetzt`)
      }
    } catch (e) {
      setAiHint(e instanceof Error ? e.message : 'AI-Suche fehlgeschlagen')
    } finally {
      setAiLoading(false)
    }
  }

  // Sortierung
  type SortKey = 'marketCap' | 'price' | 'beta' | 'dividendYield' | 'volume'
  const [sortKey, setSortKey] = useState<SortKey>('marketCap')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Fetch results bei Filter-Änderung (debounced ~250ms)
  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(async () => {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (sector) params.set('sector', sector)
      if (country) params.set('country', country)
      if (mcapMin > 0) params.set('marketCapMoreThan', String(mcapMin))
      if (betaMax) params.set('betaLowerThan', betaMax)
      if (dividendMin) params.set('dividendMoreThan', dividendMin)
      params.set('limit', '200')

      try {
        const res = await fetch(`/api/v1/screener?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) setResults(data.results || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Fehler beim Laden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [sector, country, mcapMin, betaMax, dividendMin])

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      const va = a[sortKey] ?? 0
      const vb = b[sortKey] ?? 0
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [results, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // Active-Filter-Detection für Reset-Button
  const hasActiveFilters =
    sector !== '' || country !== '' || mcapMin !== 10_000_000_000 || betaMax !== '' || dividendMin !== ''

  const resetFilters = () => {
    setSector('')
    setCountry('')
    setMcapMin(10_000_000_000)
    setBetaMax('')
    setDividendMin('')
    setAiQuery('')
    setAiHint(null)
  }

  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      {/* Header — Hero-Style mit größerer Typo */}
      <header className="px-6 sm:px-10 pt-8 pb-2 max-w-7xl mx-auto w-full">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <Link
              href="/analyse/home"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors mt-1 flex-shrink-0"
              aria-label="Zurück"
            >
              <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium mb-1.5">
                Tools · Aktien-Screener
              </p>
              <h1 className="text-[26px] font-semibold text-white tracking-tight">
                Finde die nächste Aktie für dein Depot
              </h1>
              <p className="text-[13px] text-white/40 mt-1">
                Filtere nach Marktkap, Sektor, Beta und Dividende — oder frag in natürlicher Sprache
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 mt-1">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-[11.5px] text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Filter zurücksetzen
              </button>
            )}
            <div className="text-right">
              <p className="text-[20px] font-semibold text-white/85 tabular-nums leading-none">
                {loading ? '…' : sorted.length.toLocaleString('de-DE')}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mt-1">
                Treffer
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* AI-Search Bar */}
      <div className="px-6 sm:px-10 pt-2 pb-4 max-w-7xl mx-auto w-full">
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.015] p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/15 to-emerald-500/15 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
              <SparklesIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] uppercase tracking-widest text-white/35 font-medium mb-1">
                AI-Suche · Beta
              </p>
              <input
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') runAiSearch()
                }}
                placeholder='z.B. "Tech mit Dividende über 2%" oder "Halbleiter unter 100 Mrd."'
                disabled={aiLoading}
                className="w-full bg-transparent text-[14px] text-white/90 placeholder:text-white/25 focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => runAiSearch()}
              disabled={aiLoading || !aiQuery.trim()}
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-[12.5px] text-white/85 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              {aiLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                  Übersetze…
                </>
              ) : (
                <>Filter setzen →</>
              )}
            </button>
          </div>

          {/* Vorschläge */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pl-12">
            {[
              'Halbleiter mit Wachstum',
              'Banken unter KGV 12',
              'Mega-Cap Tech mit Dividende',
              'Penny Stocks im S&P 500',
            ].map(s => (
              <button
                key={s}
                onClick={() => {
                  setAiQuery(s)
                  runAiSearch(s)
                }}
                disabled={aiLoading}
                className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-white/45 hover:text-white/75 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>

          {aiHint && (
            <p className="text-[11px] text-white/45 mt-2 pl-12">
              <span className="text-amber-300/70">●</span> {aiHint}
            </p>
          )}
        </div>
      </div>

      {/* Filter-Bar */}
      <div className="px-6 sm:px-10 py-3 max-w-7xl mx-auto w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Sektor */}
        <FilterField label="Sektor">
          <select
            value={sector}
            onChange={e => setSector(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12.5px] text-white/85 focus:outline-none focus:border-white/[0.18] hover:bg-white/[0.06] transition-colors"
          >
            <option value="">Alle</option>
            {SECTORS.map(s => (
              <option key={s} value={s} className="bg-[#0c0c16] text-white">
                {SECTORS_DE[s]}
              </option>
            ))}
          </select>
        </FilterField>

        {/* Land */}
        <FilterField label="Land">
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12.5px] text-white/85 focus:outline-none focus:border-white/[0.18] hover:bg-white/[0.06] transition-colors"
          >
            {COUNTRIES.map(c => (
              <option key={c.code || 'all'} value={c.code} className="bg-[#0c0c16] text-white">
                {c.label}
              </option>
            ))}
          </select>
        </FilterField>

        {/* Marktkap */}
        <FilterField label="Marktkap. min.">
          <select
            value={mcapMin}
            onChange={e => setMcapMin(Number(e.target.value))}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12.5px] text-white/85 focus:outline-none focus:border-white/[0.18] hover:bg-white/[0.06] transition-colors"
          >
            {MCAP_PRESETS.map(p => (
              <option key={p.value} value={p.value} className="bg-[#0c0c16] text-white">
                {p.label}
              </option>
            ))}
          </select>
        </FilterField>

        {/* Beta max */}
        <FilterField label="Beta max.">
          <input
            type="number"
            step="0.1"
            placeholder="z.B. 1,5"
            value={betaMax}
            onChange={e => setBetaMax(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12.5px] text-white/85 placeholder:text-white/25 focus:outline-none focus:border-white/[0.18] hover:bg-white/[0.06] transition-colors"
          />
        </FilterField>

        {/* Dividende min */}
        <FilterField label="Dividende min. ($)">
          <input
            type="number"
            step="0.1"
            placeholder="z.B. 1"
            value={dividendMin}
            onChange={e => setDividendMin(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12.5px] text-white/85 placeholder:text-white/25 focus:outline-none focus:border-white/[0.18] hover:bg-white/[0.06] transition-colors"
          />
        </FilterField>
      </div>

      {/* Results */}
      <div className="px-6 sm:px-10 pb-32 max-w-7xl mx-auto w-full">
        {error ? (
          <div className="py-20 text-center text-[13px] text-red-400/80">{error}</div>
        ) : loading ? (
          <div className="py-32 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-[13px] text-white/40">Keine Aktien für diese Filter gefunden</p>
            <p className="text-[11px] text-white/25 mt-2">Probier weniger restriktive Filter</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.04] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] tabular-nums">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                    <th className="text-left px-5 py-3.5 text-[10.5px] uppercase tracking-widest text-white/45 font-medium min-w-[240px]">
                      Aktie
                    </th>
                    <SortHeader active={sortKey === 'marketCap'} dir={sortDir} onClick={() => toggleSort('marketCap')}>
                      Marktkap.
                    </SortHeader>
                    <SortHeader active={sortKey === 'price'} dir={sortDir} onClick={() => toggleSort('price')}>
                      Preis
                    </SortHeader>
                    <SortHeader active={sortKey === 'beta'} dir={sortDir} onClick={() => toggleSort('beta')}>
                      Beta
                    </SortHeader>
                    <SortHeader active={sortKey === 'dividendYield'} dir={sortDir} onClick={() => toggleSort('dividendYield')}>
                      Div. %
                    </SortHeader>
                    <SortHeader active={sortKey === 'volume'} dir={sortDir} onClick={() => toggleSort('volume')}>
                      Volumen
                    </SortHeader>
                    <th className="text-left px-5 py-3.5 text-[10.5px] uppercase tracking-widest text-white/45 font-medium">
                      Sektor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 200).map(r => (
                    <tr
                      key={r.symbol}
                      onClick={() => router.push(`/analyse/aktien/${r.symbol}`)}
                      className="border-t border-white/[0.03] hover:bg-white/[0.025] cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/v1/logo/${r.symbol}?size=64`}
                            alt=""
                            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.05] object-contain flex-shrink-0"
                            onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0' }}
                          />
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-semibold text-white/90 group-hover:text-white transition-colors">{r.symbol}</p>
                            <p className="text-[11px] text-white/35 truncate max-w-[200px]">{r.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/85 whitespace-nowrap font-medium">
                        {fmtMcap(r.marketCap)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/80 whitespace-nowrap">
                        {fmtPrice(r.price)} $
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/65 whitespace-nowrap">
                        {r.beta != null ? r.beta.toFixed(2).replace('.', ',') : '–'}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {r.dividendYield != null && r.dividendYield > 0 ? (
                          <span className="text-emerald-400/85">
                            {r.dividendYield.toFixed(2).replace('.', ',')}%
                          </span>
                        ) : (
                          <span className="text-white/25">–</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-white/55 whitespace-nowrap">
                        {fmtVolume(r.volume)}
                      </td>
                      <td className="px-5 py-3.5 text-white/50 text-[11.5px] whitespace-nowrap">
                        {r.sector ? SECTORS_DE[r.sector as keyof typeof SECTORS_DE] || r.sector : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="text-[10.5px] text-white/25 mt-3 px-1">
          Daten via FMP · Aktualisierung alle 5 min · Klick auf Zeile öffnet Aktien-Detail
        </p>
      </div>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium px-1">
        {label}
      </span>
      {children}
    </div>
  )
}

function SortHeader({
  children,
  active,
  dir,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <th
      onClick={onClick}
      className={`text-right px-5 py-3.5 text-[10.5px] uppercase tracking-widest font-medium cursor-pointer select-none transition-colors ${
        active ? 'text-white/85' : 'text-white/45 hover:text-white/70'
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active ? (
          <span className="text-[8px]">{dir === 'asc' ? '▲' : '▼'}</span>
        ) : (
          <span className="text-[8px] text-white/15">▾</span>
        )}
      </span>
    </th>
  )
}
