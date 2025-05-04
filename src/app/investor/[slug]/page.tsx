// src/app/investor/[slug]/page.tsx
'use client'

import React, { useState } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'

import holdingsHistory from '@/data/holdings'
import InvestorTabs from '@/components/InvestorTabs'
import type { SectorDatum } from '@/components/SectorPieChart'
import { stocks } from '@/data/stocks'

const SectorPieChart = dynamic(
  () => import('@/components/SectorPieChart'),
  { ssr: false }
)
const TopPositionsBarChart = dynamic(
  () => import('@/components/TopPositionsBarChart'),
  { ssr: false }
)

import articlesBuffett from '@/data/articles/buffett.json'
import articlesAckman  from '@/data/articles/ackman.json'
import articlesGates   from '@/data/articles/gates.json'
import ArticleList from '@/components/ArticleList'
import type { Article } from '@/components/ArticleList'

interface Position {
  cusip:       string
  name:        string
  shares:      number
  value:       number
  deltaShares: number
  pctDelta:    number
}

const investorNames: Record<string,string> = {
  buffett: 'Warren Buffett – Berkshire Hathaway',
  ackman:  'Bill Ackman – Pershing Square Capital Management',
  gates:   'Bill & Melinda Gates Foundation Trust',
  // … alle anderen
}

function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month/3)
  let reportQ = filingQ - 1
  let reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

