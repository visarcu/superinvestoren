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
  duan: 'Duan Yongping - H&H International Investment',
  hohn: 'Chris Hohn - TCI Fund Management',
  coleman: 'Chase Coleman - Tiger Global Management',
  icahn: 'Carl Icahn - Icahn Capital Management',
  ainslie: 'Lee Ainslie - Maverick Capital',
  mandel: 'Stephen Mandel - Lone Pine Capital',

  cunniff: 'Ruane Cunniff – Sequoia Fund',
  hawkins: 'Mason Hawkins – Longleaf Partners',
  spier: 'Guy Spier - Aquamarine Capital',
  triplefrond: 'Stuart McLaughlin - Triple Frond Partners',
  lilu: 'Li Lu - Himalaya Capital Management',
  marks: 'Howard Marks - Oaktree Capital Management',
  ubben: 'Jeffrey Ubben - Valueact Holdings',
  smith: 'Terry Smith - Fundsmith',
  donaldsmith: 'Donald Smith & Co.',

  miller: 'Bill Miller - Miller Value Partners',
  cantillon: 'William von Mueffling - Cantillon Capital Management',
  whitman: 'Marty Whitman - Third Avenue Management',
  greenbrier: 'Greenbrier Partners Capital Management',
  peltz: 'Nelson Peltz - Trian Fund Management',
  kantesaria: 'Dev Kantesaria - Valley Forge Capital Management',
  viking: 'Ole Andreas Halvorsen - Viking Global Investors',
  ellenbogen: 'Henry Ellenbogen - Durable Capital Partners',

  // Neue Investoren hinzufügen
  torray: 'Torray Funds',
  burry: 'Michael Burry - Scion Asset Management',
  klarman: 'Seth Klarman - Baupost Group',
  dodgecox: 'Dodge & Cox Stock Fund',
  olstein: 'Robert Olstein - Olstein Capital Management',
  nygren:'Bill Nygren - Oakmark Select Fund',
  katz: 'David Katz - Matrix Asset Advisors',
  davis: 'Christopher Davis - Davis Advisors',
  mairspower: 'Andrew R. Adams - Mairs & Power Growth Fund',
  tangen:'Nicolai Tangen - AKO Capital',
  bobrinskoy: 'Chalres Bobrinskoy - Ariel Focus Fund',
  loeb:'Daniel Loeb - Third Point'
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

