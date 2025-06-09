// src/app/investor/[slug]/page.tsx
'use client'

import React, { useState, FormEvent } from 'react'
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
  CalendarIcon
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

// Kompakte Newsletter Komponente für Header
function CompactNewsletterSignup({ investorName }: { investorName: string }) {
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
      <div className="text-center">
        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
          <span className="text-green-400 text-lg">✓</span>
        </div>
        <p className="text-sm text-green-400 font-medium mb-1">Erfolgreich angemeldet!</p>
        <p className="text-xs text-gray-500">Du erhältst Updates zu allen Investoren</p>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="deine@email.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="w-full px-3 py-2 text-sm bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          required
        />
        
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              Anmelden...
            </>
          ) : (
            'Abonnieren'
          )}
        </button>
      </form>
      
      {status === 'error' && message && (
        <p className="text-xs text-red-400 mt-2">{message}</p>
      )}
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
  const scaledHold = sortedHold.map(p => ({ ...p, value: p.value / 1000 }))
  const totalVal = scaledHold.reduce((s, p) => s + p.value, 0)
  const top10 = scaledHold.slice(0, 10).map(p => ({ name: p.name, percent: (p.value / totalVal) * 100 }))

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
    })).reverse() // GEÄNDERT: .reverse() hinzugefügt für korrekte Reihenfolge (alt links -> neu rechts)
  }

  const isNewInvestor = snapshots.length === 1

  return (
    <div className="min-h-screen bg-gray-950">
    

{/* Hero Section - VERBESSERT: Ausgewogenes Layout + umgekehrter Gradient */}
<section className="relative overflow-hidden bg-gray-950">
        <div className="absolute inset-0">
          {/* GEÄNDERT: Gradient von oben (blau) nach unten (schwarz) */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/8 via-gray-950 to-gray-950"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/4 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-purple-500/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          
          {/* Breadcrumb / Back Navigation */}
          <div className="mb-8">
            <Link 
              href="/superinvestor" 
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück zu Super-Investoren
            </Link>
          </div>
          
          {/* NEU: Info für neue Investoren */}
          {isNewInvestor && (
            <div className="mb-8 bg-gradient-to-r from-blue-900/10 to-purple-900/10 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-blue-400 font-medium text-sm">Neu hinzugefügter Investor</p>
                  <p className="text-gray-400 text-xs">Historische Daten werden in den kommenden Quartalen ergänzt</p>
                </div>
              </div>
            </div>
          )}
          
          {/* NEUES LAYOUT: Bessere Balance */}
          <div className="space-y-8">
            
            {/* Top Row: Avatar, Name & Portfolio Value */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-purple-600/5 rounded-3xl blur-2xl"></div>
              
              <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-950/80 border border-gray-800/60 rounded-3xl p-8 lg:p-12 backdrop-blur-xl">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {slug === 'buffett' && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-black text-lg">👑</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-blue-500/30 rounded-full blur-lg opacity-60"></div>
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
                  
                  {/* Name & Meta Info */}
                  <div className="flex-1 text-center lg:text-left space-y-4">
                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
                        {mainName}
                      </h1>
                      {subtitle && (
                        <p className="text-lg sm:text-xl text-gray-300 font-medium mt-2">
                          {subtitle}
                        </p>
                      )}
                    </div>
                    
                    {/* Meta Information */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full">
                        <CalendarIcon className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-300 font-medium">{period}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300">Aktualisiert {formattedDate}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Portfolio Value - Prominent rechts */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 to-emerald-500/15 rounded-2xl blur-xl"></div>
                    <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/60 rounded-2xl p-6 lg:p-8 backdrop-blur-sm min-w-[280px] text-center lg:text-right">
                      <div className="flex items-center justify-center lg:justify-end gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                          Portfolio-Wert
                        </p>
                      </div>
                      <p className="text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                        {formatCurrency(totalVal * 1000, 'USD')}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {scaledHold.length} Positionen
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom Row: Newsletter - Volle Breite */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 to-purple-600/8 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/50 rounded-2xl p-6 lg:p-8 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    
                    {/* Left: Newsletter Info */}
                    <div className="text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                        <EnvelopeIcon className="w-5 h-5 text-blue-400" />
                        <p className="text-lg font-semibold text-white">
                          Investment Updates erhalten
                        </p>
                      </div>
                      <p className="text-gray-300 mb-2">
                        Quartalsweise Insights zu <span className="text-white font-medium">{mainName}</span> und anderen Top-Investoren
                      </p>
                      <p className="text-sm text-gray-500">
                        Keine Spam-E-Mails. Du kannst dich jederzeit abmelden.
                      </p>
                    </div>
                    
                    {/* Right: Newsletter Form */}
                    <div className="flex justify-center md:justify-end">
                      <div className="w-full max-w-sm">
                        <CompactNewsletterSignup investorName={mainName} />
                      </div>
                    </div>
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

              {/* Portfolio Value History */}
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

            {/* Cash Position Chart (for Buffett) - VERBESSERT */}
{/* Cash Position Chart (for Buffett) - KORRIGIERT */}
{slug === 'buffett' && cashSeries.length > 0 && (
  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-12">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center">
        <ChartBarIcon className="w-5 h-5 text-yellow-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">
          Cash-Position (Treasuries)
        </h2>
        <p className="text-sm text-gray-400">
          Entwicklung der liquiden Mittel über die letzten Quartale
        </p>
      </div>
    </div>
    
    <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
      {/* WICHTIG: cash-chart-container Klasse für Styling */}
      <div className="cash-chart-container">
        <CashPositionChart data={cashSeries} />
      </div>
    </ErrorBoundary>
    
    {/* Zusätzliche Info */}
    <div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Aktueller Cash-Bestand:</span>
        <span className="text-yellow-400 font-semibold">
          {formatCurrency(cashSeries[cashSeries.length - 1]?.cash || 0, 'USD')}
        </span>
      </div>
    </div>
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