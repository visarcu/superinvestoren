// /analyse/aktien/[ticker]/investoren – Superinvestoren, Insider, Politiker
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────────────

interface SuperInvestor {
  investor: { slug: string; name: string; image: string | null }
  shares: number
  value: number
  valueFormatted: string
  portfolioPct: number
  activity: 'neu' | 'aufgestockt' | 'reduziert' | 'unverändert'
  changePct: number
  quarter: string
  filingDate: string
}

interface InsiderTrade {
  name: string; title: string; date: string
  type: 'buy' | 'sell'; shares: number; value: number; price: number
}

interface PoliticianTrade {
  name: string; party: string; date: string
  type: 'Purchase' | 'Sale'; amount: string
}

type Tab = 'superinvestoren' | 'insider' | 'politiker'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2).replace('.', ',')} Bio. $`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} Mrd. $`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} Mio. $`
  return `${v.toLocaleString('de-DE')} $`
}

const activityStyles: Record<string, { label: string; color: string }> = {
  neu: { label: 'Neu', color: 'bg-blue-500/10 text-blue-400' },
  aufgestockt: { label: 'Aufgestockt', color: 'bg-emerald-500/10 text-emerald-400' },
  reduziert: { label: 'Reduziert', color: 'bg-red-500/10 text-red-400' },
  unverändert: { label: 'Gehalten', color: 'bg-white/[0.04] text-white/25' },
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function InvestorenPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = (params.ticker as string)?.toUpperCase() || 'AAPL'

  const [tab, setTab] = useState<Tab>('superinvestoren')
  const [superInvestors, setSuperInvestors] = useState<SuperInvestor[]>([])
  const [insiderTrades, setInsiderTrades] = useState<InsiderTrade[]>([])
  const [politicianTrades, setPoliticianTrades] = useState<PoliticianTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/investors/stock/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/company/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
      // Insider trades from own SEC Form 4 parser
      fetch(`/api/v1/insider-trades/${ticker}?limit=30`).then(r => r.ok ? r.json() : null).catch(() => null),
      // Politician trades from own STOCK Act data
      fetch(`/api/v1/politician-trades/stock/${ticker}?limit=30`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([inv, company, insider, politicians]) => {
      if (inv?.investors) setSuperInvestors(inv.investors)
      if (company?.name) setCompanyName(company.name)
      if (insider?.trades) setInsiderTrades(insider.trades.map((t: any) => ({
        name: t.insiderName, title: t.title, date: t.transactionDate, type: t.type,
        shares: t.shares, value: t.totalValue || 0, price: t.pricePerShare || 0,
      })))
      if (politicians?.trades) setPoliticianTrades(politicians.trades.map((t: any) => ({
        name: t.politician?.name, party: t.politician?.party, date: t.transactionDate || t.disclosureDate,
        type: t.type?.includes('Purchase') ? 'Purchase' : 'Sale', amount: t.amount,
      })))
    }).finally(() => setLoading(false))
  }, [ticker])

  const totalSIValue = superInvestors.reduce((s, i) => s + i.value, 0)

  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/[0.03] max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <img src={`/api/v1/logo/${ticker}?size=80`} alt={ticker}
            className="w-10 h-10 rounded-xl bg-white/[0.06] object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <h1 className="text-lg font-bold text-white">{ticker} <span className="text-white/20 font-normal text-[14px]">Investoren</span></h1>
            <p className="text-[12px] text-white/30">{companyName}</p>
          </div>
        </div>
        <Link href={`/analyse/aktien/${ticker}`}
          className="px-3 py-1.5 text-[11px] text-white/25 bg-white/[0.03] border border-white/[0.05] rounded-lg hover:bg-white/[0.06] hover:text-white/50 transition-all">
          Aktienanalyse
        </Link>
      </header>

      {/* Stats Bar */}
      {superInvestors.length > 0 && (
        <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 py-4 flex gap-8">
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-wider">Superinvestoren</p>
            <p className="text-xl font-bold text-white">{superInvestors.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-wider">Gesamtwert</p>
            <p className="text-xl font-bold text-white">{fmt(totalSIValue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-wider">Aufgestockt</p>
            <p className="text-xl font-bold text-emerald-400">{superInvestors.filter(i => i.activity === 'aufgestockt' || i.activity === 'neu').length}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-wider">Reduziert</p>
            <p className="text-xl font-bold text-red-400">{superInvestors.filter(i => i.activity === 'reduziert').length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 border-b border-white/[0.03]">
        <div className="flex">
          {([
            { key: 'superinvestoren', label: 'Superinvestoren', count: superInvestors.length },
            { key: 'insider', label: 'Insider-Trades', count: insiderTrades.length },
            { key: 'politiker', label: 'Politiker', count: politicianTrades.length },
          ] as { key: Tab; label: string; count: number }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-[13px] font-medium relative transition-colors ${
                tab === t.key ? 'text-white' : 'text-white/20 hover:text-white/40'
              }`}>
              {t.label}
              {t.count > 0 && <span className="ml-1.5 text-[10px] text-white/15">{t.count}</span>}
              {tab === t.key && <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-white rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-6 sm:px-10 py-6 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>

        ) : tab === 'superinvestoren' ? (
          superInvestors.length === 0 ? (
            <div className="text-center py-28">
              <p className="text-white/20 text-sm">Kein Superinvestor hält aktuell {ticker}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-2 text-[10px] text-white/20 uppercase tracking-wider">
                <div className="col-span-4">Investor</div>
                <div className="col-span-2 text-right">Wert</div>
                <div className="col-span-2 text-right">Aktien</div>
                <div className="col-span-2 text-right">Portfolio-Anteil</div>
                <div className="col-span-2 text-right">Aktivität</div>
              </div>

              {superInvestors.map(si => {
                const style = activityStyles[si.activity] || activityStyles.unverändert
                return (
                  <Link key={si.investor.slug} href={`/superinvestor/${si.investor.slug}`}
                    className="grid grid-cols-12 gap-4 items-center px-5 py-4 rounded-xl bg-[#0c0c16] border border-white/[0.04] hover:border-white/[0.08] transition-all group">
                    {/* Investor */}
                    <div className="col-span-4 flex items-center gap-3">
                      {si.investor.image ? (
                        <img src={si.investor.image} alt={si.investor.name}
                          className="w-9 h-9 rounded-full bg-white/[0.06] object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center">
                          <span className="text-[13px] text-white/30 font-bold">{si.investor.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">{si.investor.name}</p>
                        <p className="text-[10px] text-white/15">{si.quarter}</p>
                      </div>
                    </div>

                    {/* Wert */}
                    <div className="col-span-2 text-right">
                      <p className="text-[13px] font-semibold text-white/70">{si.valueFormatted}</p>
                    </div>

                    {/* Aktien */}
                    <div className="col-span-2 text-right">
                      <p className="text-[13px] text-white/40 tabular-nums">{si.shares.toLocaleString('de-DE')}</p>
                    </div>

                    {/* Portfolio % */}
                    <div className="col-span-2 text-right">
                      <p className="text-[13px] text-white/40">{si.portfolioPct.toFixed(1).replace('.', ',')}%</p>
                    </div>

                    {/* Aktivität */}
                    <div className="col-span-2 text-right">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${style.color}`}>
                        {style.label}
                        {si.activity === 'aufgestockt' && si.changePct > 0 && ` +${si.changePct.toFixed(0)}%`}
                        {si.activity === 'reduziert' && si.changePct < 0 && ` ${si.changePct.toFixed(0)}%`}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )

        ) : tab === 'insider' ? (
          insiderTrades.length === 0 ? (
            <div className="text-center py-28">
              <p className="text-white/20 text-sm">Keine Insider-Trades für {ticker}</p>
              <p className="text-white/8 text-xs mt-1">Insider-Transaktionen werden aus SEC Form 4 Filings geladen</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-5 py-2 text-[10px] text-white/20 uppercase tracking-wider">
                <div className="col-span-3">Insider</div>
                <div className="col-span-2">Position</div>
                <div className="col-span-2 text-right">Typ</div>
                <div className="col-span-2 text-right">Wert</div>
                <div className="col-span-1 text-right">Aktien</div>
                <div className="col-span-2 text-right">Datum</div>
              </div>
              {insiderTrades.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-3.5 rounded-xl bg-[#0c0c16] border border-white/[0.04]">
                  <div className="col-span-3">
                    <p className="text-[13px] text-white/70">{t.name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] text-white/25">{t.title}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      t.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>{t.type === 'buy' ? 'Kauf' : 'Verkauf'}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-[13px] font-semibold text-white/70">{fmt(t.value)}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-[12px] text-white/30 tabular-nums">{t.shares.toLocaleString('de-DE')}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-[11px] text-white/25">{new Date(t.date).toLocaleDateString('de-DE')}</p>
                  </div>
                </div>
              ))}
            </div>
          )

        ) : tab === 'politiker' ? (
          politicianTrades.length === 0 ? (
            <div className="text-center py-28">
              <p className="text-white/20 text-sm">Keine Politiker-Trades für {ticker}</p>
              <p className="text-white/8 text-xs mt-1">Basierend auf STOCK Act Offenlegungen</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-5 py-2 text-[10px] text-white/20 uppercase tracking-wider">
                <div className="col-span-3">Politiker</div>
                <div className="col-span-2">Partei</div>
                <div className="col-span-2 text-right">Typ</div>
                <div className="col-span-3 text-right">Betrag</div>
                <div className="col-span-2 text-right">Datum</div>
              </div>
              {politicianTrades.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-3.5 rounded-xl bg-[#0c0c16] border border-white/[0.04]">
                  <div className="col-span-3">
                    <p className="text-[13px] text-white/70">{t.name}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      t.party === 'Democratic' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                    }`}>{t.party === 'Democratic' ? 'Demokrat' : 'Republikaner'}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      t.type === 'Purchase' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>{t.type === 'Purchase' ? 'Kauf' : 'Verkauf'}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="text-[12px] text-white/40">{t.amount}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-[11px] text-white/25">{new Date(t.date).toLocaleDateString('de-DE')}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </main>
    </div>
  )
}
