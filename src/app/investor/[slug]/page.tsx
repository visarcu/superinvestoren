// src/app/investor/[slug]/page.tsx
'use client'

import React, { useState } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'

import holdingsHistory from '@/data/holdings'
import InvestorTabs from '@/components/InvestorTabs'
import { stocks } from '@/data/stocks'

const TopPositionsBarChart = dynamic(
  () => import('@/components/TopPositionsBarChart'),
  { ssr: false }
)
const CashFlowBarChart = dynamic(
  () => import('@/components/CashFlowBarChart'),
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
  value:       number  // Marktwert dieser Position
  deltaShares: number
  pctDelta:    number
}

interface HistoryGroup {
  period: string
  items: Position[]
}

interface CashFlowPoint {
  period: string
  buy:    number  // USD
  sell:   number  // USD
}

const investorNames: Record<string,string> = {
  buffett: 'Warren Buffett – Berkshire Hathaway',
  ackman:  'Bill Ackman – Pershing Square Capital Management',
  gates:   'Bill & Melinda Gates Foundation Trust',
}

function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1,
      reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

function formatCurrency(amount: number, currency: 'EUR'|'USD' = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper: doppelte CUSIPs zusammenfassen
function mergePositions(raw: { cusip:string; shares:number; value:number }[]) {
  const map = new Map<string,{shares:number;value:number}>()
  raw.forEach(p => {
    const prev = map.get(p.cusip)
    if (prev) {
      prev.shares += p.shares
      prev.value   += p.value
    } else {
      map.set(p.cusip, { shares:p.shares, value:p.value })
    }
  })
  return map
}

export default function InvestorPage({
  params:{ slug }
}:{
  params:{ slug:string }
}) {
  const [tab,setTab] = useState<'holdings'|'buys'|'sells'>('holdings')
  const snapshots = holdingsHistory[slug]
  if (!Array.isArray(snapshots) || snapshots.length < 2) {
    return notFound()
  }

  // — Header —
  const latest = snapshots[snapshots.length-1].data
  const previous = snapshots[snapshots.length-2].data
  const formattedDate = latest.date?.split('-').reverse().join('.') || '–'
  const period = latest.date ? getPeriodFromDate(latest.date) : '–'

  // — Buys/Sells History (inkl. deltaShares & pctDelta) —
  const buildHistory = (isBuy:boolean): HistoryGroup[] =>
    snapshots.map((snap, idx) => {
      const prevRaw = idx>0 ? snapshots[idx-1].data.positions : []
      const prevMap = new Map<string,number>()
      prevRaw.forEach(p => {
        prevMap.set(p.cusip, (prevMap.get(p.cusip)||0) + p.shares)
      })

      // merge duplicates
      const merged = Array.from(mergePositions(snap.data.positions).entries())
        .map(([cusip,{shares,value}]) => ({
          cusip,
          shares,
          value, // Aktueller Marktwert in USD
          name: stocks.find(s=>s.cusip===cusip)?.name || cusip
        }))

      // Berechnung deltaShares + pctDelta
      const full = merged.map(p => {
        const prevShares = prevMap.get(p.cusip)||0
        const delta = p.shares - prevShares
        return {
          ...p,
          deltaShares: delta,
          pctDelta: prevShares>0 ? delta / prevShares : 0
        }
      })

      return {
        period: getPeriodFromDate(snap.data.date),
        items: full
          .filter(p => isBuy ? p.deltaShares>0 : p.deltaShares<0)
      }
    }).reverse()

  const buysHistory  = buildHistory(true)
  const sellsHistory = buildHistory(false)

  // — Top 10 Positionen —
  const prevShareMap = new Map<string,number>()
  previous.positions.forEach(p => {
    prevShareMap.set(p.cusip, (prevShareMap.get(p.cusip)||0) + p.shares)
  })

  const mergedHoldings = Array.from(mergePositions(latest.positions).entries())
    .map(([cusip,{shares,value}]) => {
      const prevShares = prevShareMap.get(cusip)||0
      const delta = shares - prevShares
      return {
        cusip,
        name: stocks.find(s=>s.cusip===cusip)?.name || cusip,
        shares,
        value,
        deltaShares: delta,
        pctDelta: prevShares>0 ? delta / prevShares : 0
      }
    })

  const sortedHold = mergedHoldings.sort((a,b)=>b.value - a.value)
  const scaledHold = sortedHold.map(p => ({
    ...p,
    value: p.value / 1000   // in Tausend USD
  }))
  const totalVal = scaledHold.reduce((s,p)=>s + p.value, 0)
  const top10 = scaledHold.slice(0,10).map(p => ({
    name: p.name,
    percent: (p.value / totalVal) * 100
  }))

  // — Cashflow: aus deltaShares * Preis pro Aktie —
  // Wir nehmen die 8 aktuellsten Quartale (buysHistory[0] = neuestes)
  const recentBuys  = buysHistory.slice(0,8)
  const recentSells = sellsHistory.slice(0,8)
  const cashflowPoints: CashFlowPoint[] = recentBuys
    .map((grp, idx) => {
      // summe Flow per Quartal
      const buyFlow  = grp.items.reduce((sum,p) => {
        const pricePerShare = p.value / p.shares
        return sum + p.deltaShares * pricePerShare
      }, 0)
      const sellFlow = recentSells[idx].items.reduce((sum,p) => {
        const pricePerShare = p.value / p.shares
        return sum + (-p.deltaShares) * pricePerShare
      }, 0)
      return {
        period: grp.period,
        buy:    buyFlow,
        sell:   sellFlow
      }
    })
    // jetzt in chronologischer Reihenfolge: ältestes links, neuestes rechts
    .reverse()

  // — Articles & Commentaries —
  let articles: Article[] = []
  if (slug === 'buffett') articles = articlesBuffett
  if (slug === 'ackman')  articles = articlesAckman
  if (slug === 'gates')   articles = articlesGates

  return (
    <main className="max-w-screen-xl mx-auto p-4">
      {/* — Investor Header — */}
      <div className="bg-white shadow rounded-lg p-6 mb-8 flex flex-col sm:flex-row items-center">
        <div className="w-20 h-20 relative mb-4 sm:mb-0 sm:mr-6 flex-shrink-0">
          <Image
            src={`/images/${slug}.png`}
            alt={slug}
            fill
            className="rounded-full object-cover"
          />
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-3xl font-orbitron font-bold">
            {investorNames[slug] ?? slug}
          </h1>
          <p className="text-sm text-gray-500">
            Periode: <span className="font-medium">{period}</span>
          </p>
          <p className="text-sm text-gray-500">
            Aktualisiert am <span className="font-medium">{formattedDate}</span>
          </p>
          <p className="text-2xl font-semibold text-gray-800">
            Gesamtwert{' '}
            <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded numeric">
              {formatCurrency(totalVal,'EUR')}
            </span>
          </p>
        </div>
      </div>

      {/* — Tabs — */}
      <InvestorTabs
        tab={tab}
        onTabChange={setTab}
        holdings={scaledHold}
        buys={buysHistory}
        sells={sellsHistory}
      />

      {/* — Holdings View — */}
      {tab === 'holdings' && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="w-full h-[500px]">
            <h2 className="text-xl font-orbitron font-semibold text-center mb-2">
              Top 10 Positionen
            </h2>
            <TopPositionsBarChart data={top10} />
          </div>
          <div className="w-full h-[500px]">
            <h2 className="text-xl font-orbitron font-semibold text-center mb-2">
              Cashflow pro Quartal (letzte 8)
            </h2>
            <CashFlowBarChart data={cashflowPoints} />
          </div>
        </div>
      )}

      {/* — Articles & Commentaries — */}
      {articles.length > 0 && (
        <>
          <h2 className="mt-12 text-xl font-orbitron font-semibold text-center">
            Articles &amp; Commentaries
          </h2>
          <ArticleList articles={articles} />
        </>
      )}
    </main>
  )
}