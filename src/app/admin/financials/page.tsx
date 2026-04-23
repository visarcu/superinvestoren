// src/app/admin/financials/page.tsx
// Admin-UI: DAX-Finanzdaten manuell pflegen.
// Übersicht aller 40 Firmen mit "zuletzt berichtet"-Status + Quick-Entry Form.
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface Company {
  id: string
  ticker: string
  name: string
  nameShort: string | null
  sector: string | null
  currency: string
  fiscalYearEnd: string
  irUrl: string | null
  reportsUrl: string | null
  nextEarningsDate: string | null
  lastReportedQ: string | null
  stmtCount: number
  latestPeriod: string | null
  statements: Array<{
    id: string
    fiscalYear: number
    fiscalPeriod: string
    periodEnd: string
    verified: boolean
    revenue: number | null
    netIncome: number | null
  }>
}

export default function AdminFinancialsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'missing' | 'outdated'>('all')

  useEffect(() => {
    bootstrap()
  }, [])

  async function bootstrap() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }
    setToken(session.access_token)
    setUserEmail(session.user.email ?? null)
    await loadCompanies(session.access_token)
  }

  async function loadCompanies(accessToken: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dax-companies', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setCompanies(data.companies)
    } catch (err: any) {
      console.error(err)
      alert(`Fehler beim Laden: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const monthsAgo3 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const filtered = companies.filter(c => {
    if (filter === 'missing') return c.stmtCount === 0
    if (filter === 'outdated') {
      const latest = c.statements[0]
      if (!latest) return true
      return new Date(latest.periodEnd) < monthsAgo3
    }
    return true
  })

  const stats = {
    total: companies.length,
    withData: companies.filter(c => c.stmtCount > 0).length,
    totalStatements: companies.reduce((n, c) => n + c.stmtCount, 0),
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-4">Admin Login erforderlich</h1>
          <p className="text-white/60 mb-6">Bitte einloggen um auf den Admin-Bereich zuzugreifen.</p>
          <Link href="/auth/signin?redirect=/admin/financials" className="px-4 py-2 bg-white text-black rounded-md">
            Einloggen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">DAX Financial Data</h1>
              <p className="text-sm text-white/50 mt-1">Manuell gepflegte eigene Finanzdaten — {userEmail}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/financials/upload"
                className="px-4 py-2 bg-emerald-500 text-black rounded-md font-medium hover:bg-emerald-400"
              >
                ↑ ESEF hochladen
              </Link>
              <Link
                href="/admin/financials/new"
                className="px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-white/90"
              >
                + Manuell anlegen
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat label="DAX-Firmen" value={stats.total} />
            <Stat label="Mit Daten" value={`${stats.withData} / ${stats.total}`} />
            <Stat label="Statements gesamt" value={stats.totalStatements} />
          </div>

          <div className="flex gap-2">
            <FilterBtn active={filter==='all'} onClick={() => setFilter('all')}>Alle ({companies.length})</FilterBtn>
            <FilterBtn active={filter==='missing'} onClick={() => setFilter('missing')}>
              Ohne Daten ({companies.filter(c => c.stmtCount === 0).length})
            </FilterBtn>
            <FilterBtn active={filter==='outdated'} onClick={() => setFilter('outdated')}>
              Veraltet (&gt;3 Monate)
            </FilterBtn>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-white/50">Laden...</div>
        ) : (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr className="text-left">
                  <Th>Ticker</Th>
                  <Th>Firma</Th>
                  <Th>Sektor</Th>
                  <Th>Zuletzt berichtet</Th>
                  <Th># Statements</Th>
                  <Th>FY End</Th>
                  <Th>Aktionen</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.ticker} className="border-b border-white/5 hover:bg-white/5">
                    <Td className="font-mono text-white/80">{c.ticker}</Td>
                    <Td>
                      <div className="font-medium">{c.nameShort}</div>
                      <div className="text-xs text-white/40">{c.name}</div>
                    </Td>
                    <Td className="text-white/60">{c.sector}</Td>
                    <Td>
                      {c.latestPeriod ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="font-mono">{c.latestPeriod}</span>
                          {c.statements[0]?.verified && <span className="text-emerald-400">✓</span>}
                        </span>
                      ) : (
                        <span className="text-amber-400">—</span>
                      )}
                    </Td>
                    <Td className="text-white/60">{c.stmtCount}</Td>
                    <Td className="text-white/40 font-mono text-xs">{c.fiscalYearEnd}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/financials/new?ticker=${encodeURIComponent(c.ticker)}`}
                          className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded"
                        >
                          + Bericht
                        </Link>
                        {c.reportsUrl && (
                          <a href={c.reportsUrl} target="_blank" rel="noopener" className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/70">
                            IR ↗
                          </a>
                        )}
                        <Link
                          href={`/admin/financials/company/${encodeURIComponent(c.ticker)}`}
                          className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/70"
                        >
                          Details
                        </Link>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-white/10 rounded-lg p-4">
      <div className="text-xs text-white/50 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  )
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-md transition ${
        active ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wide">{children}</th>
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>
}
