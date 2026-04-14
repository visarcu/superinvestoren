// /analyse/portfolio – Fey-Style Portfolio Dashboard
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Portfolio {
  id: string; name: string; currency: string; cash_position: number
  broker_credit: number; is_default: boolean; broker_type?: string
}

interface RawHolding {
  id: string; symbol: string; name: string; isin?: string
  quantity: number; purchase_price: number; purchase_date: string
  portfolio_id: string
}

interface HoldingWithQuote extends RawHolding {
  currentPrice: number; change: number; changePercent: number
  value: number; gainLoss: number; gainLossPercent: number; portfolioPct: number
}

interface Transaction {
  id: string; type: string; symbol: string; name: string
  quantity: number; price: number; total_value: number; date: string; notes?: string
}

type Tab = 'portfolio' | 'transaktionen' | 'dividenden'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2).replace('.', ',')} Mrd. €`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')} Mio. €`
  return `${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function fmtUSD(v: number): string {
  return `${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function PortfolioDashboard() {
  const router = useRouter()

  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<HoldingWithQuote[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('portfolio')

  // ── Load Data ───────────────────────────────────────────────────────────
  const loadPortfolio = useCallback(async (portfolioId?: string) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 1. Load portfolios
      const { data: pfs } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })

      if (!pfs || pfs.length === 0) {
        setLoading(false)
        return
      }

      setPortfolios(pfs)
      const active = portfolioId ? pfs.find(p => p.id === portfolioId) || pfs[0] : pfs[0]
      setActivePortfolio(active)

      // 2. Load holdings
      const { data: rawHoldings } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', active.id)
        .order('quantity', { ascending: false })

      if (!rawHoldings || rawHoldings.length === 0) {
        setHoldings([])
        setLoading(false)
        return
      }

      // 3. Fetch quotes from Finnhub
      const symbols = [...new Set(rawHoldings.map(h => h.symbol))].join(',')
      let quotes: Record<string, { price: number; change: number; changePercent: number }> = {}

      try {
        const res = await fetch(`/api/v1/quotes/batch?symbols=${symbols}`)
        if (res.ok) {
          const data = await res.json()
          for (const q of data.quotes || []) {
            if (q.price) quotes[q.symbol] = { price: q.price, change: q.change || 0, changePercent: q.changePercent || 0 }
          }
        }
      } catch { /* Quotes optional */ }

      // 4. Merge holdings + quotes
      const totalValue = rawHoldings.reduce((s, h) => {
        const q = quotes[h.symbol]
        return s + (q ? q.price * h.quantity : h.purchase_price * h.quantity)
      }, 0)

      const merged: HoldingWithQuote[] = rawHoldings.map(h => {
        const q = quotes[h.symbol]
        const price = q?.price || h.purchase_price
        const value = price * h.quantity
        const cost = h.purchase_price * h.quantity
        return {
          ...h,
          currentPrice: price,
          change: q?.change || 0,
          changePercent: q?.changePercent || 0,
          value,
          gainLoss: value - cost,
          gainLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
          portfolioPct: totalValue > 0 ? (value / totalValue) * 100 : 0,
        }
      }).sort((a, b) => b.value - a.value)

      setHoldings(merged)

      // 5. Load transactions
      const { data: txs } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', active.id)
        .order('date', { ascending: false })
        .limit(50)

      if (txs) setTransactions(txs)

    } catch (err) {
      console.error('Portfolio load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPortfolio() }, [loadPortfolio])

  // Auto-refresh quotes every 30s
  useEffect(() => {
    if (holdings.length === 0) return
    const interval = setInterval(() => {
      const symbols = holdings.map(h => h.symbol).join(',')
      fetch(`/api/v1/quotes/batch?symbols=${symbols}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data?.quotes) return
          const quoteMap: Record<string, any> = {}
          for (const q of data.quotes) { if (q.price) quoteMap[q.symbol] = q }

          setHoldings(prev => {
            const total = prev.reduce((s, h) => {
              const q = quoteMap[h.symbol]
              return s + ((q?.price || h.currentPrice) * h.quantity)
            }, 0)
            return prev.map(h => {
              const q = quoteMap[h.symbol]
              if (!q) return h
              const value = q.price * h.quantity
              const cost = h.purchase_price * h.quantity
              return {
                ...h,
                currentPrice: q.price,
                change: q.change || 0,
                changePercent: q.changePercent || 0,
                value,
                gainLoss: value - cost,
                gainLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
                portfolioPct: total > 0 ? (value / total) * 100 : 0,
              }
            })
          })
        })
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [holdings.length])

  // ── Calculations ────────────────────────────────────────────────────────
  const totalValue = holdings.reduce((s, h) => s + h.value, 0) + (activePortfolio?.cash_position || 0)
  const totalCost = holdings.reduce((s, h) => s + h.purchase_price * h.quantity, 0)
  const totalGainLoss = totalValue - totalCost - (activePortfolio?.cash_position || 0)
  const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0
  const todayChange = holdings.reduce((s, h) => s + h.change * h.quantity, 0)
  const todayChangePct = totalValue > 0 ? (todayChange / (totalValue - todayChange)) * 100 : 0

  const dividends = transactions.filter(t => t.type === 'dividend')
  const totalDividends = dividends.reduce((s, t) => s + (t.total_value || t.price * t.quantity), 0)

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/[0.03] max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Link href="/analyse/aktien/AAPL" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Portfolio</h1>
            {activePortfolio && <p className="text-[12px] text-white/25">{activePortfolio.name}</p>}
          </div>
        </div>

        {/* Portfolio Switcher (if multiple) */}
        {portfolios.length > 1 && (
          <select
            value={activePortfolio?.id || ''}
            onChange={e => loadPortfolio(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[12px] text-white/60"
          >
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </header>

      {/* Portfolio Value Hero */}
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 py-6">
        {loading ? (
          <div className="h-24 flex items-center"><div className="w-40 h-8 bg-white/[0.04] rounded animate-pulse" /></div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/20 text-lg">Noch keine Positionen</p>
            <p className="text-white/10 text-sm mt-1">Füge deine erste Aktie hinzu um loszulegen</p>
          </div>
        ) : (
          <>
            <p className="text-4xl font-bold text-white tabular-nums">{fmtUSD(totalValue)}</p>
            <div className="flex items-center gap-4 mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`text-[14px] font-semibold tabular-nums ${todayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {todayChange >= 0 ? '+' : ''}{fmtUSD(todayChange)}
                </span>
                <span className={`text-[12px] tabular-nums ${todayChange >= 0 ? 'text-emerald-400/50' : 'text-red-400/50'}`}>
                  ({todayChangePct >= 0 ? '+' : ''}{todayChangePct.toFixed(2).replace('.', ',')}%)
                </span>
                <span className="text-[10px] text-white/15">Heute</span>
              </div>
              <div className="w-px h-4 bg-white/[0.06]" />
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-medium tabular-nums ${totalGainLoss >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                  {totalGainLoss >= 0 ? '+' : ''}{fmtUSD(totalGainLoss)}
                </span>
                <span className={`text-[11px] tabular-nums ${totalGainLoss >= 0 ? 'text-emerald-400/40' : 'text-red-400/40'}`}>
                  ({totalGainLossPct >= 0 ? '+' : ''}{totalGainLossPct.toFixed(1).replace('.', ',')}%)
                </span>
                <span className="text-[10px] text-white/15">Gesamt</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/[0.03]">
              <div>
                <p className="text-[9px] text-white/15 uppercase tracking-wider">Positionen</p>
                <p className="text-[15px] font-semibold text-white">{holdings.length}</p>
              </div>
              <div>
                <p className="text-[9px] text-white/15 uppercase tracking-wider">Barmittel</p>
                <p className="text-[15px] font-semibold text-white">{fmtUSD(activePortfolio?.cash_position || 0)}</p>
              </div>
              {totalDividends > 0 && (
                <div>
                  <p className="text-[9px] text-white/15 uppercase tracking-wider">Dividenden</p>
                  <p className="text-[15px] font-semibold text-emerald-400">{fmtUSD(totalDividends)}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 border-b border-white/[0.03]">
        <div className="flex">
          {([
            { key: 'portfolio', label: 'Holdings' },
            { key: 'transaktionen', label: 'Transaktionen' },
            { key: 'dividenden', label: 'Dividenden' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-[13px] font-medium relative transition-colors ${
                tab === t.key ? 'text-white' : 'text-white/20 hover:text-white/40'
              }`}>
              {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-white rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-6 sm:px-10 py-6 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>

        ) : tab === 'portfolio' ? (
          holdings.length === 0 ? null : (
            <div className="space-y-1.5">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] text-white/15 uppercase tracking-wider">
                <div className="col-span-4">Aktie</div>
                <div className="col-span-1 text-right">Stk.</div>
                <div className="col-span-2 text-right">Kurs</div>
                <div className="col-span-2 text-right">Wert</div>
                <div className="col-span-2 text-right">Rendite</div>
                <div className="col-span-1 text-right">Anteil</div>
              </div>

              {holdings.map(h => (
                <Link key={h.id} href={`/analyse/aktien/${h.symbol}`}
                  className="grid grid-cols-12 gap-3 items-center px-4 py-3.5 rounded-xl bg-[#0c0c16] border border-white/[0.04] hover:border-white/[0.08] transition-all group">

                  {/* Aktie */}
                  <div className="col-span-4 flex items-center gap-3">
                    <img src={`/api/v1/logo/${h.symbol}?size=60`} alt={h.symbol}
                      className="w-8 h-8 rounded-lg bg-white/[0.06] object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div>
                      <p className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">{h.symbol}</p>
                      <p className="text-[10px] text-white/20 truncate max-w-[140px]">{h.name}</p>
                    </div>
                  </div>

                  {/* Stk */}
                  <div className="col-span-1 text-right">
                    <p className="text-[12px] text-white/30 tabular-nums">{h.quantity.toLocaleString('de-DE')}</p>
                  </div>

                  {/* Kurs */}
                  <div className="col-span-2 text-right">
                    <p className="text-[13px] text-white/70 tabular-nums">{fmtUSD(h.currentPrice)}</p>
                    <p className={`text-[10px] tabular-nums ${h.changePercent >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                      {h.changePercent >= 0 ? '+' : ''}{h.changePercent.toFixed(2)}%
                    </p>
                  </div>

                  {/* Wert */}
                  <div className="col-span-2 text-right">
                    <p className="text-[13px] font-semibold text-white/80 tabular-nums">{fmtUSD(h.value)}</p>
                  </div>

                  {/* Rendite */}
                  <div className="col-span-2 text-right">
                    <p className={`text-[12px] font-semibold tabular-nums ${h.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {h.gainLossPercent >= 0 ? '+' : ''}{h.gainLossPercent.toFixed(1).replace('.', ',')}%
                    </p>
                    <p className={`text-[10px] tabular-nums ${h.gainLoss >= 0 ? 'text-emerald-400/50' : 'text-red-400/50'}`}>
                      {h.gainLoss >= 0 ? '+' : ''}{fmtUSD(h.gainLoss)}
                    </p>
                  </div>

                  {/* Anteil */}
                  <div className="col-span-1 text-right">
                    <p className="text-[11px] text-white/25 tabular-nums">{h.portfolioPct.toFixed(1)}%</p>
                  </div>
                </Link>
              ))}
            </div>
          )

        ) : tab === 'transaktionen' ? (
          transactions.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/15 text-sm">Keine Transaktionen</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map(t => {
                const isBuy = t.type === 'buy' || t.type === 'cash_deposit' || t.type === 'dividend'
                const typeLabels: Record<string, string> = {
                  buy: 'Kauf', sell: 'Verkauf', dividend: 'Dividende',
                  cash_deposit: 'Einzahlung', cash_withdrawal: 'Auszahlung',
                  transfer_in: 'Transfer rein', transfer_out: 'Transfer raus',
                }
                return (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0c0c16] border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isBuy ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      }`}>
                        <svg className={`w-3.5 h-3.5 ${isBuy ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {isBuy
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                          }
                        </svg>
                      </div>
                      <div>
                        <p className="text-[13px] text-white/70">{t.symbol || typeLabels[t.type]}</p>
                        <p className="text-[10px] text-white/20">{typeLabels[t.type]} · {t.quantity > 0 ? `${t.quantity} Stk.` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[13px] font-semibold tabular-nums ${isBuy ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        {isBuy ? '+' : '-'}{fmtUSD(t.total_value || t.price * t.quantity)}
                      </p>
                      <p className="text-[10px] text-white/15">{new Date(t.date).toLocaleDateString('de-DE')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )

        ) : tab === 'dividenden' ? (
          dividends.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/15 text-sm">Keine Dividenden erfasst</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {dividends.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0c0c16] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <img src={`/api/v1/logo/${t.symbol}?size=60`} alt={t.symbol}
                      className="w-8 h-8 rounded-lg bg-white/[0.06] object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div>
                      <p className="text-[13px] text-white/70">{t.symbol}</p>
                      <p className="text-[10px] text-white/20">{t.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">+{fmtUSD(t.total_value || t.price * t.quantity)}</p>
                    <p className="text-[10px] text-white/15">{new Date(t.date).toLocaleDateString('de-DE')}</p>
                  </div>
                </div>
              ))}

              {/* Dividend Summary */}
              <div className="mt-4 pt-4 border-t border-white/[0.03] flex justify-between px-4">
                <span className="text-[12px] text-white/25">Gesamte Dividenden</span>
                <span className="text-[14px] font-bold text-emerald-400">{fmtUSD(totalDividends)}</span>
              </div>
            </div>
          )
        ) : null}
      </main>
    </div>
  )
}
