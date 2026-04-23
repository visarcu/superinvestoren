// src/app/admin/financials/company/[ticker]/page.tsx
// Detail-Übersicht pro Firma: alle eingepflegten Statements, Löschen-Button
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface Statement {
  id: string
  fiscalYear: number
  fiscalPeriod: string
  periodEnd: string
  reportDate: string | null
  revenue: number | null
  operatingIncome: number | null
  netIncome: number | null
  totalAssets: number | null
  freeCashFlow: number | null
  currency: string
  verified: boolean
  sourceUrl: string | null
  enteredByEmail: string | null
  updatedAt: string
}

export default function CompanyDetailPage({ params }: { params: { ticker: string } }) {
  const { ticker } = params
  const decodedTicker = decodeURIComponent(ticker)
  const [statements, setStatements] = useState<Statement[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

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
    await load(session.access_token)
  }

  async function load(accessToken: string) {
    setLoading(true)
    try {
      // Load statements
      const stmtRes = await fetch(`/api/admin/financials?ticker=${encodeURIComponent(decodedTicker)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const stmtData = await stmtRes.json()
      setStatements(stmtData.statements)

      // Load company info (first statement has company embedded, else use direct fetch)
      if (stmtData.statements[0]?.company) {
        setCompany(stmtData.statements[0].company)
      } else {
        const res = await fetch(`/api/v1/financials/${encodeURIComponent(decodedTicker)}`)
        const data = await res.json()
        setCompany(data)
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function deleteStatement(id: string) {
    if (!token) return
    if (!confirm('Statement wirklich löschen?')) return
    const res = await fetch(`/api/admin/financials/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setStatements(s => s.filter(x => x.id !== id))
    } else {
      alert('Löschen fehlgeschlagen')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
        <Link href="/auth/signin" className="underline">Einloggen</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/admin/financials" className="text-sm text-white/50 hover:text-white/80">← Zurück</Link>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{company?.nameShort ?? decodedTicker}</h1>
              <p className="text-sm text-white/50 mt-1 font-mono">{decodedTicker} — {company?.currency ?? 'EUR'}</p>
            </div>
            <Link
              href={`/admin/financials/new?ticker=${encodeURIComponent(decodedTicker)}`}
              className="px-4 py-2 bg-white text-black rounded-md font-medium"
            >
              + Neuer Bericht
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-white/50">Laden...</div>
        ) : statements.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-lg">
            <p className="text-white/50">Noch keine Berichte eingepflegt.</p>
            <Link
              href={`/admin/financials/new?ticker=${encodeURIComponent(decodedTicker)}`}
              className="inline-block mt-4 px-4 py-2 bg-white text-black rounded-md"
            >
              Ersten Bericht anlegen
            </Link>
          </div>
        ) : (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr className="text-left">
                  <Th>Periode</Th>
                  <Th>Period End</Th>
                  <Th className="text-right">Umsatz</Th>
                  <Th className="text-right">EBIT</Th>
                  <Th className="text-right">Net Income</Th>
                  <Th className="text-right">FCF</Th>
                  <Th>Quelle</Th>
                  <Th>Aktionen</Th>
                </tr>
              </thead>
              <tbody>
                {statements.map(s => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                    <Td className="font-mono">
                      {s.fiscalPeriod}-{s.fiscalYear}
                      {s.verified && <span className="ml-2 text-emerald-400">✓</span>}
                    </Td>
                    <Td className="text-white/60 font-mono text-xs">{new Date(s.periodEnd).toISOString().slice(0,10)}</Td>
                    <Td className="text-right">{fmt(s.revenue)}</Td>
                    <Td className="text-right">{fmt(s.operatingIncome)}</Td>
                    <Td className="text-right">{fmt(s.netIncome)}</Td>
                    <Td className="text-right">{fmt(s.freeCashFlow)}</Td>
                    <Td>
                      {s.sourceUrl ? (
                        <a href={s.sourceUrl} target="_blank" rel="noopener" className="text-white/70 underline text-xs">PDF ↗</a>
                      ) : <span className="text-white/30">—</span>}
                    </Td>
                    <Td>
                      <button
                        onClick={() => deleteStatement(s.id)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Löschen
                      </button>
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

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(n)
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wide ${className}`}>{children}</th>
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>
}
