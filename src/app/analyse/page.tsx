'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LockClosedIcon } from '@heroicons/react/24/outline'

import SearchTickerInput from '@/components/SearchTickerInput'
import Logo from '@/components/Logo'
import Card from '@/components/Card'

// — Hilfsfunktionen —
async function fetchQuote(ticker: string) {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
  )
  if (!res.ok) throw new Error('Quote fetch failed')
  const [data] = await res.json()
  return {
    price: data.price as number,
    changePct: parseFloat(data.changesPercentage as string),
  }
}

async function fetchHistorical(
  ticker: string
): Promise<Array<{ date: string; close: number }>> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
  )
  if (!res.ok) throw new Error('History fetch failed')
  const json = await res.json()
  return (json.historical as any[])
    .map(h => ({ date: h.date as string, close: h.close as number }))
    .reverse()
}

function pctChange(newVal: number, oldVal: number) {
  return ((newVal - oldVal) / oldVal) * 100
}

type Quote = {
  price:     number
  changePct: number
  perf1M?:   number
  perfYTD?:  number
}

const ALL_SECTIONS = {
  Beliebt:  ['aapl','msft','googl','amzn','tsla','nvda','META','nflx', 'axp','bac','uber','dpz'],
  Tech:     ['aapl','msft','nvda','googl','meta','orcl','sap','adbe'],
  Finanzen: ['jpm','bac','wfc','c'],
  DAX:      ['sap','sie','dte','air','alv','muv2','shl','mrk','mbg','pah3'],
}

// Nur dieser Tab ist aktiv
const ENABLED_TABS: Array<keyof typeof ALL_SECTIONS> = ['Beliebt']

export default function AnalysisIndexPage() {
  const router = useRouter()
  const [last, setLast]           = useState<string|null>(null)
  const [activeTab, setActiveTab] = useState<keyof typeof ALL_SECTIONS>('Beliebt')
  const [quotes, setQuotes]       = useState<Record<string, Quote>>({})

  // Last ticker aus localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastTicker')
    if (stored) setLast(stored.toUpperCase())
  }, [])

  // Quotes + History laden, wenn Tab wechselt
  useEffect(() => {
    const syms = ALL_SECTIONS[activeTab]
    syms.forEach(async t => {
      try {
        const q    = await fetchQuote(t)
        const hist = await fetchHistorical(t)

        const now         = new Date()
        const oneMonthAgo = new Date(now)
        oneMonthAgo.setMonth(now.getMonth() - 1)
        const h1m    = hist.find(h => new Date(h.date) >= oneMonthAgo)?.close
        const startY = hist.find(h => h.date.startsWith(now.getFullYear().toString()))?.close

        const perf1M  = h1m    != null ? pctChange(q.price, h1m)    : undefined
        const perfYTD = startY != null ? pctChange(q.price, startY) : undefined

        setQuotes(prev => ({
          ...prev,
          [t]: { ...q, perf1M, perfYTD }
        }))
      } catch {
        // silently ignore
      }
    })
  }, [activeTab])

  // Tab-Wechsel nur, wenn freigeschaltet
  const handleTabClick = (tab: keyof typeof ALL_SECTIONS) => {
    if (ENABLED_TABS.includes(tab)) setActiveTab(tab)
  }

  // Auswahl merken + navigieren
  const handleSelect = (t: string) => {
    localStorage.setItem('lastTicker', t.toUpperCase())
    router.push(`/analyse/${t.toLowerCase()}`)
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 space-y-12">
      {/* ─── Hero: einziger Container ─── */}
      <Card
        className="
          relative z-0 overflow-visible
          bg-gray-800/60 backdrop-blur-md
          border border-gray-700 rounded-2xl
          p-8 space-y-6
        "
      >
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-orbitron text-white">
            Aktien-Analyse Hub
          </h1>
          <p className="text-gray-300 text-lg">
            Live-Quote, historische Charts, Dividenden &amp; Kennzahlen im Vergleich.
          </p>
        </div>
        <div className="relative z-10 flex justify-center">
          <div className="w-full sm:w-1/2">
            <SearchTickerInput
              placeholder="Ticker eingeben (AAPL, TSLA …)"
              onSelect={handleSelect}
            />
          </div>
        </div>
      </Card>

      {/* ─── Zuletzt analysiert ─── */}
      {last && (
        <Card className="max-w-md mx-auto p-6">
          <div className="flex items-center space-x-6 bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-2xl p-4">
            <Logo
              src={`/logos/${last.toLowerCase()}.svg`}
              alt={`${last} Logo`}
              className="w-12 h-12"
            />
            <div>
              <h2 className="text-xl font-semibold text-white">{last}</h2>
              <p className="text-gray-400">Zuletzt analysiert</p>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Tab-Leiste ─── */}
      <nav className="flex space-x-4 border-b border-gray-700 pb-2">
        {Object.keys(ALL_SECTIONS).map(rawTab => {
          const tab     = rawTab as keyof typeof ALL_SECTIONS
          const enabled = ENABLED_TABS.includes(tab)
          const active  = tab === activeTab

          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              disabled={!enabled}
              className={`
                flex items-center space-x-1
                px-3 py-1 rounded-full transition
                ${active
                  ? 'bg-accent text-black'
                  : enabled
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 cursor-not-allowed'}
              `}
            >
              <span>{tab}</span>
              {!enabled && <LockClosedIcon className="w-4 h-4 text-gray-600" />}
            </button>
          )
        })}
      </nav>

      {/* ─── Aktien-Grid ─── */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">{activeTab}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ALL_SECTIONS[activeTab].map((t) => {
            const q = quotes[t]
            return (
              <Link key={t} href={`/analyse/${t.toLowerCase()}`}>
                <Card
                  className="
                    h-60 w-full flex flex-col justify-between
                    px-5 pt-6 pb-4
                    bg-gray-800/60 backdrop-blur-md
                    border border-gray-700 rounded-2xl
                    shadow-lg hover:shadow-2xl transition
                    cursor-pointer
                  "
                >
                  {/* Logo */}
                  <div className="flex justify-center">
                    <Logo
                      src={`/logos/${t.toLowerCase()}.svg`}
                      alt={`${t} Logo`}
                      className="w-12 h-12"
                    />
                  </div>

                  {/* Ticker & Preis */}
                  <div className="text-center space-y-1 divide-y divide-gray-700">
                    <div className="pb-2">
                      <h3 className="text-base font-semibold text-white">{t}</h3>
                    </div>
                    <div className="pt-2">
                      <p className="text-xl font-bold text-white">
                        {q
                          ? q.price.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'USD',
                            })
                          : '–'}
                      </p>
                      {q && (
                        <p className={`mt-1 text-sm font-mono ${
                          q.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {q.changePct >= 0 ? '↑' : '↓'}{' '}
                          {Math.abs(q.changePct).toFixed(2).replace('.', ',')} %
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 1M & YTD */}
                  {q && (
                    <div className="mt-2 text-xs text-gray-400 space-y-1">
                      <p>
                        1M:{' '}
                        {q.perf1M != null
                          ? `${q.perf1M >= 0 ? '↑' : '↓'} ${Math.abs(q.perf1M)
                              .toFixed(1)
                              .replace('.', ',')} %`
                          : '–'}
                      </p>
                      <p>
                        YTD:{' '}
                        {q.perfYTD != null
                          ? `${q.perfYTD >= 0 ? '↑' : '↓'} ${Math.abs(q.perfYTD)
                              .toFixed(1)
                              .replace('.', ',')} %`
                          : '–'}
                      </p>
                    </div>
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}