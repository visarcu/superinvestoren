// src/app/superinvestor/[slug]/page.tsx - MODERNISIERTE VERSION
'use client'

import React, { useState, FormEvent, useRef, useEffect } from 'react'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { 
  EnvelopeIcon, 
  ArrowUpRightIcon,
  ArrowLeftIcon,
  UserIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  CheckIcon,
  StarIcon
} from '@heroicons/react/24/outline'

import holdingsHistory from '@/data/holdings'
import InvestorTabs from '@/components/InvestorTabs'
import { stocks } from '@/data/stocks'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from '@/components/ErrorFallback'
import PortfolioValueChart from '@/components/PortfolioValueChart'
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

import articlesBuffett from '@/data/articles/buffett.json'
import articlesAckman from '@/data/articles/ackman.json'
import articlesGates from '@/data/articles/gates.json'
import ArticleList from '@/components/ArticleList'
import type { Article } from '@/components/ArticleList'

// Animation Hook (von Homepage übernommen)
const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);
  
  return [ref, isVisible] as const;
};

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
  loeb:'Daniel Loeb - Third Point',
  armitage:'John Armitage - Egerton Capital',
  rogers:'John Rogers - Ariel Appreciation Fund'
}

// Modernisierte Newsletter Komponente
function ModernNewsletterSignup({ investorName }: { investorName: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    if (!email.trim()) {
      setStatus('error')
      setMessage('Bitte gib eine E-Mail-Adresse ein')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message || 'Vielen Dank für deine Anmeldung!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Da ist etwas schiefgegangen.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Verbindungsfehler. Bitte versuche es nochmal.')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <CheckIcon className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-lg font-semibold text-green-400 mb-2">Erfolgreich angemeldet!</p>
        <p className="text-sm text-gray-400">Du erhältst Updates zu allen Investoren</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-4">
          <EnvelopeIcon className="w-4 h-4" />
          Newsletter
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {investorName} Updates erhalten
        </h3>
        <p className="text-gray-400 text-sm">
          Quartalsweise Insights zu Portfolio-Änderungen und Investment-Strategien
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="deine@email.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          required
        />
        
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-4 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-105 shadow-lg hover:shadow-green-500/25"
        >
          {status === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              Anmelden...
            </>
          ) : (
            <>
              <EnvelopeIcon className="w-4 h-4" />
              Newsletter abonnieren
            </>
          )}
        </button>
      </form>
      
      {status === 'error' && message && (
        <p className="text-sm text-red-400 text-center mt-2">{message}</p>
      )}
      
      <div className="flex items-center justify-center gap-6 text-xs text-gray-500 pt-2">
        <div className="flex items-center gap-2">
          <CheckIcon className="w-3 h-3 text-green-400" />
          <span>Quartalsweise Updates</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon className="w-3 h-3 text-green-400" />
          <span>Jederzeit kündbar</span>
        </div>
      </div>
    </div>
  )
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
  params: { slug: string }
}