function formatCurrency(amount: number, currency: 'EUR' | 'USD' = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function InvestorPage({
  params: { slug },
}: {
  params: { slug: string }
}) {
  const [tab, setTab] = useState<'holdings' | 'buys' | 'sells'>('holdings')

  const snapshots = holdingsHistory[slug]
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return notFound()
  }

  // ——— aktuelle & vorherige Daten
  const latestSnapshot   = snapshots[snapshots.length - 1]
  const previousSnapshot = snapshots[snapshots.length - 2]
  const current  = latestSnapshot.data
  const previous = previousSnapshot?.data

  // Map der vorherigen Shares
  const prevMap = new Map<string,number>()
  previous?.positions.forEach(p => {
    prevMap.set(p.cusip, (prevMap.get(p.cusip)||0) + p.shares)
  })

  // Zusammenführen doppelter CUSIPs
  const merged = Array.from(
    current.positions.reduce((m,p) => {
      if (!m.has(p.cusip)) m.set(p.cusip,{...p})
      else {
        const e = m.get(p.cusip)!
        e.shares += p.shares
        e.value   += p.value
      }
      return m
    }, new Map<string,{cusip:string;name:string;shares:number;value:number}>()).values()
  )

  // Vollständige Positionen inkl. Delta und Prozente
  const full: Position[] = merged.map(p => {
    const prev   = prevMap.get(p.cusip)||0
    const delta  = p.shares - prev
    const pct    = prev>0 ? delta/prev : 0
    return { ...p, deltaShares: delta, pctDelta: pct }
  })

  // Sortiert nach Wert
  const holdings = full.slice().sort((a,b)=>b.value - a.value)
  const scaledHoldings = holdings.map(p => ({
    ...p,
    value: p.value / 1_000
  }))

  // Gesamtwert in Tsd.
  const totalValue = scaledHoldings.reduce((sum,p)=>sum+p.value,0)

  // Top-10 fürs Bar-Chart
  const top10 = scaledHoldings.slice(0,10).map(p=>({
    name:    p.name,
    percent: (p.value/totalValue)*100
  }))

  // Sektor-Aggregation
  const cusipToTicker  = new Map(stocks.map(s=>[s.cusip,s.ticker]))
  const tickerToSector = new Map(stocks.map(s=>[s.ticker,s.sector]))
  const sectorTotals: Record<string,number> = {}
  scaledHoldings.forEach(p=>{
    const t = cusipToTicker.get(p.cusip)
    const sec = t ? tickerToSector.get(t) ?? 'Sonstige' : 'Sonstige'
    sectorTotals[sec] = (sectorTotals[sec]||0) + p.value
  })
  const sectorData: SectorDatum[] = Object.entries(sectorTotals).map(
    ([sector,value]) => ({ sector, value })
  )

  const formattedDate = current.date
    ? current.date.split('-').reverse().join('.')
    : '–'
  const period = current.date
    ? getPeriodFromDate(current.date)
    : '–'

  let articles: Article[] = []
  switch(slug) {
    case 'buffett': articles = articlesBuffett; break
    case 'ackman':  articles = articlesAckman;  break
    case 'gates':   articles = articlesGates;   break
  }

  // Kunde: alle Käufe / Verkäufe per Quartal
  type HistoryGroup = { period: string; items: Position[] }
  const buysHistory: HistoryGroup[] = snapshots
    .map((snap, idx) => {
      const prevSnap = snapshots[idx - 1]?.data
      const pm = new Map<string,number>()
      prevSnap?.positions.forEach(p=>{
        pm.set(p.cusip,(pm.get(p.cusip)||0)+p.shares)
      })
      const mergedSnap = Array.from(
        snap.data.positions.reduce((m,p)=>{
          if (!m.has(p.cusip)) m.set(p.cusip,{...p})
          else {
            const e = m.get(p.cusip)!
            e.shares += p.shares
            e.value  += p.value
          }
          return m
        }, new Map<string,{cusip:string;name:string;shares:number;value:number}>()).values()
      )
      const fullSnap = mergedSnap.map(p=>{
        const prevS = pm.get(p.cusip)||0
        const d     = p.shares - prevS
        const pct   = prevS>0 ? d/prevS : 0
        return {...p, deltaShares:d, pctDelta:pct}
      })
      return {
        period: getPeriodFromDate(snap.data.date),
        items: fullSnap
          .filter(p=>p.deltaShares>0)
          .map(p=>({...p, value:p.value/1_000}))
      }
    })
    .reverse()

  const sellsHistory: HistoryGroup[] = snapshots
    .map((snap, idx) => {
      const prevSnap = snapshots[idx - 1]?.data
      const pm = new Map<string,number>()
      prevSnap?.positions.forEach(p=>{
        pm.set(p.cusip,(pm.get(p.cusip)||0)+p.shares)
      })
      const mergedSnap = Array.from(
        snap.data.positions.reduce((m,p)=>{
          if (!m.has(p.cusip)) m.set(p.cusip,{...p})
          else {
            const e = m.get(p.cusip)!
            e.shares += p.shares
            e.value  += p.value
          }
          return m
        }, new Map<string,{cusip:string;name:string;shares:number;value:number}>()).values()
      )
      const fullSnap = mergedSnap.map(p=>{
        const prevS = pm.get(p.cusip)||0
        const d     = p.shares - prevS
        const pct   = prevS>0 ? d/prevS : 0
        return {...p, deltaShares:d, pctDelta:pct}
      })
      return {
        period: getPeriodFromDate(snap.data.date),
        items: fullSnap
          .filter(p=>p.deltaShares<0)
          .map(p=>({...p, value:p.value/1_000}))
      }
    })
    .reverse()

  return (
    <main className="max-w-4xl mx-auto p-4">

      {/* ——— Investor Header ——— */}
      <div className="bg-white shadow rounded-lg p-6 mb-8 flex flex-col sm:flex-row items-center">
        <div className="w-20 h-20 relative mb-4 sm:mb-0 sm:mr-6 flex-shrink-0">
          <Image
            src={`/images/${slug}.png`}
            alt={slug}
            fill
            className="rounded-full object-cover"
          />
        </div>
        <div className="text-center sm:text-left flex flex-col gap-1">
          {/* Name in Orbitron */}
          <h1 className="text-3xl font-bold font-orbitron">
            {investorNames[slug] ?? slug}
          </h1>
          <p className="text-sm text-gray-500">
            Periode: <span className="font-medium text-gray-700">{period}</span>
          </p>
          <p className="text-sm text-gray-500">
            Aktualisiert am{' '}
            <span className="font-medium text-gray-700">{formattedDate}</span>
          </p>
          <p className="text-2xl font-semibold text-gray-800">
            Gesamtwert{' '}
            {/* Zahl in Tabular-Orbitron */}
            <span className="ml-2 inline-block bg-green-100 text-green-800 px-2 py-1 rounded numeric">
              {formatCurrency(totalValue,'EUR')}
            </span>
          </p>
        </div>
      </div>

      {/* ——— Tabs mit Holdings / Buys / Sells ——— */}
      <InvestorTabs
        tab={tab}
        onTabChange={setTab}
        holdings={scaledHoldings}
        buys={buysHistory}
        sells={sellsHistory}
      />

      {/* ——— Holdings View ——— */}
      {tab === 'holdings' && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-center mb-2 font-orbitron">
              Sektor-Verteilung
            </h2>
            <SectorPieChart data={sectorData} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-center mb-2 font-orbitron">
              Top 10 Positionen
            </h2>
            <TopPositionsBarChart data={top10} />
          </div>
        </div>
      )}

      {/* ——— Articles & Commentaries ——— */}
      {articles.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold text-center">Articles &amp; Commentaries</h2>
          <ArticleList articles={articles} />
        </>
      )}
    </main>
  )
}