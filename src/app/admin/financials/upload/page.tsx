// src/app/admin/financials/upload/page.tsx
// Upload ESEF ZIP → Parse → Review → Save Workflow
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface ParsedPeriod {
  periodEnd: string
  fiscalYear: number
  currency?: string
  fields: Record<string, number>
  rawFacts: Record<string, any>
}

interface ParseResult {
  filename: string
  size: number
  entityLei?: string
  matchedCompany?: {
    ticker: string
    name: string
    nameShort: string
    currency: string
  } | null
  periods: ParsedPeriod[]
  stats: {
    totalFacts: number
    mappedFacts: number
    skippedFactsWithDimensions: number
  }
  warnings: string[]
}

const FIELD_LABELS: Record<string, string> = {
  revenue: 'Umsatz',
  costOfRevenue: 'Umsatzkosten',
  grossProfit: 'Bruttoergebnis',
  operatingIncome: 'EBIT',
  netIncome: 'Nettogewinn',
  eps: 'EPS',
  epsDiluted: 'EPS verw.',
  rAndD: 'F&E',
  sgA: 'Vertrieb & Verw.',
  interestExpense: 'Zinsaufwand',
  incomeTax: 'Ertragsteuern',
  cashAndEquivalents: 'Liquide Mittel',
  inventory: 'Vorräte',
  receivables: 'Forderungen',
  totalCurrentAssets: 'Umlaufvermögen',
  ppE: 'Sachanlagen',
  goodwill: 'Goodwill',
  totalAssets: 'Bilanzsumme',
  totalLiabilities: 'Verbindlichkeiten',
  shareholdersEquity: 'Eigenkapital',
  operatingCashFlow: 'Op. Cashflow',
  capex: 'Capex',
  freeCashFlow: 'Free Cashflow',
  dividendsPaid: 'Dividenden',
  shareRepurchases: 'Aktienrückkäufe',
}

