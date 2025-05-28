// src/app/investor/[slug]/page.tsx
'use client'

import React, { useState } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'

import holdingsHistory from '@/data/holdings'
import InvestorTabs from '@/components/InvestorTabs'
import { stocks } from '@/data/stocks'

import LoadingSpinner from '@/components/LoadingSpinner'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from '@/components/ErrorFallback'
import PortfolioValueChart from '@/components/PortfolioValueChart'
import InvestorSubscribeForm from '@/components/InvestorSubscribeForm'  // ← Import hinzugefügt
import { EnvelopeIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline'

import Link from 'next/link'      


// dynamischer Import mit Spinner
const TopPositionsBarChart = dynamic(
  () => import('@/components/TopPositionsBarChart'),
  {
    ssr: false,
    loading: () => <LoadingSpinner />
  }
)

const CashFlowBarChart = dynamic(
  () => import('@/components/CashFlowBarChart'),
  {
    ssr: false,
    loading: () => <LoadingSpinner />
  }
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

interface HistoryGroup {
  period: string
  items: Position[]
}

interface CashFlowPoint {
  period: string
  buy:    number
  sell:   number
}

const investorNames: Record<string,string> = {
  buffett: 'Warren Buffett – Berkshire Hathaway',
  ackman:  'Bill Ackman – Pershing Square Capital Management',
  gates:   'Bill & Melinda Gates Foundation Trust',
  chou: 'Francis Chou - Chou Associates Management',
  lawrence: 'Bryan R. Lawrence - Oakliff Capital Partners',
  roepers: 'Alex Roepers - Atlantic Investment Management',
  munger: 'Charlie Munger',
  pabrai: 'Mohnish Pabrai - Dalal Street',
  lou: 'Norbert Lou - Punch Card Management',
  wyden: 'Adam Wyden - ADW Capital Management',
  muhlenkamp: 'Ronald Muhlenkamp - Muhlenkamp & Co',
  tarasoff:'Josh Tarasoff - Greenlea Lane Capital Management',
  vinall: 'Robert Vinall - RV Capital GmbH',
  welling:'Glenn Welling - Engaged Capital',
  rolfe: 'David Rolfe - Wedgewood Partners',
  bloomstran: 'Chris Bloomstran - Semper Augustus Investments Group',
  karr: 'Robert Karr - Joho Capital',
  hong: 'Dennis Hong - Shawspring Partners',
  gregalexander: 'Greg Alexander - Conifer Management',
  dorsey:'Pat Dorsey - Dorsey Asset Management',
  bares: 'Brian Bares - Bares Capital Management',
  berkowitz:'Bruce Berkowitz - Fairholme Capital Management',
  watsa:'Prem Watsa - Fairfax Financial Holdings',
  sosin: 'Clifford Sosin - CAS Investment Parners',
  einhorn:'David Einhorn - Greenlight Capital',
  burn:'Harry Burn - Sound Shore Management',
  brenton:'Andrew Brenton - Turtle Creek Asset Management',
  train: 'Lindsell Train',
  greenberg:'Glenn Greenberg - Brave Warrior Advisors',
  meritage:'Nathaniel Simons - Meritage Group',
  ketterer:'Sarah Ketterer - Causeway Capital Management',
  altarockpartners: 'Mark Massey - Altarock Partners',
  martin:'Fred Martin - Disciplined Growth Investors',
  vulcanvalue:'C.T. Fitzpatrick - Vulcan Value Partners',
  abrams: 'David Abrams - Abrams Capital Management',
  greenhaven: 'Edgar Wachenheim - Greenhaven Associates',
  tepper: 'David Tepper - Appaloosa Management',
  akre: 'Chuck Akre - Akre Capital Management',
  russo:'Thomas Russo - Gardner Russe & Quinn',
  polen: 'Polen Capital Management',
  jensen: 'Jensen Investment Management',
  gayner: 'Thomas Gayner - Markel Group',
  yacktman: 'Donald Yacktman - Yacktman Asset Management',
  olstein:'Robert Olstein - Olstein Capital Management',
  duan:'Duan Yongping - H&H International Investment',
  hohn: 'Chris Hohn - TCI Fund Management',
  coleman: 'Chase Coleman - Tiger Global Management',
  icahn:'Carl Icahn - Icahn Capital Management',
  ainslie:'Lee Ainslie - Maverick Capital',
  mandel:'Stephen Mandel - Lone Pine Capital',
  mairspower: 'Andrew R. Adams - Mairs & Power Growth Fund',
  cunniff:'Ruane Cunniff – Sequoia Fund',
  hawkins:'Mason Hawkins – Longleaf Partners',
  katz: 'David Katz',
  klarman: 'Seth Klarman - Baupost Group',
  spier: 'Guy Spier - Aquamarine Capital',
  triplefrond:'Stuart McLaughlin - Triple Frond Partners',
  lilu: 'Li Lu - Himalaya Capital Management',
  marks: 'Howard Marks - Oaktree Capital Management',
  ubben: 'Jeffrey Ubben - Valueact Holdings',
  smith: 'Terry Smith - Fundsmith',
  donaldsmith:'Donald Smith & Co.',
  dodgecox:'Dodge & Cox Stock Fund',
  miller: 'Bill Miller - Miller Value Partners',
  cantillon: 'William von Mueffling - Cantillon Capital Management',
  whitman: 'Marty Whitman - Third Avenue Management',
  greenbrier:'Greenbrier Partners Capital Management',
  peltz: 'Nelson Peltz - Trian Fund Management'

}

function splitInvestorName(full: string) {
  const [name, subtitle] = full.split(' – ')
  return { name, subtitle }
}

function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

function formatCurrency(amount: number, currency: 'EUR'|'USD' = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style:    'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

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


export default function InvestorPage({ params:{ slug } }) {
  const titleFull = investorNames[slug] ?? slug
  const { name: mainName, subtitle } = splitInvestorName(titleFull)
  const [tab, setTab] = useState<'holdings'|'buys'|'sells'>('holdings')
  const [showForm, setShowForm] = useState(false)        // neu
  const snapshots = holdingsHistory[slug]
  if (!Array.isArray(snapshots) || snapshots.length < 2) return notFound()

  // — Header-Daten —
  const latest   = snapshots[snapshots.length-1].data
  const previous = snapshots[snapshots.length-2].data
  const formattedDate = latest.date?.split('-').reverse().join('.') || '–'
  const period        = latest.date ? getPeriodFromDate(latest.date) : '–'

  // — Käufe/Verkäufe History —
  const buildHistory = (isBuy:boolean): HistoryGroup[] =>
    snapshots.map((snap, idx) => {
      const prevRaw = idx>0 ? snapshots[idx-1].data.positions : []
      const prevMap = new Map<string,number>()
      prevRaw.forEach(p => prevMap.set(p.cusip,(prevMap.get(p.cusip)||0)+p.shares))

      const merged = Array.from(mergePositions(snap.data.positions).entries())
        .map(([cusip,{shares,value}]) => ({
          cusip, shares, value,
          name: stocks.find(s=>s.cusip===cusip)?.name || cusip
        }))

      const full = merged.map(p => {
        const prevShares = prevMap.get(p.cusip)||0
        const delta = p.shares - prevShares
        return {
          ...p,
          deltaShares: delta,
          pctDelta: prevShares>0 ? delta/prevShares : 0
        }
      })

      return {
        period: getPeriodFromDate(snap.data.date),
        items:  full.filter(p => isBuy ? p.deltaShares>0 : p.deltaShares<0)
      }
    }).reverse()

  const buysHistory  = buildHistory(true)
  const sellsHistory = buildHistory(false)

  // — Top 10 Positionen —
  const prevMap = new Map<string,number>()
  previous.positions.forEach(p => prevMap.set(p.cusip,(prevMap.get(p.cusip)||0)+p.shares))

  const mergedHoldings = Array.from(mergePositions(latest.positions).entries())
    .map(([cusip,{shares,value}]) => {
      const prevShares = prevMap.get(cusip)||0
      const delta = shares - prevShares
      return { cusip, name: stocks.find(s=>s.cusip===cusip)?.name||cusip, shares, value, deltaShares: delta, pctDelta: prevShares>0 ? delta/prevShares : 0 }
    })

  const sortedHold = mergedHoldings.sort((a,b)=>b.value - a.value)
  const scaledHold = sortedHold.map(p => ({ ...p, value: p.value/1000 }))
  const totalVal   = scaledHold.reduce((s,p)=>s+p.value,0)
  const top10      = scaledHold.slice(0,10).map(p=>({ name:p.name, percent:(p.value/totalVal)*100 }))

  // — Cashflow (letzte 8 Q) —
  const recentBuys  = buysHistory.slice(0,8)
  const recentSells = sellsHistory.slice(0,8)
  const cashflowPoints: CashFlowPoint[] = recentBuys.map((grp,idx)=>{
    const buySum  = grp.items.reduce((sum,p)=>sum + p.deltaShares*(p.value/p.shares),0)
    const sellSum = recentSells[idx].items.reduce((sum,p)=>sum + (-p.deltaShares)*(p.value/p.shares),0)
    return { period: grp.period, buy: buySum, sell: sellSum }
  }).reverse()

  const valueHistory = snapshots.map(snap => {
    const total = snap.data.positions.reduce((sum, p) => sum + p.value, 0)
    return { period: getPeriodFromDate(snap.data.date), value: total }
  })

  const valueHistoryScaled = valueHistory.map(p => ({
    period: p.period,
    value: p.value / 1_000_000_000_000_000_000  // jetzt in Mrd. $
  }))

  // — Articles & Commentaries —
  let articles: Article[] = []
  if (slug==='buffett') articles = articlesBuffett
  if (slug==='ackman')  articles = articlesAckman
  if (slug==='gates')   articles = articlesGates

  return (
    <main className="bg-black min-h-screen px-6 py-8 space-y-10">
   {/* Header-Card */}
<div className="relative overflow-hidden rounded-2xl px-8 py-6 bg-gray-800/60 backdrop-blur-md border border-gray-700 shadow-lg flex flex-col sm:flex-row items-center sm:justify-between space-y-4 sm:space-y-0">
  <div className="absolute inset-0 bg-white/5 pointer-events-none" />

  {/* Bild */}
  <div className="relative flex-shrink-0 w-24 h-24 rounded-full overflow-hidden border-4 border-accent mr-6">
    <Image
      src={`/images/${slug}.png`}
      alt={mainName}
      fill
      className="object-cover"
    />
  </div>

  {/* Text + Button */}
  <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between">
    {/* Text */}
    <div className="text-center sm:text-left">
      <h1 className="leading-tight">
        <span className="block text-4xl font-orbitron text-white font-bold">
          {mainName}
        </span>
        {subtitle && (
          <span className="block mt-[-0.25rem] text-lg text-gray-500 font-normal">
            – {subtitle}
          </span>
        )}
      </h1>
      <p className="mt-2 text-sm text-gray-400">
        Periode: <span className="font-medium text-gray-200">{period}</span>
        {'  '}|{'  '}
        Aktualisiert am <span className="font-medium text-gray-200">{formattedDate}</span>
      </p>
      <p className="mt-4 text-2xl text-white font-semibold">
        Gesamtwert{' '}
        <span className="bg-accent text-black px-2 py-1 rounded numeric">
          {formatCurrency(totalVal, 'EUR')}
        </span>
      </p>
    </div>

    {/* Button */}
    <div className="mt-4 sm:mt-0 flex-shrink-0">
      <Link
        href={`/investor/${slug}/subscribe`}
        className="
          inline-flex items-center space-x-2
          bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
          text-white
          px-5 py-2
          rounded-full
          shadow-xl
          transition-transform transform hover:-translate-y-0.5
          ring-1 ring-green-500/40
        "
        aria-label="Updates erhalten"
      >
        <EnvelopeIcon className="w-5 h-5" />
        <span className="font-medium">Updates erhalten</span>
      </Link>
    </div>
  </div>
</div>
      {/* Optional: hier Deine Formular‐Komponente auf der eigenen /subscribe‐Seite */}
      {/* <InvestorSubscribeForm investorId={slug} /> */}


      {/* — Tabs + Tabelle in eigener Card — */}
      <InvestorTabs
        tab={tab}
        onTabChange={setTab}
        holdings={scaledHold}
        buys={buysHistory}
        sells={sellsHistory}
      />

      {/* — Charts (nur bei Bestände) in zwei Cards — */}
    {tab === 'holdings' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* Top 10Positionen */}
    <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-orbitron text-gray-100 text-center mb-4">
        Top 10 Positionen
      </h2>
      <ErrorBoundary fallbackRender={({error}) => <ErrorFallback message={error.message} />}>
        <TopPositionsBarChart data={top10} />
      </ErrorBoundary>
    </div>

    {/* Depot-Wert Verlauf */}
    <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-orbitron text-gray-100 text-center mb-4">
        Depot-Wert Verlauf
      </h2>
      <ErrorBoundary fallbackRender={({error}) => <ErrorFallback message={error.message} />}>
      <PortfolioValueChart data={valueHistory} />
      </ErrorBoundary>
    </div>
  </div>
)}
      {/* — Articles & Commentaries — */}
      {articles.length > 0 && (
        <div>
          <h2 className="text-xl font-orbitron text-gray-100 font-semibold mb-4 text-center">
            Artikel &amp; Kommentare
          </h2>
          <ArticleList articles={articles} />
        </div>
      )}
    </main>
  )
}