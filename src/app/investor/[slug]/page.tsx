// src/app/investor/[slug]/page.tsx
'use client'

import React, { useState } from 'react'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { 
  EnvelopeIcon, 
  ArrowUpRightIcon,
  UserIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

import holdingsHistory from '@/data/holdings'
import InvestorTabs from '@/components/InvestorTabs'
import { stocks } from '@/data/stocks'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from '@/components/ErrorFallback'
import PortfolioValueChart from '@/components/PortfolioValueChart'
import InvestorSubscribeForm from '@/components/InvestorSubscribeForm'
import InvestorAvatar from '@/components/InvestorAvatar'
import cashPositions from '@/data/cashPositions'
import CashPositionChart from '@/components/CashPositionChart'

// Dynamic imports
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
import articlesAckman from '@/data/articles/ackman.json'
import articlesGates from '@/data/articles/gates.json'
import ArticleList from '@/components/ArticleList'
import type { Article } from '@/components/ArticleList'

interface Position {
  cusip: string
  name: string
  shares: number
  value: number
  deltaShares: number
  pctDelta: number
}

interface HistoryGroup {
  period: string
  items: Position[]
}

interface CashFlowPoint {
  period: string
  buy: number
  sell: number
}

const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett – Berkshire Hathaway',
  ackman: 'Bill Ackman – Pershing Square Capital Management',
  gates: 'Bill & Melinda Gates Foundation Trust',
  chou: 'Francis Chou - Chou Associates Management',
  lawrence: 'Bryan R. Lawrence - Oakliff Capital Partners',
  roepers: 'Alex Roepers - Atlantic Investment Management',
  munger: 'Charlie Munger',
  pabrai: 'Mohnish Pabrai - Dalal Street',
  lou: 'Norbert Lou - Punch Card Management',
  wyden: 'Adam Wyden - ADW Capital Management',
  muhlenkamp: 'Ronald Muhlenkamp - Muhlenkamp & Co',
  tarasoff: 'Josh Tarasoff - Greenlea Lane Capital Management',
  vinall: 'Robert Vinall - RV Capital GmbH',
  welling: 'Glenn Welling - Engaged Capital',
  rolfe: 'David Rolfe - Wedgewood Partners',
  bloomstran: 'Chris Bloomstran - Semper Augustus Investments Group',
  karr: 'Robert Karr - Joho Capital',
  hong: 'Dennis Hong - Shawspring Partners',
  gregalexander: 'Greg Alexander - Conifer Management',
  dorsey: 'Pat Dorsey - Dorsey Asset Management',
  bares: 'Brian Bares - Bares Capital Management',
  berkowitz: 'Bruce Berkowitz - Fairholme Capital Management',
  watsa: 'Prem Watsa - Fairfax Financial Holdings',
  sosin: 'Clifford Sosin - CAS Investment Parners',
  einhorn: 'David Einhorn - Greenlight Capital',
  burn: 'Harry Burn - Sound Shore Management',
  brenton: 'Andrew Brenton - Turtle Creek Asset Management',
  train: 'Lindsell Train',
  greenberg: 'Glenn Greenberg - Brave Warrior Advisors',
  meritage: 'Nathaniel Simons - Meritage Group',
  ketterer: 'Sarah Ketterer - Causeway Capital Management',
  altarockpartners: 'Mark Massey - Altarock Partners',
  martin: 'Fred Martin - Disciplined Growth Investors',
  vulcanvalue: 'C.T. Fitzpatrick - Vulcan Value Partners',
  abrams: 'David Abrams - Abrams Capital Management',
  greenhaven: 'Edgar Wachenheim - Greenhaven Associates',
  tepper: 'David Tepper - Appaloosa Management',
  akre: 'Chuck Akre - Akre Capital Management',
  russo: 'Thomas Russo - Gardner Russe & Quinn',
  polen: 'Polen Capital Management',
  jensen: 'Jensen Investment Management',
  gayner: 'Thomas Gayner - Markel Group',
  yacktman: 'Donald Yacktman - Yacktman Asset Management',
  olstein: 'Robert Olstein - Olstein Capital Management',
  duan: 'Duan Yongping - H&H International Investment',
  hohn: 'Chris Hohn - TCI Fund Management',
  coleman: 'Chase Coleman - Tiger Global Management',
  icahn: 'Carl Icahn - Icahn Capital Management',
  ainslie: 'Lee Ainslie - Maverick Capital',
  mandel: 'Stephen Mandel - Lone Pine Capital',
  mairspower: 'Andrew R. Adams - Mairs & Power Growth Fund',
  cunniff: 'Ruane Cunniff – Sequoia Fund',
  hawkins: 'Mason Hawkins – Longleaf Partners',
  katz: 'David Katz',
  klarman: 'Seth Klarman - Baupost Group',
  spier: 'Guy Spier - Aquamarine Capital',
  triplefrond: 'Stuart McLaughlin - Triple Frond Partners',
  lilu: 'Li Lu - Himalaya Capital Management',
  marks: 'Howard Marks - Oaktree Capital Management',
  ubben: 'Jeffrey Ubben - Valueact Holdings',
  smith: 'Terry Smith - Fundsmith',
  donaldsmith: 'Donald Smith & Co.',
  dodgecox: 'Dodge & Cox Stock Fund',
  miller: 'Bill Miller - Miller Value Partners',
  cantillon: 'William von Mueffling - Cantillon Capital Management',
  whitman: 'Marty Whitman - Third Avenue Management',
  greenbrier: 'Greenbrier Partners Capital Management',
  peltz: 'Nelson Peltz - Trian Fund Management',
  kantesaria: 'Dev Kantesaria - Valley Forge Capital Management',
  viking: 'Ole Andreas Halvorsen - Viking Global Investors',
  ellenbogen: 'Henry Ellenbogen - Durable Capital Partners'
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

function formatCurrency(amount: number, currency: 'EUR' | 'USD' = 'USD') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function mergePositions(raw: { cusip: string; shares: number; value: number }[]) {
  const map = new Map<string, { shares: number; value: number }>()
  raw.forEach(p => {
    const prev = map.get(p.cusip)
    if (prev) {
      prev.shares += p.shares
      prev.value += p.value
    } else {
      map.set(p.cusip, { shares: p.shares, value: p.value })
    }
  })
  return map
}

type InvestorPageProps = {
  params: {
    slug: string
  }
}

export default function InvestorPage({ params: { slug } }: InvestorPageProps) {
  const titleFull = investorNames[slug] ?? slug
  const { name: mainName, subtitle } = splitInvestorName(titleFull)
  const [tab, setTab] = useState<'holdings' | 'buys' | 'sells' | 'activity'>('holdings')
  
  const snapshots = holdingsHistory[slug]
  if (!Array.isArray(snapshots) || snapshots.length < 2) return notFound()

  // Header data
  const latest = snapshots[snapshots.length - 1].data
  const previous = snapshots[snapshots.length - 2].data
  const formattedDate = latest.date?.split('-').reverse().join('.') || '–'
  const period = latest.date ? getPeriodFromDate(latest.date) : '–'

  // Build history for buys/sells
  const buildHistory = (isBuy: boolean): HistoryGroup[] =>
    snapshots.map((snap, idx) => {
      const prevRaw = idx > 0 ? snapshots[idx - 1].data.positions : []
      const prevMap = new Map<string, number>()
      prevRaw.forEach(p => prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares))

      const mergedEntries = Array.from(mergePositions(snap.data.positions).entries())
        .map(([cusip, { shares, value }]) => ({
          cusip,
          shares,
          value,
          name: stocks.find(s => s.cusip === cusip)?.name || cusip
        }))

      const seen = new Set(mergedEntries.map(e => e.cusip))
      for (const [cusip, prevShares] of prevMap.entries()) {
        if (!seen.has(cusip)) {
          mergedEntries.push({
            cusip,
            shares: 0,
            value: 0,
            name: stocks.find(s => s.cusip === cusip)?.name || cusip
          })
        }
      }

      const full = mergedEntries.map(p => {
        const prevShares = prevMap.get(p.cusip) || 0
        const delta = p.shares - prevShares
        return {
          ...p,
          deltaShares: delta,
          pctDelta: prevShares > 0 ? delta / prevShares : 0
        }
      })

      return {
        period: getPeriodFromDate(snap.data.date),
        items: full.filter(p => isBuy ? p.deltaShares > 0 : p.deltaShares < 0)
      }
    }).reverse()

  const buysHistory = buildHistory(true)
  const sellsHistory = buildHistory(false)

  // Top 10 positions
  const prevMap = new Map<string, number>()
  previous.positions.forEach(p => prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares))

  const mergedHoldings = Array.from(mergePositions(latest.positions).entries())
    .map(([cusip, { shares, value }]) => {
      const prevShares = prevMap.get(cusip) || 0
      const delta = shares - prevShares
      return {
        cusip,
        name: stocks.find(s => s.cusip === cusip)?.name || cusip,
        shares,
        value,
        deltaShares: delta,
        pctDelta: prevShares > 0 ? delta / prevShares : 0
      }
    })

  const sortedHold = mergedHoldings.sort((a, b) => b.value - a.value)
  const scaledHold = sortedHold.map(p => ({ ...p, value: p.value / 1000 }))
  const totalVal = scaledHold.reduce((s, p) => s + p.value, 0)
  const top10 = scaledHold.slice(0, 10).map(p => ({ name: p.name, percent: (p.value / totalVal) * 100 }))

  // Cashflow
  const recentBuys = buysHistory.slice(0, 8)
  const recentSells = sellsHistory.slice(0, 8)
  const cashflowPoints: CashFlowPoint[] = recentBuys.map((grp, idx) => {
    const buySum = grp.items.reduce((sum, p) => sum + p.deltaShares * (p.value / p.shares), 0)
    const sellSum = recentSells[idx].items.reduce((sum, p) => sum + (-p.deltaShares) * (p.value / p.shares), 0)
    return { period: grp.period, buy: buySum, sell: sellSum }
  }).reverse()

  const valueHistory = snapshots.map(snap => {
    const total = snap.data.positions.reduce((sum, p) => sum + p.value, 0)
    return { period: getPeriodFromDate(snap.data.date), value: total }
  })

  // Articles
  let articles: Article[] = []
  if (slug === 'buffett') articles = articlesBuffett


  // Cash series for Buffett
  let cashSeries: { period: string; cash: number }[] = []
  if (slug === 'buffett') {
    const list = cashPositions.buffett || []
    cashSeries = list.map(snap => ({
      period: getPeriodFromDate(snap.date),
      cash: snap.cash
    }))
  }

  return (
    <div className="min-h-screen bg-gray-950">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-950">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          
          {/* Investor Header Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 mb-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
              
              {/* Avatar & Crown */}
              <div className="relative flex-shrink-0">
                {slug === 'buffett' && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <span className="text-yellow-400 text-3xl">👑</span>
                  </div>
                )}
                <InvestorAvatar
                  name={mainName}
                  imageUrl={`/images/${slug}.png`}
                  size="xl"
                  className="ring-4 ring-blue-500/20"
                />
              </div>
              
              {/* Info */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  {mainName}
                </h1>
                {subtitle && (
                  <p className="text-lg text-gray-400 mb-4">
                    {subtitle}
                  </p>
                )}
                
                {/* Stats */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                  <div className="flex items-center gap-2 text-gray-400">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-sm">
                      {period} • Aktualisiert {formattedDate}
                    </span>
                  </div>
                </div>
                
                {/* Portfolio Value */}
                <div className="mb-6">
                  <p className="text-sm text-gray-400 mb-1">Gesamtwert</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(totalVal * 1000, 'USD')}
                  </p>
                </div>
                
                {/* CTA Button */}
                <Link
                  href={`/investor/${slug}/subscribe`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg hover:shadow-green-500/25"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  Updates erhalten
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs & Table */}
        <div className="mb-12">
          <InvestorTabs
            tab={tab}
            onTabChange={(newTab) => {
              if (
                newTab === 'holdings' ||
                newTab === 'buys' ||
                newTab === 'sells' ||
                newTab === 'activity'
              ) {
                setTab(newTab)
              }
            }}
            holdings={scaledHold}
            buys={buysHistory}
            sells={sellsHistory}
          />
        </div>

        {/* Charts - Only show for holdings tab */}
        {tab === 'holdings' && (
          <>
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              
              {/* Top 10 Positions */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <ChartBarIcon className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">
                    Top 10 Positionen
                  </h2>
                </div>
                <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
                  <TopPositionsBarChart data={top10} />
                </ErrorBoundary>
              </div>

              {/* Portfolio Value History */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                  <h2 className="text-xl font-bold text-white">
                    Portfolio-Verlauf
                  </h2>
                </div>
                <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
                  <PortfolioValueChart data={valueHistory} />
                </ErrorBoundary>
              </div>
            </div>

            {/* Cash Position Chart (for Buffett) */}
            {slug === 'buffett' && cashSeries.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <ChartBarIcon className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-bold text-white">
                    Cash-Position (Treasuries)
                  </h2>
                </div>
                <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
                  <CashPositionChart data={cashSeries} />
                </ErrorBoundary>
              </div>
            )}
          </>
        )}

        {/* Articles & Commentaries */}
        {articles.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <UserIcon className="w-5 h-5 text-gray-400" />
              <h2 className="text-2xl font-bold text-white">
                Artikel & Kommentare
              </h2>
            </div>
            <ArticleList articles={articles} />
          </div>
        )}
      </div>
    </div>
  )
}