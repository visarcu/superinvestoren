// Datei: src/components/FinancialAnalysisClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GrowthTooltip from './GrowthTooltip'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'
import { ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Card from '@/components/Card'
import LoadingSpinner from '@/components/LoadingSpinner'
import { supabase } from '@/lib/supabaseClient'

// ─── Typdefinitionen ───────────────────────────────────────────────────────────
type MetricKey =
  | 'revenue'
  | 'ebitda'
  | 'eps'
  | 'freeCashFlow'
  | 'dividendPS'
  | 'sharesOutstanding'
  | 'netIncome'
  | 'cashDebt'
  | 'pe'
  | 'returnOnEquity'
  | 'stockAward'
  | 'capEx'
  | 'researchAndDevelopment'  // ✅ NEU
  | 'operatingIncome' 

type ChartKey = MetricKey

// ✅ Props Interface
interface Props {
  ticker: string
  isPremium?: boolean
  userId?: string
}

interface SupabaseSession {
  user: {
    id: string
    email: string
    app_metadata?: {
      is_premium?: boolean
    }
  }
}

// ─── Konstante Daten (Farben, Tooltips etc.) ─────────────────────────────────
const TOOLTIP_STYLES = {
  wrapperStyle: { backgroundColor: 'rgba(55,65,81,0.95)', borderColor: '#4B5563' },
  contentStyle: { backgroundColor: 'rgba(55,65,81,0.95)' },
  labelStyle: { color: '#F3F4F6' },
  itemStyle: { color: '#FFFFFF' },
}

const METRICS: {
  key: Exclude<MetricKey, 'cashDebt' | 'pe' | 'capEx'>
  name: string
  stroke: string
  fill: string
}[] = [
  { key: 'revenue', name: 'Umsatz (Mio.)', stroke: '#3b82f6', fill: 'rgba(59,130,246,0.8)' },
  { key: 'ebitda', name: 'EBITDA (Mio.)', stroke: '#10b981', fill: 'rgba(16,185,129,0.8)' },
  { key: 'eps', name: 'Gewinn je Aktie', stroke: '#f59e0b', fill: 'rgba(245,158,11,0.8)' },
  { key: 'freeCashFlow', name: 'Free Cashflow (Mio.)', stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.8)' },
  { key: 'dividendPS', name: 'Dividende je Aktie', stroke: '#22d3ee', fill: 'rgba(34,211,238,0.8)' },
  { key: 'sharesOutstanding', name: 'Shares Out. (Mrd)', stroke: '#eab308', fill: 'rgba(234,179,8,0.8)' },
  { key: 'netIncome', name: 'Nettogewinn (Mio.)', stroke: '#efb300', fill: 'rgba(239,179,0,0.8)' },
  { key: 'returnOnEquity', name: 'ROE', stroke: '#f472b6', fill: 'rgba(244,114,182,0.8)' },
]

const CASH_INFO = { dataKey: 'cash', name: 'Cash', stroke: '#6366f1', fill: 'rgba(99,102,241,0.8)' }
const DEBT_INFO = { dataKey: 'debt', name: 'Debt', stroke: '#ef4444', fill: 'rgba(239,68,68,0.8)' }

// ─── Component ────────────────────────────────────────────────────────────────
export default function FinancialAnalysisClient({ 
  ticker, 
  isPremium = false, 
  userId 
}: Props){
  const router = useRouter()
  // 1) Session‐State über Supabase:
  const [session, setSession] = useState<SupabaseSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  // 2) „Hat Premium" ableiten:
  const userHasPremium = isPremium  // ← Verwende Props statt Session

  // 3) Alle weiteren States:
  const [years, setYears] = useState<number>(10)
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
  const [data, setData] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState<boolean>(true)
  const [fullscreen, setFullscreen] = useState<ChartKey | null>(null)
  const ALL_KEYS: ChartKey[] = [...METRICS.map((m) => m.key), 'cashDebt', 'pe', 'capEx', 'researchAndDevelopment', 'operatingIncome'   ] // ← CapEx explizit hinzufügen
  const [visible, setVisible] = useState<ChartKey[]>(ALL_KEYS)

  // ─── 1) Supabase-Session holen + Listener registrieren ───────────────────────
  useEffect(() => {
    let authListener: { data: { subscription: { unsubscribe(): void } } } | null = null

    async function getSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('[FinancialAnalysisClient] getSession error:', error.message)
        // wenn kein Zugang, zurück zu /auth/signin
        router.push('/auth/signin')
        return
      }
      if (!session?.user) {
        // Wenn kein eingeloggt, auf Login umleiten
        router.push('/auth/signin')
        return
      }
      setSession(session as SupabaseSession)
      setLoadingSession(false)
    }

    getSession()

    // Listener, der Session‐Änderungen nachführt
    authListener = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        router.push('/auth/signin')
      } else if (newSession) {
        setSession(newSession as SupabaseSession)
      }
    })

    return () => {
      if (authListener) authListener.data.subscription.unsubscribe()
    }
  }, [])

  // ─── 2) Daten von Ihrer zentralisierten API + Historical Share Float ─────────────────────────────
  useEffect(() => {
    // Wir dürfen erst laden, wenn Session abgeschlossen ist
    if (loadingSession) return

    setLoadingData(true)
    const limit = period === 'annual' ? years : years * 4

    const ratioUrl = `https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=${period}&limit=${limit}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    const sharesFloatUrl = `https://financialmodelingprep.com/api/v3/historical-share-float/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`

    Promise.all([
      fetch(`/api/financials/${ticker.toUpperCase()}?period=${period}&limit=${limit}`), // ← Ihre API (Revenue, EBITDA, EPS, FreeCashFlow, Cash, Debt, NetIncome, CapEx)
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`),
      fetch(ratioUrl), // ← ROE
      fetch(sharesFloatUrl).catch(() => null), // ← Shares Outstanding separat (wie ursprünglich)
    ])
      .then(async ([rFin, rDiv, rPrice, rRatio, rSharesFloat]) => {
        const [jsonFin, jsonDiv, jsonPrice, jsonRatios] = await Promise.all([
          rFin.json(),
          rDiv.json(),
          rPrice.json(),
          rRatio.json(),
        ])

        // Historical Share Float API für KORREKTE Shares Outstanding
        let jsonSharesFloat = null
        if (rSharesFloat && rSharesFloat.ok) {
          jsonSharesFloat = await rSharesFloat.json()
          console.log('✅ Historical Share Float API loaded:', jsonSharesFloat?.slice(0, 3))
        } else {
          console.log('❌ Historical Share Float API failed, using Income Statement fallback')
        }

        console.log('🎯 Your API returned:', jsonFin.data?.slice(0, 2))

        const arr: any[] = jsonFin.data || []

        // Dividenden aufs Jahr aggregieren (nur für ergänzende dividendPS)
        const histDiv = Array.isArray(jsonDiv[0]?.historical)
          ? jsonDiv[0].historical
          : Array.isArray((jsonDiv as any).historical)
          ? (jsonDiv as any).historical
          : []
        const annualDiv: Record<string, number> = {}
        histDiv.forEach((d: any) => {
          const y = d.date.slice(0, 4)
          annualDiv[y] = (annualDiv[y] || 0) + (d.adjDividend || 0)
        })

        // Kurse pro Periode (für P/E Berechnung)
        const histPrice = Array.isArray(jsonPrice.historical) ? jsonPrice.historical : []
        const priceByPeriod: Record<string, number> = {}
        histPrice.forEach((p: any) => {
          const key = period === 'annual' ? p.date.slice(0, 4) : p.date.slice(0, 7)
          priceByPeriod[key] = p.close
        })

        // ROE aus Ratios (ergänzend)
        const roeArr: any[] = Array.isArray(jsonRatios) ? jsonRatios : []
        const roeByPeriod: Record<string, number | null> = {}
        roeArr.forEach((r) => {
          const key = period === 'annual' ? r.date.slice(0, 4) : r.date.slice(0, 7)
          roeByPeriod[key] = r.returnOnEquity != null ? r.returnOnEquity : null
        })

        // ⭐ SHARES OUTSTANDING: Separate Verarbeitung für korrekte Daten
        const sharesByPeriod: Record<string, number> = {}
        
        if (jsonSharesFloat && Array.isArray(jsonSharesFloat) && jsonSharesFloat.length > 0) {
          // Verwende Historical Share Float API (bevorzugt)
          console.log('✅ Using Historical Share Float API for shares outstanding')
          jsonSharesFloat.forEach((s) => {
            const year = s.date.slice(0, 4)
            const quarter = s.date.slice(0, 7)
            
            if (period === 'annual') {
              if (!sharesByPeriod[year] || s.date > sharesByPeriod[year + '_date']) {
                sharesByPeriod[year] = s.outstandingShares
                sharesByPeriod[year + '_date'] = s.date
              }
            } else {
              if (!sharesByPeriod[quarter] || s.date > sharesByPeriod[quarter + '_date']) {
                sharesByPeriod[quarter] = s.outstandingShares
                sharesByPeriod[quarter + '_date'] = s.date
              }
            }
          })
          console.log('📊 Processed shares by period:', Object.keys(sharesByPeriod).slice(0, 5), 'sample values:', Object.values(sharesByPeriod).slice(0, 3))
        } else {
          // Fallback: Income Statement WeightedAverageShsOut (als letzte Option)
          console.log('⚠️ Using Income Statement fallback for shares outstanding')
          // Diese Daten sind oft falsch, aber besser als gar nichts
        }

        // sortieren
        arr.sort((a, b) =>
          period === 'annual'
            ? (a.year || 0) - (b.year || 0)
            : new Date(a.quarter).getTime() - new Date(b.quarter).getTime()
        )

        // zusammenbauen - Ihre API liefert bereits ALLE Daten!
        const base = arr.map((row) => {
          const label = period === 'annual' ? String(row.year) : row.quarter
          const out: any = {
            label,
            // Alle Hauptdaten kommen aus Ihrer API:
            revenue: row.revenue || 0,
            ebitda: row.ebitda || 0,
            eps: row.eps || 0,
            freeCashFlow: row.freeCashFlow || 0,
            cash: row.cash || 0,
            debt: row.debt || 0,
            netIncome: row.netIncome || 0,
            capEx: row.capEx || 0,
            
            // ✅ NEU: Diese beiden Zeilen hinzufügen:
            researchAndDevelopment: row.researchAndDevelopment || 0,
            operatingIncome: row.operatingIncome || 0,
            
            // ⭐ SHARES OUTSTANDING: Historical Share Float API hat Priorität!
            sharesOutstanding: (() => {
              const correctShares = sharesByPeriod[label]
              const fallbackShares = row.sharesOutstanding || 0
              
              if (correctShares) {
                console.log(`✅ Using correct shares for ${label}: ${(correctShares / 1e9).toFixed(2)} Mrd`)
                return correctShares
              } else {
                console.log(`⚠️ Using fallback shares for ${label}: ${(fallbackShares / 1e9).toFixed(2)} Mrd (likely wrong!)`)
                return fallbackShares
              }
            })(),
            
            // Nur kleine Ergänzungen:
            dividendPS: annualDiv[label] ?? 0,
            returnOnEquity: roeByPeriod[label] ?? null,
          }
          
          // P/E Ratio berechnen
          const price = priceByPeriod[label] ?? null
          out.pe = price != null && row.eps ? price / row.eps : null
          
          return out
        })

        console.log('🎯 Final data with CORRECT shares:', base.slice(0, 2)) // ← Debug-Log

        // Wachstum berechnen
        const withGrowth = base.map((row, idx, all) => {
          const out: any = { ...row }
          ;['revenue', 'ebitda', 'eps', 'freeCashFlow', 'sharesOutstanding', 'dividendPS', 'pe', 'netIncome', 'returnOnEquity', 'capEx', 'researchAndDevelopment', 'operatingIncome'].forEach(  // ✅ NEU: researchAndDevelopment, operatingIncome hinzugefügt
            (k: any) => {
              const prev = idx > 0 ? all[idx - 1][k] : null
              out[`${k}GrowthPct`] =
                prev != null && typeof row[k] === 'number' && prev !== 0
                  ? ((row[k] - prev) / prev) * 100
                  : null
            }
          )
          return out
        })

        setData(withGrowth)
      })
      .catch((e) => {
        console.error('[FinancialAnalysisClient] Fetch-Error:', e)
      })
      .finally(() => {
        setLoadingData(false)
      })
  }, [ticker, period, years, loadingSession])

  // ─── 3) Spinner / Zustände, wenn noch nicht eingeloggt oder Daten‐Laden ─────
  if (loadingSession || loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-gray-200">
        <p>
          Bitte{' '}
          <button
            onClick={() => router.push('/auth/signin')}
            className="text-accent underline"
          >
            anmelden
          </button>{' '}
          um die Finanzanalyse zu sehen.
        </p>
      </div>
    )
  }

  // ─── 4) Haupt‐Render: Darstellung der Charts + Premium‐Checks ────────────────
  return (
    <div className="space-y-6">
      {/* Zeitraum / Periode */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4 text-gray-100">
          <span>Zeitraum:</span>
          {[5, 10, 15, 20].map((y) => (
            <button
              key={y}
              onClick={() => {
                if (!userHasPremium) {
                  router.push('/pricing')
                } else {
                  setYears(y)
                }
              }}
              className={`px-2 py-1 rounded ${
                years === y ? 'bg-blue-600 text-white' : 'bg-gray-700'
              }`}
            >
              {y} J
            </button>
          ))}

          <span className="ml-6">Periode:</span>
          {(['annual', 'quarterly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (!userHasPremium) {
                  router.push('/pricing')
                } else {
                  setPeriod(p)
                }
              }}
              className={`px-3 py-1 rounded ${
                period === p ? 'bg-blue-600 text-white' : 'bg-gray-500'
              }`}
            >
              {p === 'annual' ? 'Jährlich' : 'Quartalsweise'}
            </button>
          ))}
        </div>

        {/* Checkbox-Filter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ALL_KEYS.map((key) => (
            <label key={key} className="inline-flex items-center space-x-2 text-gray-200">
              <input
                type="checkbox"
                checked={visible.includes(key)}
                onChange={() => {
                  if (!userHasPremium) {
                    router.push('/pricing')
                  } else {
                    setVisible((v) =>
                      v.includes(key) ? v.filter((x) => x !== key) : [...v, key]
                    )
                  }
                }}
                className="form-checkbox h-5 w-5 text-green-500"
              />
             <span className="text-sm">
  {key === 'cashDebt'
    ? 'Cash & Debt'
    : key === 'pe'
    ? 'KGV TTM'
    : key === 'capEx'
    ? 'CapEx (Mio.)'
    : key === 'researchAndDevelopment'  // ✅ NEU
    ? 'R&D (Mio.)'
    : key === 'operatingIncome'         // ✅ NEU  
    ? 'Operating Income (Mio.)'
    : METRICS.find((m) => m.key === key)?.name || key}
</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {visible.map((key) => {
          // → Cash & Debt
          if (key === 'cashDebt') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">Cash &amp; Debt</h3>
                  <button onClick={() => setFullscreen('cashDebt')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)} Mrd`} domain={[0, 'dataMax']} stroke="#888" />
                    {fullscreen === 'cashDebt' ? (
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} />
                    ) : (
                      <RechartsTooltip
                        formatter={(v: any, n: string) => [
                          `${(v as number / 1e3).toFixed(2)} Mrd`,
                          n,
                        ]}
                        {...TOOLTIP_STYLES}
                      />
                    )}
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="cash" name="Cash" fill={CASH_INFO.fill} />
                    <Bar dataKey="debt" name="Debt" fill={DEBT_INFO.fill} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          // → CapEx (NEU)
          if (key === 'capEx') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">CapEx (Mio.)</h3>
                  <button onClick={() => setFullscreen('capEx')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis 
                      tickFormatter={(v) => `${(v / 1e3).toFixed(0)} Mrd`} 
                      domain={[0, 'dataMax']} 
                      stroke="#888" 
                    />
                    <RechartsTooltip
                      formatter={(v: any, n: string) => [
                        `${(v as number / 1e3).toFixed(2)} Mrd`,
                        n,
                      ]}
                      {...TOOLTIP_STYLES}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="capEx" name="CapEx (Mio.)" fill="rgba(6,182,212,0.8)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          if (key === 'researchAndDevelopment') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">R&D Ausgaben (Mrd)</h3>
                  <button onClick={() => setFullscreen('researchAndDevelopment')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis 
                      tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`}
                      domain={[0, 'dataMax']} 
                      stroke="#888" 
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [`${(v / 1e3).toFixed(1)} Mrd`, 'R&D']}
                      {...TOOLTIP_STYLES}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="researchAndDevelopment" name="R&D Ausgaben" fill="rgba(6,182,212,0.8)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }
          
          // → Operating Income Chart (NEU)
          if (key === 'operatingIncome') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">Operating Income (Mrd)</h3>
                  <button onClick={() => setFullscreen('operatingIncome')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis 
                      tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`}
                      domain={['dataMin', 'dataMax']} // Operating Income kann negativ sein
                      stroke="#888" 
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [`${(v / 1e3).toFixed(1)} Mrd`, 'Operating Income']}
                      {...TOOLTIP_STYLES}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="operatingIncome" name="Operating Income" fill="rgba(132,204,22,0.8)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          // → KGV TTM
          if (key === 'pe') {
            const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / (data.length || 1)
            return (
              <Card key="pe" className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">KGV TTM</h3>
                  <button onClick={() => setFullscreen('pe')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis stroke="#888" />
                    <ReferenceLine
                      y={avg}
                      stroke="#888"
                      strokeDasharray="3 3"
                      label={{ value: `Ø ${avg.toFixed(1)}`, position: 'insideTop', fill: '#888' }}
                    />
                    <Line type="monotone" dataKey="pe" stroke="#f87171" dot />
                    <RechartsTooltip {...TOOLTIP_STYLES} formatter={(v: number) => [v.toFixed(2), 'KGV TTM']} />
                    <Legend verticalAlign="top" height={36} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          // → Net Income
          if (key === 'netIncome') {
            return (
              <Card key="netIncome" className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">Nettogewinn (Mrd)</h3> {/* ← Geändert zu "Mrd" */}
                  <button onClick={() => setFullscreen('netIncome')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis
                      // ✅ KORRIGIERT: Durch 1000 teilen statt 1 Million
                      tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`}
                      domain={['dataMin', 'dataMax']} // Net Income kann negativ sein
                      stroke="#888"
                    />
                    <RechartsTooltip
                      // ✅ KORRIGIERT: Durch 1000 teilen statt 1 Million  
                      formatter={(v: number) => [`${(v / 1e3).toFixed(1)} Mrd`, 'Nettogewinn']}
                      {...TOOLTIP_STYLES}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="netIncome" name="Nettogewinn (Mrd)" fill="#efb300" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }
          // → Dividende je Aktie
          if (key === 'dividendPS') {
            const hasDividends = data.some((row) => row.dividendPS > 0)
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">Dividende je Aktie</h3>
                  <button onClick={() => setFullscreen('dividendPS')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {!hasDividends ? (
                  <div className="h-56 flex items-center justify-center text-gray-400 italic">
                    Keine Dividenden in diesem Zeitraum.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis
                        tickFormatter={(v: number) =>
                          v.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          })
                        }
                        domain={[0, 'dataMax']} // Dividenden starten bei 0
                        stroke="#888"
                      />
                      <RechartsTooltip
                        formatter={(v: any, n: string) => [
                          (v as number).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }),
                          n,
                        ]}
                        {...TOOLTIP_STYLES}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="dividendPS" name="Dividende je Aktie" fill="rgba(34,211,238,0.8)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )
          }

          // → Alle anderen METRICS (Bar‐Charts inkl. ROE + CapEx + korrekte Shares Outstanding Formatierung)
          const m = METRICS.find((mt) => mt.key === key)
          if (!m) {
            console.warn(`Metric not found for key: ${key}`)
            return null
          }
          return (
            <Card key={key} className="p-4">
              <div className="flex justify-between items-center mb-2 text-gray-200">
                <h3 className="font-semibold">{m.name}</h3>
                <button onClick={() => setFullscreen(key)}>
                  <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data}>
                  <XAxis dataKey="label" stroke="#888" />
                  <YAxis
                    tickFormatter={(v: number) => {
                      if (key === 'returnOnEquity') {
                        return `${(v * 100).toFixed(1)} %`
                      } else if (key === 'eps') {
                        return v.toLocaleString('de-DE', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        })
                      } else if (key === 'sharesOutstanding') {
                        // ← KORREKTE Formatierung für Shares Outstanding (durch 1e9 für Milliarden)
                        return `${(v / 1e9).toFixed(2)} Mrd`
                      }
                      return `${(v / 1e3).toFixed(0)} Mrd` // CapEx wird auch in Milliarden angezeigt
                    }}
                    domain={
                      key === 'returnOnEquity' || key === 'eps'
                        ? ['dataMin', 'dataMax'] // Nur für ROE und EPS (können negativ sein)
                        : [0, 'dataMax'] // Alle anderen starten bei 0
                    }
                    stroke="#888"
                  />
                  <RechartsTooltip
                    formatter={(v: any, n: string) => {
                      if (key === 'returnOnEquity') {
                        return [`${((v as number) * 100).toFixed(1)} %`, n]
                      } else if (key === 'eps') {
                        return [
                          (v as number).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }),
                          n,
                        ]
                      } else if (key === 'sharesOutstanding') {
                        // ← KORREKTE Tooltip-Formatierung für Shares Outstanding
                        return [`${((v as number) / 1e9).toFixed(3)} Mrd Aktien`, n]
                      }
                      return [`${((v as number) / 1e3).toFixed(2)} Mrd`, n] // CapEx auch in Milliarden
                    }}
                    {...TOOLTIP_STYLES}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey={key} name={m.name} fill={m.fill} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )
        })}
      </div>

      {/* Vollbild‐Modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card-dark rounded-lg shadow p-6 max-w-[60vw] max-h-[60vh] w-[60vw] h-[60vh] overflow-auto relative">
            <button
              onClick={() => setFullscreen(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
              aria-label="Vollbild schließen"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                if (fullscreen === 'cashDebt') {
                  // ─── Cash & Debt Vollbild ─────────────────────────
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)} Mrd`} domain={[0, 'dataMax']} stroke="#888" />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="cash" name="Cash" fill={CASH_INFO.fill} />
                      <Bar dataKey="debt" name="Debt" fill={DEBT_INFO.fill} />
                    </BarChart>
                  )
                } else if (fullscreen === 'capEx') {
                  // ─── CapEx Vollbild ─────────────────────────
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)} Mrd`} domain={[0, 'dataMax']} stroke="#888" />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="capEx" name="CapEx (Mio.)" fill="rgba(6,182,212,0.8)" />
                    </BarChart>
                  )

                } 
                

                else if (fullscreen === 'researchAndDevelopment') {
                  // ─── R&D Vollbild ─────────────────────────
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`} domain={[0, 'dataMax']} stroke="#888" />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="researchAndDevelopment" name="R&D Ausgaben" fill="rgba(6,182,212,0.8)" />
                    </BarChart>
                  )
                } else if (fullscreen === 'operatingIncome') {
                  // ─── Operating Income Vollbild ─────────────────────────
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`} domain={['dataMin', 'dataMax']} stroke="#888" />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="operatingIncome" name="Operating Income" fill="rgba(132,204,22,0.8)" />
                    </BarChart>
                  )
                }
                
                else if (fullscreen === 'pe') {
                  // ─── KGV TTM Vollbild ──────────────────────────────
                  const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / (data.length || 1)
                  return (
                    <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis stroke="#888" />
                      <ReferenceLine
                        y={avg}
                        stroke="#888"
                        strokeDasharray="3 3"
                        label={{ value: `Ø ${avg.toFixed(1)}`, position: 'insideTop', fill: '#888' }}
                      />
                      <Line type="monotone" dataKey="pe" name="KGV TTM" stroke="#f87171" dot />
                      <RechartsTooltip {...TOOLTIP_STYLES} formatter={(v: number) => [v.toFixed(2), 'KGV TTM']} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                    </LineChart>
                  )
                } else {
                  // ─── Alle anderen Metriken (BarChart) ───────────────
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis
                        tickFormatter={(v: number) => {
                          if (fullscreen === 'returnOnEquity') {
                            return `${(v * 100).toFixed(1)} %`
                          } else if (fullscreen === 'eps') {
                            return v.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 2,
                            })
                          } else if (fullscreen === 'sharesOutstanding') {
                            // ← KORREKTE Vollbild-Formatierung für Shares Outstanding
                            return `${(v / 1e9).toFixed(2)} Mrd`
                          }
                          return `${(v / 1e3).toFixed(0)} Mrd` // CapEx auch in Milliarden
                        }}
                        domain={
                          fullscreen === 'returnOnEquity' || fullscreen === 'eps'
                            ? ['dataMin', 'dataMax'] // Nur für ROE und EPS (können negativ sein)
                            : [0, 'dataMax'] // Alle anderen starten bei 0
                        }
                        stroke="#888"
                      />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        dataKey={fullscreen}
                        name={METRICS.find((m) => m.key === fullscreen)?.name || fullscreen}
                        fill={METRICS.find((m) => m.key === fullscreen)?.fill || '#06b6d4'}
                      />
                    </BarChart>
                  )
                }
              })()}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}