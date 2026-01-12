// src/components/EstimatesPageClient.tsx - INSIGHTS STYLE - All-in-One
'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/CurrencyContext'
import Link from 'next/link'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface EstimatesPageClientProps {
  ticker: string
}

export default function EstimatesPageClient({ ticker }: EstimatesPageClientProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [estimates, setEstimates] = useState<any[]>([])
  const [priceTargets, setPriceTargets] = useState<any>(null)
  const [surprises, setSurprises] = useState<any[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { formatStockPrice, formatPercentage } = useCurrency()

  // Load user data
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('[EstimatesPageClient] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  // Load all data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [
          estimatesRes,
          priceTargetsRes,
          surprisesRes,
          quoteRes
        ] = await Promise.all([
          fetch(`/api/estimates/${ticker}`),
          fetch(`/api/price-targets/${ticker}`),
          fetch(`/api/earnings-surprises/${ticker}`),
          fetch(`/api/quote/${ticker}`)
        ])

        if (estimatesRes.ok) {
          const data = await estimatesRes.json()
          setEstimates(data)
        }

        if (priceTargetsRes.ok) {
          const data = await priceTargetsRes.json()
          setPriceTargets(data)
        }

        if (surprisesRes.ok) {
          const data = await surprisesRes.json()
          setSurprises(data.slice(0, 8)) // Last 8 quarters
        }

        if (quoteRes.ok) {
          const data = await quoteRes.json()
          setCurrentPrice(data[0]?.price || null)
        }

      } catch (err) {
        console.error('Error loading estimates data:', err)
        setError('Fehler beim Laden der Schätzungen')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [ticker])

  // Calculate surprise percentage
  const calculateSurprise = (actual: number, estimated: number) => {
    if (!estimated || estimated === 0) return 0
    return ((actual - estimated) / Math.abs(estimated)) * 100
  }

  // Calculate price target position percentage
  const calculatePosition = (value: number, low: number, high: number) => {
    if (high === low) return 50
    return Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100))
  }

  // Loading State
  if (loadingUser || loading) {
    return (
      <div className="w-full px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-6 bg-neutral-800 rounded w-64"></div>
          <div className="grid grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-neutral-800 rounded w-24"></div>
                <div className="h-8 bg-neutral-800 rounded w-32"></div>
              </div>
            ))}
          </div>
          <div className="h-48 bg-neutral-800 rounded"></div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="w-full px-6 lg:px-8 py-8 text-center">
        <p className="text-neutral-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  const consensus = priceTargets?.consensus
  const lowTarget = consensus?.targetLow || 0
  const highTarget = consensus?.targetHigh || 0
  const consensusTarget = consensus?.targetConsensus || 0

  // Analyst ratings
  const buyRating = priceTargets?.consensus?.numberOfAnalystsThatBuy || 0
  const holdRating = priceTargets?.consensus?.numberOfAnalystsThatHold || 0
  const sellRating = priceTargets?.consensus?.numberOfAnalystsThatSell || 0
  const totalAnalysts = buyRating + holdRating + sellRating

  // Calculate potential
  const potential = currentPrice && consensusTarget
    ? ((consensusTarget - currentPrice) / currentPrice) * 100
    : 0

  return (
    <div className="w-full px-6 lg:px-8 py-8">

      {/* ===== HEADER ===== */}
      <div className="mb-8 pb-6 border-b border-neutral-800">
        <h1 className="text-xl font-medium text-white mb-1">Analysten-Schätzungen</h1>
        <p className="text-sm text-neutral-500">
          Kursziele, Umsatz- und Gewinnprognosen für {ticker}
        </p>
      </div>

      {/* ===== KURSZIEL HERO SECTION ===== */}
      {consensus && currentPrice && (
        <div className="mb-12">
          {/* Kursziel Stats - Inline, keine Boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Aktueller Kurs</p>
              <p className="text-2xl font-bold text-white">{formatStockPrice(currentPrice)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Konsens-Kursziel</p>
              <p className={`text-2xl font-bold ${potential >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatStockPrice(consensusTarget)}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Potenzial</p>
              <p className={`text-2xl font-bold ${potential >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {potential >= 0 ? '+' : ''}{potential.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Kursziel-Spanne</p>
              <p className="text-lg text-neutral-300">
                <span className="text-red-400">{formatStockPrice(lowTarget)}</span>
                <span className="text-neutral-600 mx-2">—</span>
                <span className="text-emerald-400">{formatStockPrice(highTarget)}</span>
              </p>
            </div>
          </div>

          {/* Kursziel-Visualisierung - Simple Bar */}
          <div className="mb-6">
            <div className="relative h-3 bg-neutral-800 rounded-full overflow-hidden">
              {/* Range Bar Gradient */}
              <div
                className="absolute h-full bg-gradient-to-r from-red-500/30 via-neutral-600/30 to-emerald-500/30"
                style={{ left: '0%', width: '100%' }}
              />
              {/* Current Price Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-neutral-900 z-10"
                style={{ left: `${calculatePosition(currentPrice, lowTarget, highTarget)}%`, transform: 'translate(-50%, -50%)' }}
                title={`Aktueller Kurs: ${formatStockPrice(currentPrice)}`}
              />
              {/* Consensus Target Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full z-10"
                style={{ left: `${calculatePosition(consensusTarget, lowTarget, highTarget)}%`, transform: 'translate(-50%, -50%)' }}
                title={`Konsens: ${formatStockPrice(consensusTarget)}`}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-neutral-500">
              <span>Niedrigstes: {formatStockPrice(lowTarget)}</span>
              <span>Höchstes: {formatStockPrice(highTarget)}</span>
            </div>
          </div>

          {/* Analysten-Verteilung */}
          {totalAnalysts > 0 && (
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-sm text-neutral-400">Buy: {buyRating}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-neutral-500 rounded"></div>
                <span className="text-sm text-neutral-400">Hold: {holdRating}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-sm text-neutral-400">Sell: {sellRating}</span>
              </div>
              <span className="text-sm text-neutral-600 ml-4">{totalAnalysts} Analysten insgesamt</span>
            </div>
          )}
        </div>
      )}

      {/* ===== UMSATZ & GEWINN PROGNOSEN - TABLE ===== */}
      {estimates.length > 0 && (
        <div className="mb-12">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
            Umsatz & Gewinn Prognosen
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-3 text-sm font-medium text-neutral-500">Jahr</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Umsatz</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Wachstum</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">EPS</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Wachstum</th>
                  <th className="text-right py-3 text-sm font-medium text-neutral-500">Typ</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((est, index) => {
                  const prevEst = estimates[index + 1]
                  const revenueGrowth = prevEst && prevEst.estimatedRevenueAvg
                    ? ((est.estimatedRevenueAvg - prevEst.estimatedRevenueAvg) / prevEst.estimatedRevenueAvg) * 100
                    : null
                  const epsGrowth = prevEst && prevEst.estimatedEpsAvg
                    ? ((est.estimatedEpsAvg - prevEst.estimatedEpsAvg) / Math.abs(prevEst.estimatedEpsAvg)) * 100
                    : null

                  const currentYear = new Date().getFullYear()
                  const isEstimate = parseInt(est.date?.substring(0, 4) || '0') >= currentYear

                  return (
                    <tr key={est.date || index} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                      <td className="py-3 text-sm font-medium text-white">
                        {est.date?.substring(0, 4) || `FY${index}`}
                      </td>
                      <td className="py-3 text-sm text-right font-mono text-white">
                        {est.estimatedRevenueAvg
                          ? `${(est.estimatedRevenueAvg / 1e9).toFixed(1)} Mrd.`
                          : '–'}
                      </td>
                      <td className={`py-3 text-sm text-right font-mono ${
                        revenueGrowth !== null
                          ? revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                          : 'text-neutral-500'
                      }`}>
                        {revenueGrowth !== null
                          ? `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`
                          : '–'}
                      </td>
                      <td className="py-3 text-sm text-right font-mono text-white">
                        {est.estimatedEpsAvg
                          ? `$${est.estimatedEpsAvg.toFixed(2)}`
                          : '–'}
                      </td>
                      <td className={`py-3 text-sm text-right font-mono ${
                        epsGrowth !== null
                          ? epsGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                          : 'text-neutral-500'
                      }`}>
                        {epsGrowth !== null
                          ? `${epsGrowth >= 0 ? '+' : ''}${epsGrowth.toFixed(1)}%`
                          : '–'}
                      </td>
                      <td className="py-3 text-sm text-right">
                        {isEstimate ? (
                          <span className="text-amber-500">Prognose</span>
                        ) : (
                          <span className="text-neutral-400">Ist</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== UMSATZENTWICKLUNG BAR CHART ===== */}
      {estimates.length > 0 && (
        <div className="mb-12">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
            Umsatzentwicklung
          </h3>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={estimates.slice().reverse().map(est => {
                  const currentYear = new Date().getFullYear()
                  const year = est.date?.substring(0, 4) || ''
                  return {
                    year,
                    revenue: est.estimatedRevenueAvg ? est.estimatedRevenueAvg / 1e9 : 0,
                    isEstimate: parseInt(year) >= currentYear
                  }
                })}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v) => `${v.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#a3a3a3' }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(1)} Mrd. $`,
                    props.payload.isEstimate ? 'Prognose' : 'Ist'
                  ]}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {estimates.slice().reverse().map((est, index) => {
                    const currentYear = new Date().getFullYear()
                    const year = est.date?.substring(0, 4) || ''
                    const isEstimate = parseInt(year) >= currentYear
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isEstimate ? 'rgba(16, 185, 129, 0.5)' : '#10b981'}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded"></div>
              <span className="text-neutral-400">Ist-Werte</span>
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500/50 rounded"></div>
              <span className="text-neutral-400">Prognosen</span>
            </span>
          </div>
        </div>
      )}

      {/* ===== EARNINGS SURPRISES ===== */}
      {surprises.length > 0 && (
        <div className="mb-12">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
            Earnings Surprises (letzte 8 Quartale)
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {surprises.slice().reverse().map((q, index) => {
              const surprise = calculateSurprise(q.actualEarningResult, q.estimatedEarning)
              const quarterDate = new Date(q.date)
              const quarterLabel = `Q${Math.floor(quarterDate.getMonth() / 3) + 1} ${quarterDate.getFullYear()}`

              return (
                <div key={index} className="text-center py-4 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors">
                  <p className="text-xs text-neutral-500 mb-2">{quarterLabel}</p>
                  <p className={`text-lg font-bold ${
                    surprise >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {surprise >= 0 ? '+' : ''}{surprise.toFixed(1)}%
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {q.actualEarningResult?.toFixed(2)} vs {q.estimatedEarning?.toFixed(2)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== FOOTER ===== */}
      <div className="pt-6 border-t border-neutral-800">
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}`}
          className="text-sm text-neutral-500 hover:text-white transition-colors"
        >
          ← Zurück zur Aktienanalyse
        </Link>
      </div>
    </div>
  )
}
