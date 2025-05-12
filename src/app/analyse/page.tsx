// src/app/analyse/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchTickerInput from '@/components/SearchTickerInput'
import Image from 'next/image'
import { domainForTicker } from '@/lib/clearbit'

// Hilfsfunktionen
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
  return (json.historical as any[]).map(h => ({
    date: h.date as string,
    close: h.close as number
  })).reverse()
}

// Prozent-Änderung zwischen zwei Werten
function pctChange(newVal: number, oldVal: number) {
  return ((newVal - oldVal) / oldVal) * 100
}

type Quote = {
  price: number
  changePct: number      // Tages-Change
  perf1M?: number        // 1-Monats-Change
  perfYTD?: number       // YTD-Change
}

const ALL_SECTIONS = {
  Beliebt:  ['AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','NFLX'],
  Tech:     ['AAPL','MSFT','NVDA','GOOGL','META','ORCL','SAP','ADBE'],
  Finanzen: ['JPM','BAC','WFC','C'],
  DAX: ['SAP','SIE','DTE','AIR', 'ALV', 'MUV2', 'SHL', 'MRK', 'MBG', 'PAH3'], 
}

export default function AnalysisIndexPage() {
  const router = useRouter()

  // Letzten Ticker aus localStorage
  const [last, setLast] = useState<string|null>(null)
  // Aktiver Tab
  const [activeTab, setActiveTab] = useState<keyof typeof ALL_SECTIONS>('Beliebt')
  // Quotes + Performance
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})

  // Beim Mount: lastTicker aus localStorage lesen
  useEffect(() => {
    const stored = localStorage.getItem('lastTicker')
    if (stored) setLast(stored.toUpperCase())
  }, [])

  // Jedes Mal, wenn der Tab wechselt, holen wir Quote + History → berechnen die drei Performances
  useEffect(() => {
    const syms = ALL_SECTIONS[activeTab]
    syms.forEach(async t => {
      try {
        const q = await fetchQuote(t)
        const hist = await fetchHistorical(t)

        const now = new Date()
        // 1 Monat zurück
        const oneMonthAgo = new Date(now)
        oneMonthAgo.setMonth(now.getMonth() - 1)
        const h1m = hist.find(h => new Date(h.date) >= oneMonthAgo)?.close

        // YTD (erstes Datum dieses Jahres)
        const yearStart = hist.find(h => h.date.startsWith(now.getFullYear().toString()))?.close

        const perf1M = h1m != null ? pctChange(q.price, h1m) : undefined
        const perfYTD = yearStart != null ? pctChange(q.price, yearStart) : undefined

        setQuotes(prev => ({
          ...prev,
          [t]: { ...q, perf1M, perfYTD }
        }))
      } catch {
        // Silently fail
      }
    })
  }, [activeTab])

  // Klick auf Ticker: merken + navigieren
  const handleSelect = (t: string) => {
    localStorage.setItem('lastTicker', t.toUpperCase())
    router.push(`/analyse/${t.toLowerCase()}`)
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-16 space-y-12">

      {/* Hero */}
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">Aktien-Analyse Hub</h1>
        <p className="text-gray-300">
          Live-Quote, historische Charts, Dividenden & Kennzahlen im Vergleich.
        </p>
        <div className="flex justify-center">
          <div className="w-full sm:w-2/3">
            <SearchTickerInput
              placeholder="Ticker eingeben (AAPL, TSLA …)"
              onSelect={t => handleSelect(t)}
            />
          </div>
        </div>
      </div>

      {/* Zuletzt analysiert */}
      {last && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Zuletzt analysiert</h2>
          <button
            onClick={() => handleSelect(last)}
            className="flex items-center bg-card-dark hover:bg-gray-700 transition rounded-2xl p-4"
          >
            <div className="w-10 h-10 mr-4 relative">
              <Image
                src={`https://logo.clearbit.com/${domainForTicker(last)}`}
                alt={`${last} Logo`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <span className="font-medium uppercase">{last}</span>
          </button>
        </section>
      )}

      {/* Tab-Leiste */}
      <nav className="flex space-x-4 border-b border-gray-700 pb-2">
        {Object.keys(ALL_SECTIONS).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as keyof typeof ALL_SECTIONS)}
            className={`
              px-3 py-1 rounded-full transition
              ${activeTab === tab
                ? 'bg-accent text-black'
                : 'text-gray-400 hover:text-gray-200'}
            `}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Aktien-Grid */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">{activeTab}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {ALL_SECTIONS[activeTab].map(t => {
            const logoUrl = `https://logo.clearbit.com/${domainForTicker(t)}`
            const q = quotes[t]
            return (
              <button
                key={t}
                onClick={() => handleSelect(t)}
                className="
                  flex flex-col items-center 
                  bg-card-dark hover:bg-gray-700 transition
                  rounded-2xl p-6 space-y-3 shadow-lg
                "
              >
                <div className="w-12 h-12 relative">
                  <Image
                    src={logoUrl}
                    alt={`${t} Logo`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>

                <span className="mt-2 font-medium">{t}</span>

                {q && (
                  <div className="text-center space-y-1">
                    {/* Preis */}
                    <div className="text-lg font-semibold">
                      {q.price.toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                    {/* Tages-Performance */}
                    <div
                      className={`text-sm font-medium ${
                        q.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {q.changePct >= 0 ? '↑' : '↓'}{' '}
                      {Math.abs(q.changePct).toFixed(2).replace('.', ',')} %
                    </div>
                    {/* 1-Monat */}
                    {typeof q.perf1M === 'number' && (
                      <div className="text-xs text-gray-400">
                        1M:{' '}
                        {q.perf1M >= 0 ? '↑' : '↓'}{' '}
                        {Math.abs(q.perf1M).toFixed(2).replace('.', ',')} %
                      </div>
                    )}
                    {/* YTD */}
                    {typeof q.perfYTD === 'number' && (
                      <div className="text-xs text-gray-400">
                        YTD:{' '}
                        {q.perfYTD >= 0 ? '↑' : '↓'}{' '}
                        {Math.abs(q.perfYTD).toFixed(2).replace('.', ',')} %
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}