export default function UploadEsefPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [selectedPeriods, setSelectedPeriods] = useState<Set<number>>(new Set())
  const [ticker, setTicker] = useState<string>('')
  const [companies, setCompanies] = useState<Array<{ ticker: string; nameShort: string }>>([])

  useEffect(() => {
    bootstrap()
  }, [])

  async function bootstrap() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setToken(session.access_token)

    const res = await fetch('/api/admin/dax-companies', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setCompanies(data.companies)
    }
  }

  async function handleParse() {
    if (!file || !token) return
    setParsing(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/financials/parse-esef', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data: ParseResult = await res.json()
      setResult(data)

      // Auto-wähle aktuellsten Periode (oft "current year")
      if (data.periods.length > 0) {
        setSelectedPeriods(new Set([0])) // neueste ist zuerst (Sortierung im Parser)
      }
      if (data.matchedCompany) {
        const matched = data.matchedCompany
        setTicker(matched.ticker)
        // Defensiv: sicherstellen dass Ticker in der Optionsliste ist (falls companies noch lädt)
        setCompanies(prev => {
          if (prev.some(c => c.ticker === matched.ticker)) return prev
          return [...prev, { ticker: matched.ticker, nameShort: matched.nameShort }]
        })
      }
    } catch (err: any) {
      alert(`Parse-Fehler: ${err.message}`)
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!result || !token || !ticker) {
      alert('Bitte Ticker wählen')
      return
    }
    if (selectedPeriods.size === 0) {
      alert('Bitte mindestens eine Periode auswählen')
      return
    }

    setSaving(true)
    try {
      const indices = Array.from(selectedPeriods).sort()
      for (const idx of indices) {
        const period = result.periods[idx]
        const body: any = {
          ticker,
          fiscalYear: period.fiscalYear,
          fiscalPeriod: 'FY', // ESEF ist immer Jahresabschluss
          periodEnd: period.periodEnd,
          currency: period.currency ?? 'EUR',
          source: 'esef-upload',
          sourceUrl: result.filename,
          rawFacts: period.rawFacts,
          // Konvertiere EUR → Mio (unsere DB speichert in Mio)
          ...Object.fromEntries(
            Object.entries(period.fields).map(([k, v]) => {
              // EPS bleibt unskaliert, alles andere in Mio
              const isEps = k.toLowerCase().includes('eps')
              return [k, isEps ? v : v / 1_000_000]
            })
          ),
        }
        const res = await fetch('/api/admin/financials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(`Periode ${period.periodEnd}: ${err.error || res.status}`)
        }
      }

      alert(`✅ ${indices.length} Periode(n) gespeichert!`)
      router.push(`/admin/financials/company/${encodeURIComponent(ticker)}`)
    } catch (err: any) {
      alert(`Speichern fehlgeschlagen: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function togglePeriod(idx: number) {
    setSelectedPeriods(s => {
      const next = new Set(s)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
        <Link href="/auth/signin?redirect=/admin/financials/upload" className="underline">Einloggen</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/admin/financials" className="text-sm text-white/50 hover:text-white/80">← Zurück</Link>
          <h1 className="text-3xl font-semibold mt-2">ESEF Annual Report Upload</h1>
          <p className="text-sm text-white/50 mt-1">
            ZIP-Datei eines ESEF-Jahresfinanzberichts hochladen. Parser extrahiert automatisch
            Primary Statements (GuV, Bilanz, Cashflow).
            <span className="block mt-1 text-amber-400/80">
              ⚠️ Nur für Jahresabschluss (FY). Quartale bitte manuell eingeben.
            </span>
          </p>
        </header>

        {/* ── File Upload ── */}
        {!result && (
          <div className="border border-white/10 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".zip,.xbri,.xhtml,.html"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="block mx-auto mb-4 text-sm text-white/70"
            />
            {file && (
              <div className="text-sm text-white/60 mb-4">
                Ausgewählt: <span className="text-white">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </div>
            )}
            <button
              onClick={handleParse}
              disabled={!file || parsing}
              className="px-6 py-3 bg-white text-black rounded-md font-medium disabled:opacity-50"
            >
              {parsing ? 'Parst...' : 'Parse'}
            </button>
          </div>
        )}

        {/* ── Parse Result ── */}
        {result && (
          <>
            <div className="border border-white/10 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Stat label="Datei" value={result.filename} mono />
                <Stat label="Entity LEI" value={result.entityLei ?? '—'} mono />
                <Stat label="Facts gesamt" value={result.stats.totalFacts} />
                <Stat label="Auf Schema gemappt" value={result.stats.mappedFacts} />
              </div>
              {result.stats.skippedFactsWithDimensions > 0 && (
                <div className="text-xs text-white/40 mt-2">
                  {result.stats.skippedFactsWithDimensions} Segment-Daten übersprungen (MVP)
                </div>
              )}
              {result.warnings.length > 0 && (
                <details className="text-xs text-amber-400/70 mt-3">
                  <summary className="cursor-pointer">{result.warnings.length} Warnings</summary>
                  <ul className="mt-1 space-y-0.5 pl-4">
                    {result.warnings.map((w, i) => <li key={i}>⚠️ {w}</li>)}
                  </ul>
                </details>
              )}
            </div>

            {/* Ticker-Wahl */}
            <div className="border border-white/10 rounded-lg p-6 mb-6">
              <label className="block mb-2 text-sm font-medium">
                Ticker {result.matchedCompany && <span className="text-emerald-400 ml-2">✓ automatisch via LEI erkannt</span>}
              </label>
              <select
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white"
              >
                <option value="">— wählen —</option>
                {companies.map(c => (
                  <option key={c.ticker} value={c.ticker}>
                    {c.ticker} ({c.nameShort})
                  </option>
                ))}
              </select>
            </div>

            {/* Perioden Auswahl */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Gefundene Perioden ({result.periods.length})</h2>
              <div className="space-y-3">
                {result.periods.map((p, idx) => {
                  const selected = selectedPeriods.has(idx)
                  return (
                    <div
                      key={idx}
                      onClick={() => togglePeriod(idx)}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selected ? 'border-white/60 bg-white/5' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={selected} readOnly className="w-4 h-4" />
                          <span className="font-mono text-lg">FY {p.fiscalYear}</span>
                          <span className="text-white/50 text-sm">Period End: {p.periodEnd}</span>
                          <span className="text-white/40 text-xs">({p.currency ?? 'EUR'})</span>
                        </div>
                        <span className="text-xs text-white/50">
                          {Object.keys(p.fields).length} Felder gemappt
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-sm">
                        {Object.entries(p.fields).map(([k, v]) => {
                          const isEps = k.toLowerCase().includes('eps')
                          const label = FIELD_LABELS[k] ?? k
                          const display = isEps
                            ? v.toLocaleString('de-DE', { maximumFractionDigits: 2 })
                            : (v / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mio'
                          return (
                            <div key={k} className="flex justify-between">
                              <span className="text-white/50">{label}</span>
                              <span className="font-mono text-white/90">{display}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !ticker || selectedPeriods.size === 0}
                className="px-6 py-3 bg-white text-black rounded-md font-medium disabled:opacity-50"
              >
                {saving ? 'Speichert...' : `${selectedPeriods.size} Periode(n) speichern`}
              </button>
              <button
                onClick={() => { setResult(null); setFile(null); setSelectedPeriods(new Set()) }}
                className="px-6 py-3 border border-white/20 rounded-md"
              >
                Neue Datei
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-white/50 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''} text-white/90 truncate`}>{value}</div>
    </div>
  )
}