// Hilfsfunktion: Erstelle leeren Previous-Snapshot
function createEmptySnapshot() {
  return {
    data: {
      positions: [],
      date: '',
      totalValue: 0
    }
  }
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
  
  // GEÄNDERT: Akzeptiere auch einzelne Snapshots
  if (!Array.isArray(snapshots) || snapshots.length < 1) return notFound()

  // Header data - sicherer Zugriff auf previous
  const latest = snapshots[snapshots.length - 1].data
  const previous = snapshots.length >= 2 
    ? snapshots[snapshots.length - 2].data 
    : { positions: [], date: '', totalValue: 0 } // Fallback für einzelne Snapshots
  
  const formattedDate = latest.date?.split('-').reverse().join('.') || '–'
  const period = latest.date ? getPeriodFromDate(latest.date) : '–'

  // Build history for buys/sells - ANGEPASST für einzelne Snapshots
  const buildHistory = (isBuy: boolean): HistoryGroup[] =>
    snapshots.map((snap, idx) => {
      // Wenn es der erste Snapshot ist, verwende leeren Previous
      const prevRaw = idx > 0 ? snapshots[idx - 1].data.positions : []
      const prevMap = new Map<string, number>()
      prevRaw.forEach(p => prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares))

      const mergedEntries = Array.from(mergePositions(snap.data.positions).entries())
        .map(([cusip, { shares, value }]) => {
          // Finde die Original-Position für ticker/name
          const originalPosition = snap.data.positions.find(p => p.cusip === cusip)
          const stockData = stocks.find(s => s.cusip === cusip)
          
          let ticker = originalPosition?.ticker || stockData?.ticker || cusip.replace(/0+$/, '')
          let displayName = originalPosition?.name || stockData?.name || cusip
          
          // Format: "TICKER - Company Name"
          const formattedName = ticker && displayName && ticker !== displayName 
            ? `${ticker} - ${displayName}`
            : displayName
          
          return {
            cusip,
            shares,
            value,
            name: formattedName,
            ticker
          }
        })

      const seen = new Set(mergedEntries.map(e => e.cusip))
      for (const [cusip, prevShares] of prevMap.entries()) {
        if (!seen.has(cusip)) {
          const stockData = stocks.find(s => s.cusip === cusip)
          let ticker = stockData?.ticker || cusip.replace(/0+$/, '')
          let displayName = stockData?.name || cusip
          
          const formattedName = ticker && displayName && ticker !== displayName 
            ? `${ticker} - ${displayName}`
            : displayName
            
          mergedEntries.push({
            cusip,
            shares: 0,
            value: 0,
            name: formattedName,
            ticker
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

  // Top 10 positions - SICHER für einzelne Snapshots
  const prevMap = new Map<string, number>()
  previous.positions.forEach(p => prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares))

  const mergedHoldings = Array.from(mergePositions(latest.positions).entries())
    .map(([cusip, { shares, value }]) => {
      const prevShares = prevMap.get(cusip) || 0
      const delta = shares - prevShares
      
      // Finde die Position in den originalen Daten um ticker zu bekommen
      const originalPosition = latest.positions.find(p => p.cusip === cusip)
      const stockData = stocks.find(s => s.cusip === cusip)
      
      // Versuche ticker und name zu bestimmen
      let ticker = originalPosition?.ticker || stockData?.ticker || cusip.replace(/0+$/, '')
      let displayName = originalPosition?.name || stockData?.name || cusip
      
      // Format: "TICKER - Company Name" (wie bei anderen Investoren)
      const formattedName = ticker && displayName && ticker !== displayName 
        ? `${ticker} - ${displayName}`
        : displayName
      
      return {
        cusip,
        name: formattedName,
        ticker, // Für Links zu Aktien-Seiten
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

  // Cashflow - ANGEPASST für wenige Snapshots
  const maxHistory = Math.min(8, snapshots.length)
  const recentBuys = buysHistory.slice(0, maxHistory)
  const recentSells = sellsHistory.slice(0, maxHistory)
  
  const cashflowPoints: CashFlowPoint[] = recentBuys.map((grp, idx) => {
    const buySum = grp.items.reduce((sum, p) => sum + p.deltaShares * (p.value / Math.max(p.shares, 1)), 0)
    const sellSum = recentSells[idx]?.items.reduce((sum, p) => sum + (-p.deltaShares) * (p.value / Math.max(p.shares, 1)), 0) || 0
    return { period: grp.period, buy: buySum, sell: sellSum }
  }).reverse()

  // Value history - funktioniert auch mit einem Snapshot
  const valueHistory = snapshots.map(snap => {
    const total = snap.data.positions.reduce((sum, p) => sum + p.value, 0)
    return { period: getPeriodFromDate(snap.data.date), value: total }
  })

  // Articles - ERWEITERT für neue Investoren
  let articles: Article[] = []
  if (slug === 'buffett') articles = articlesBuffett
  if (slug === 'ackman') articles = articlesAckman
  if (slug === 'gates') articles = articlesGates

  // Cash series for Buffett
  let cashSeries: { period: string; cash: number }[] = []
  if (slug === 'buffett') {
    const list = cashPositions.buffett || []
    cashSeries = list.map(snap => ({
      period: getPeriodFromDate(snap.date),
      cash: snap.cash
    }))
  }

  // HINWEIS für neue Investoren
  const isNewInvestor = snapshots.length === 1

  return (
    <div className="min-h-screen bg-gray-950">
      
   
{/* Hero Section */}
<section className="relative overflow-hidden bg-gray-950">
  <div className="absolute inset-0">
    <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900"></div>
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"></div>
  </div>
  
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
    
    {/* NEU: Info für neue Investoren */}
    {isNewInvestor && (
      <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">
            Neu hinzugefügter Investor - Historische Daten werden in den kommenden Quartalen ergänzt
          </span>
        </div>
      </div>
    )}
    
    {/* Investor Header Card */}
    <div className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 border border-gray-800/50 rounded-2xl p-8 mb-8 backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row items-start gap-12">
        
        {/* Left: Avatar & Main Info */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 flex-1">
          
          {/* Avatar & Crown */}
          <div className="relative flex-shrink-0">
            {slug === 'buffett' && (
              <div className="absolute -top-3 -right-3 z-10">
                <div className="bg-yellow-400/20 rounded-full p-1">
                  <span className="text-yellow-400 text-2xl">👑</span>
                </div>
              </div>
            )}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
              <InvestorAvatar
                name={mainName}
                imageUrl={`/images/${slug}.png`}
                size="xl"
                className="relative ring-2 ring-blue-500/30 shadow-2xl"
              />
            </div>
          </div>
          
          {/* Info */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
                {mainName}
              </h1>
              {subtitle && (
                <p className="text-xl text-gray-400 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-2 text-gray-400">
              <CalendarIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">
                {period} • Aktualisiert {formattedDate}
              </span>
            </div>
            
            {/* Portfolio Value */}
            <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-2 font-medium">Gesamtwert</p>
              <p className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {formatCurrency(totalVal * 1000, 'USD')}
              </p>
            </div>
          </div>
        </div>

        {/* Right: CTA Section */}
        <div className="flex-shrink-0 lg:self-start lg:mt-8">
          <div className="relative">
            {/* Decorative arrow */}
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 hidden lg:block">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-12 h-px bg-gradient-to-r from-transparent to-gray-600"></div>
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  className="text-gray-500"
                >
                  <path 
                    d="M7 17L17 7M17 7H7M17 7V17" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="opacity-60"
                  />
                </svg>
              </div>
            </div>
            
            {/* CTA Button */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl blur-lg"></div>
              <Link
                href={`/investor/${slug}/subscribe`}
                className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-600/50 hover:border-gray-500 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl group backdrop-blur-sm"
              >
                <EnvelopeIcon className="w-4 h-4 group-hover:text-blue-400 transition-colors duration-200" />
                Updates erhalten
                <div className="w-4 h-4 rounded-full bg-gray-700 group-hover:bg-blue-500/20 flex items-center justify-center transition-all duration-200">
                  <ArrowUpRightIcon className="w-3 h-3 group-hover:translate-x-px group-hover:-translate-y-px transition-transform duration-200" />
                </div>
              </Link>
            </div>
          </div>
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

              {/* Portfolio Value History - nur anzeigen wenn mehr als 1 Snapshot */}
              {snapshots.length > 1 ? (
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
              ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <ArrowTrendingUpIcon className="w-5 h-5 text-gray-500" />
                    <h2 className="text-xl font-bold text-gray-400">
                      Portfolio-Verlauf
                    </h2>
                  </div>
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <ChartBarIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">
                        Verlaufsdaten werden verfügbar, sobald weitere Quartale hinzugefügt werden
                      </p>
                    </div>
                  </div>
                </div>
              )}
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