export default function InvestorPage({ params: { slug } }: InvestorPageProps) {
  const titleFull = investorNames[slug] ?? slug
  const { name: mainName, subtitle } = splitInvestorName(titleFull)
  const [tab, setTab] = useState<'holdings' | 'buys' | 'sells' | 'activity'>('holdings')
  
  // Animation refs
  const [heroRef, heroVisible] = useIntersectionObserver(0.3);
  const [chartsRef, chartsVisible] = useIntersectionObserver(0.3);
  
  const snapshots = holdingsHistory[slug]
  
  if (!Array.isArray(snapshots) || snapshots.length < 1) return notFound()

  // Header data
  const latest = snapshots[snapshots.length - 1].data
  const previous = snapshots.length >= 2 
    ? snapshots[snapshots.length - 2].data 
    : { positions: [], date: '', totalValue: 0 }
  
  const formattedDate = latest.date?.split('-').reverse().join('.') || '–'
  const period = latest.date ? getPeriodFromDate(latest.date) : '–'

  // Build history for buys/sells
  const buildHistory = (isBuy: boolean): HistoryGroup[] =>
    snapshots.map((snap, idx) => {
      const prevRaw = idx > 0 ? snapshots[idx - 1].data.positions : []
      const prevMap = new Map<string, number>()
      prevRaw.forEach(p => prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares))

      const mergedEntries = Array.from(mergePositions(snap.data.positions).entries())
        .map(([cusip, { shares, value }]) => {
          const originalPosition = snap.data.positions.find(p => p.cusip === cusip)
          const stockData = stocks.find(s => s.cusip === cusip)
          
          let ticker = originalPosition?.ticker || stockData?.ticker || cusip.replace(/0+$/, '')
          let displayName = originalPosition?.name || stockData?.name || cusip
          
          const formattedName = ticker && displayName && ticker !== displayName 
            ? `${ticker} - ${displayName}`
            : displayName
          
          return { cusip, shares, value, name: formattedName, ticker }
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
            
          mergedEntries.push({ cusip, shares: 0, value: 0, name: formattedName, ticker })
        }
      }

      const full = mergedEntries.map(p => {
        const prevShares = prevMap.get(p.cusip) || 0
        const delta = p.shares - prevShares
        return { ...p, deltaShares: delta, pctDelta: prevShares > 0 ? delta / prevShares : 0 }
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
      
      const originalPosition = latest.positions.find(p => p.cusip === cusip)
      const stockData = stocks.find(s => s.cusip === cusip)
      
      let ticker = originalPosition?.ticker || stockData?.ticker || cusip.replace(/0+$/, '')
      let displayName = originalPosition?.name || stockData?.name || cusip
      
      const formattedName = ticker && displayName && ticker !== displayName 
        ? `${ticker} - ${displayName}`
        : displayName
      
      return {
        cusip, name: formattedName, ticker, shares, value,
        deltaShares: delta, pctDelta: prevShares > 0 ? delta / prevShares : 0
      }
    })

  const sortedHold = mergedHoldings.sort((a, b) => b.value - a.value)
  const holdings = sortedHold
  const totalVal = holdings.reduce((s, p) => s + p.value, 0)
  const top10 = holdings.slice(0, 10).map(p => ({ 
    name: p.name, 
    percent: (p.value / totalVal) * 100 
  }))

  // Value history
  const valueHistory = snapshots.map(snap => {
    const total = snap.data.positions.reduce((sum, p) => sum + p.value, 0)
    return { period: getPeriodFromDate(snap.data.date), value: total }
  })

  // Articles
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
    })).reverse()
  }

  const isNewInvestor = snapshots.length === 1

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Modernisierte Hero Section */}
      <section className="relative overflow-hidden bg-gray-950 noise-bg pt-24 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/8 via-gray-950 to-gray-950"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/4 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-blue-500/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link 
              href="/superinvestor" 
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück zu Super-Investoren
            </Link>
          </div>
          
          {/* New Investor Info */}
          {isNewInvestor && (
            <div className="mb-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <StarIcon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-blue-400 font-medium text-sm">Neu hinzugefügter Investor</p>
                  <p className="text-gray-400 text-xs">Historische Daten werden in den kommenden Quartalen ergänzt</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Hero Content */}
          <div ref={heroRef} className={`transform transition-all duration-1000 ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            
            {/* Main Hero Card */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5 rounded-3xl blur-2xl"></div>
              
              <div className="relative bg-gray-900/80 border border-gray-800 rounded-3xl p-8 lg:p-12 backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {slug === 'buffett' && (
                      <div className="absolute -top-3 -right-3 z-10">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                          <span className="text-black text-xl">👑</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      <div className="absolute -inset-3 bg-gradient-to-br from-green-500/30 via-blue-500/20 to-green-500/30 rounded-full blur-lg opacity-60"></div>
                      <div className="relative">
                        <InvestorAvatar
                          name={mainName}
                          imageUrl={`/images/${slug}.png`}
                          size="xl"
                          className="ring-4 ring-white/10 shadow-2xl"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Name & Info */}
                  <div className="flex-1 text-center lg:text-left space-y-4">
                    <div>
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                        <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                          {mainName}
                        </span>
                      </h1>
                      {subtitle && (
                        <p className="text-xl sm:text-2xl text-gray-300 font-medium mt-3">
                          {subtitle}
                        </p>
                      )}
                    </div>
                    
                    {/* Meta Badges */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium backdrop-blur-sm">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{period}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 text-gray-300 rounded-full text-sm backdrop-blur-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Aktualisiert {formattedDate}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Portfolio Value */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 to-emerald-500/15 rounded-2xl blur-xl"></div>
                    <div className="relative bg-gray-800/80 border border-gray-700 rounded-2xl p-6 lg:p-8 backdrop-blur-sm min-w-[280px] text-center lg:text-right">
                      <div className="flex items-center justify-center lg:justify-end gap-2 mb-3">
                        <ChartBarIcon className="w-5 h-5 text-green-400" />
                        <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                          Portfolio-Wert
                        </p>
                      </div>
                      <p className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                        <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                          {formatCurrency(totalVal, 'USD')}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500 mt-2 flex items-center justify-center lg:justify-end gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                        {holdings.length} Positionen
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Newsletter Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-2xl blur-xl"></div>
              <div className="relative bg-gray-900/60 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm">
                <div className="max-w-md mx-auto">
                  <ModernNewsletterSignup investorName={mainName} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Tabs & Table */}
        <div className="mb-16">
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
            holdings={holdings}
            buys={buysHistory}
            sells={sellsHistory}
          />
        </div>

        {/* Charts Section */}
        {tab === 'holdings' && (
          <div ref={chartsRef} className={`transform transition-all duration-1000 ${
            chartsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              
              {/* Top 10 Positions */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Top 10 Positionen</h2>
                    <p className="text-sm text-gray-400">Nach Portfolio-Gewichtung</p>
                  </div>
                </div>
                <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
                  <TopPositionsBarChart data={top10} />
                </ErrorBoundary>
              </div>

              {/* Portfolio Value History */}
              {snapshots.length > 1 ? (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Portfolio-Verlauf</h2>
                      <p className="text-sm text-gray-400">Entwicklung über Zeit</p>
                    </div>
                  </div>
                  <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
                    <PortfolioValueChart data={valueHistory} />
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                      <ArrowTrendingUpIcon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-400">Portfolio-Verlauf</h2>
                      <p className="text-sm text-gray-500">Noch nicht verfügbar</p>
                    </div>
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
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-16 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Cash-Position (Treasuries)</h2>
                    <p className="text-sm text-gray-400">
                      Entwicklung der liquiden Mittel über die letzten Quartale
                    </p>
                  </div>
                </div>
                
                <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
                  <div className="cash-chart-container">
                    <CashPositionChart data={cashSeries} />
                  </div>
                </ErrorBoundary>
                
                <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Aktueller Cash-Bestand:</span>
                    <span className="text-yellow-400 font-semibold text-lg">
                      {formatCurrency(cashSeries[cashSeries.length - 1]?.cash || 0, 'USD')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Articles & Commentaries */}
        {articles.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
                <UserIcon className="w-4 h-4" />
                Artikel & Kommentare
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Insights von
                <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> {mainName}</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Erhalte Einblicke in die Denkweise und Strategien durch Original-Artikel und Kommentare
              </p>
            </div>
            <ArticleList articles={articles} />
          </section>
        )}
      </div>
    </div>
  )
}