// src/app/analyse/stocks/[ticker]/super-investors/page.tsx - MIT DEUTSCHER FORMATIERUNG
import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import InvestorAvatar from '@/components/InvestorAvatar'  
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { 
  ArrowLeftIcon, 
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  PlusIcon,
  MinusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

// ✅ CLIENT-SIDE CHART COMPONENT MIT DEUTSCHER FORMATIERUNG
const ClientChart = dynamic(() => {
  return Promise.resolve(function HistoricalChart({ data }: { data: any[] }) {
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = require('recharts')
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="quarter" 
            stroke="#9CA3AF" 
            fontSize={12}
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis 
            yAxisId="value"
            orientation="left"
            stroke="#9CA3AF" 
            fontSize={12}
            tick={{ fill: '#9CA3AF' }}
            tickFormatter={(value: number) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mio.`}
          />
          <YAxis 
            yAxisId="holders"
            orientation="right"
            stroke="#9CA3AF" 
            fontSize={12}
            tick={{ fill: '#9CA3AF' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
            formatter={(value: any, name: string) => {
              if (name === 'totalValue') {
                return [`${value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio.`, 'Gesamtwert']
              }
              return [value, 'Holdings']
            }}
          />
          <Line 
            yAxisId="value"
            type="monotone" 
            dataKey="totalValue" 
            stroke="#10B981" 
            strokeWidth={3}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
          />
          <Line 
            yAxisId="holders"
            type="monotone" 
            dataKey="holders" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    )
  })
}, { 
  ssr: false,
  loading: () => (
    <div className="h-64 bg-theme-tertiary/10 rounded-lg flex items-center justify-center">
      <p className="text-theme-muted">Chart wird geladen...</p>
    </div>
  )
})

// Featured tickers
const FEATURED_TICKERS = ['nvda', 'aapl', 'amzn', 'googl']

// Dynamic imports
const WatchlistButton = dynamic(() => import('@/components/WatchlistButton'), { ssr: false })

// ISR
export const revalidate = 3600

export async function generateStaticParams() {
  return FEATURED_TICKERS.map((t) => ({
    ticker: t.toLowerCase()
  }))
}

// Helper Functions
function normalizeHoldingsData(data: any): { date: string; positions: any[] } {
  if ('form' in data && data.form === '13F-HR') {
    return {
      date: data.date,
      positions: data.positions.map((pos: any) => ({
        cusip: pos.cusip,
        name: pos.name,
        shares: pos.shares,
        value: pos.value,
        ticker: pos.ticker
      }))
    };
  }
  
  return {
    date: data.date,
    positions: data.positions.map((pos: any) => ({
      cusip: pos.cusip,
      name: pos.name,
      shares: pos.shares,
      value: pos.value,
      ticker: pos.ticker
    }))
  };
}

function extractQuarter(data: any): string {
  if ('quarterKey' in data) {
    return data.quarterKey;
  }
  
  const date = new Date(data.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  let quarter: number;
  if (month <= 3) quarter = 1;
  else if (month <= 6) quarter = 2;
  else if (month <= 9) quarter = 3;
  else quarter = 4;
  
  return `${year}-Q${quarter}`;
}

function getLatestQuarterFromData(): string {
  let latestQuarter = 'Q1';
  let latestDate = '';
  
  Object.values(holdingsHistory).forEach(snaps => {
    if (snaps.length > 0) {
      const latest = snaps[snaps.length - 1];
      const normalizedData = normalizeHoldingsData(latest.data);
      const filingQuarter = extractQuarter(latest.data);
      
      if (normalizedData.date > latestDate) {
        latestDate = normalizedData.date;
        const [year, quarterPart] = filingQuarter.split('-');
        const filingQ = parseInt(quarterPart.replace('Q', ''));
        
        let reportedQ = filingQ - 1;
        let reportedYear = parseInt(year);
        
        if (reportedQ === 0) {
          reportedQ = 4;
          reportedYear = reportedYear - 1;
        }
        
        latestQuarter = `Q${reportedQ}`;
      }
    }
  });
  
  return latestQuarter;
}

// ✅ DEUTSCHE WÄHRUNGSFORMATIERUNG
function formatCurrencyGerman(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} Mrd.`;
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} Mio.`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toLocaleString('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} Tsd.`;
  }
  return amount.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// ✅ KORRIGIERTE FUNKTION: Historische Daten extrahieren
function getHistoricalData(
  ticker: string, 
  stock: any, 
  currentHoldings: any[], 
  currentTotalValue: number
): any[] {
  console.log('=== HISTORICAL DATA DEBUG ===')
  console.log('Ticker:', ticker)
  console.log('Current total value passed:', currentTotalValue)
  
  // Alle verfügbaren Quartale sammeln und korrekt zuordnen
  const quarterlyData = new Map<string, { totalValue: number, holderCount: number }>()
  
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    snaps.forEach(snap => {
      const normalizedData = normalizeHoldingsData(snap.data)
      
      // ✅ KORREKTE QUARTALS-LOGIK: Filing bezieht sich auf vorheriges Quartal
      let reportedQuarter: string
      if ('quarterKey' in snap.data && typeof snap.data.quarterKey === 'string') {
        const filingQuarter = snap.data.quarterKey as string
        const [year, quarterPart] = filingQuarter.split('-')
        const filingQ = parseInt(quarterPart.replace('Q', ''))
        
        let reportedQ = filingQ - 1
        let reportedYear = parseInt(year)
        
        if (reportedQ === 0) {
          reportedQ = 4
          reportedYear = reportedYear - 1
        }
        
        reportedQuarter = `${reportedYear}-Q${reportedQ}`
      } else {
        // Fallback für alte Datenstruktur
        reportedQuarter = snap.quarter
      }
      
      const findTickerPositions = (positions: any[]) => {
        return positions.filter(pos => {
          if (pos.ticker?.toLowerCase() === ticker.toLowerCase()) return true
          return pos.cusip === stock.cusip
        })
      }
      
      const positions = findTickerPositions(normalizedData.positions || [])
      if (positions.length > 0) {
        const positionValue = positions.reduce<number>((sum: number, pos: any) => sum + pos.value, 0)
        
        // Debug für jeden Investor
        console.log(`${slug} ${reportedQuarter}: ${positions.length} positions, value: ${positionValue}`)
        
        const existing = quarterlyData.get(reportedQuarter) || { totalValue: 0, holderCount: 0 }
        quarterlyData.set(reportedQuarter, {
          totalValue: existing.totalValue + positionValue,
          holderCount: existing.holderCount + 1
        })
      }
    })
  })
  
  console.log('Quarterly data aggregated:', Array.from(quarterlyData.entries()))
  
  // Sortieren und nur vergangene Quartale zeigen
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1
  const currentQ = Math.ceil(currentMonth / 3)
  
  // Juli 2025 = Q3 2025, aber Q2 2025 ist noch nicht abgeschlossen
  // Verfügbare Daten: bis Q1 2025 (berichtet in Mai 2025 Filings)
  let maxYear = currentYear
  let maxQ = currentQ - 1  // Ein Quartal zurück
  
  // Q3 2025 (Juli) -> max Q2 2025, aber Q2 ist noch nicht abgeschlossen
  // Also Q1 2025 ist das letzte verfügbare
  if (currentMonth <= 7) { // Bis Juli
    maxQ = currentQ - 2  // Zwei Quartale zurück
  }
  
  if (maxQ <= 0) {
    maxQ = 4 + maxQ
    maxYear = currentYear - 1
  }
  
  console.log('DEBUG: Current:', currentMonth, currentYear, 'Q' + currentQ)
  console.log('DEBUG: Max reportable:', maxYear, 'Q' + maxQ)
  
  const historicalResult = Array.from(quarterlyData.entries())
    .filter(([quarter]) => {
      const [year, qPart] = quarter.split('-')
      const qNum = parseInt(qPart.replace('Q', ''))
      const qYear = parseInt(year)
      
      // Nur Quartale bis zum letzten vollständigen Quartal zeigen
      if (qYear < maxYear) return true
      if (qYear === maxYear && qNum <= maxQ) return true
      return false
    })
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8) // Letzte 8 Quartale
    .map(([quarter, data]) => ({
      quarter: quarter.replace('-', ' '), // "2024-Q4" -> "2024 Q4"
      totalValue: data.totalValue / 1_000_000, // in Millionen
      holders: data.holderCount,
      formattedValue: formatCurrencyGerman(data.totalValue)
    }))
  
  // ✅ FIX: Ersetze das neueste Quartal mit aktuellen Holdings-Daten
  if (historicalResult.length > 0) {
    const latestQuarter = historicalResult[historicalResult.length - 1]
    console.log('REPLACING latest quarter data:')
    console.log('Old value:', latestQuarter.totalValue * 1_000_000)
    console.log('New value:', currentTotalValue)
    
    latestQuarter.totalValue = currentTotalValue / 1_000_000
    latestQuarter.formattedValue = formatCurrencyGerman(currentTotalValue)
    latestQuarter.holders = currentHoldings.length
  }
  
  console.log('Final result (after correction):', historicalResult)
  console.log('=== END DEBUG ===')
  
  return historicalResult
}

// Live-Preis von FMP
async function fetchLivePrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote-short/${symbol}?apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) throw new Error('Live price fetch failed')
  const [data] = await res.json()
  return data.price
}

// Historische Kursdaten von FMP
async function fetchHistorical(symbol: string): Promise<{ date: string; close: number }[]> {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 * 60 * 6 } }
  )
  if (!res.ok) throw new Error('Historical fetch failed')
  const { historical = [] } = await res.json()
  return (historical as any[]).reverse()
}

export default async function SuperInvestorsPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find(s => s.ticker === ticker) ?? notFound()

  // 1) Live-Preis
  let livePrice: number | null = null
  try {
    livePrice = await fetchLivePrice(ticker)
  } catch {
    console.warn(`Live price for ${ticker} could not be fetched.`)
  }

  // 2) Historische Daten
  let history: { date: string; close: number }[] = []
  try {
    history = await fetchHistorical(ticker)
  } catch {
    console.warn(`Historical data for ${ticker} could not be fetched.`)
  }

  // 3) Performance berechnen
  let changePercent: number | null = null
  let performancePeriod = '1D'
  
  if (livePrice && history.length > 1) {
    const previousClose = history[history.length - 2]?.close
    if (previousClose) {
      changePercent = ((livePrice - previousClose) / previousClose) * 100
      performancePeriod = '1D'
    }
  } else if (history.length >= 7) {
    const weekAgo = history[history.length - 7]?.close
    const latest = history[history.length - 1]?.close
    if (weekAgo && latest) {
      changePercent = ((latest - weekAgo) / weekAgo) * 100
      performancePeriod = '7D'
    }
  }

  // ✅ DEUTSCHE FORMATIERUNG für Preise und Prozente
  const formatPrice = (n: number) => new Intl.NumberFormat('de-DE', { 
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)

  const formatPercent = (n: number) => 
    `${n >= 0 ? '+' : ''}${n.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}%`

  // 4) Investoren-Analyse
  interface InvestorHolding {
    slug: string
    name: string
    imageUrl?: string
    weight: number
    value: number
    change?: {
      type: 'buy' | 'sell' | 'new_entry' | 'exit'
      shares: number
      percent: number
    }
  }

  interface MarketStats {
    totalInvestors: number
    currentHolders: number
    newEntries: number
    positionIncreases: number
    positionDecreases: number
    completeExits: number
    totalBuyers: number
    totalSellers: number
    activityRate: number
  }

  const totalInvestors = Object.keys(holdingsHistory).length
  const investorHoldings: InvestorHolding[] = []
  const marketStats: MarketStats = {
    totalInvestors,
    currentHolders: 0,
    newEntries: 0,
    positionIncreases: 0,
    positionDecreases: 0,
    completeExits: 0,
    totalBuyers: 0,
    totalSellers: 0,
    activityRate: 0
  }

  // Für jeden Investor prüfen
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    const previous = snaps.length >= 2 ? snaps[snaps.length - 2]?.data : null
    
    if (!latest) return
    
    const latestData = normalizeHoldingsData(latest)
    const previousData = previous ? normalizeHoldingsData(previous) : null
    
    const findTickerPositions = (positions: any[]) => {
      return positions.filter(pos => {
        if (pos.ticker?.toLowerCase() === ticker.toLowerCase()) return true
        return pos.cusip === stock.cusip
      })
    }
    
    const currentPositions = findTickerPositions(latestData.positions || [])
    const previousPositions = previousData ? findTickerPositions(previousData.positions || []) : []
    
    const currentTotal = currentPositions.reduce<{shares: number, value: number}>((sum, pos) => ({
      shares: sum.shares + pos.shares,
      value: sum.value + pos.value
    }), { shares: 0, value: 0 })
    
    const previousTotal = previousPositions.reduce<{shares: number, value: number}>((sum, pos) => ({
      shares: sum.shares + pos.shares,
      value: sum.value + pos.value  
    }), { shares: 0, value: 0 })
    
    const hasCurrentPosition = currentTotal.shares > 0
    const hadPreviousPosition = previousTotal.shares > 0
    
    // Stats berechnen
    if (hasCurrentPosition) {
      marketStats.currentHolders++
      
      const totalPortfolioValue = latestData.positions.reduce<number>((sum: number, p: any) => sum + p.value, 0)
      const inv = investors.find(i => i.slug === slug)
      
      if (inv && totalPortfolioValue > 0) {
        let change = undefined
        
        if (!hadPreviousPosition) {
          marketStats.newEntries++
          marketStats.totalBuyers++
          change = {
            type: 'new_entry' as const,
            shares: currentTotal.shares,
            percent: 100
          }
        } else if (previousData) {
          const shareDelta = currentTotal.shares - previousTotal.shares
          
          if (Math.abs(shareDelta) > 1000) {
            if (shareDelta > 0) {
              marketStats.positionIncreases++
              marketStats.totalBuyers++
              change = {
                type: 'buy' as const,
                shares: Math.abs(shareDelta),
                percent: Math.abs(shareDelta) / previousTotal.shares * 100
              }
            } else {
              marketStats.positionDecreases++
              marketStats.totalSellers++
              change = {
                type: 'sell' as const,
                shares: Math.abs(shareDelta),
                percent: Math.abs(shareDelta) / previousTotal.shares * 100
              }
            }
          }
        }
        
        investorHoldings.push({ 
          slug, 
          name: inv.name, 
          imageUrl: inv.imageUrl, 
          weight: currentTotal.value / totalPortfolioValue,
          value: currentTotal.value,
          change
        })
      }
    } else if (hadPreviousPosition) {
      marketStats.completeExits++
      marketStats.totalSellers++
    }
  })

  marketStats.activityRate = ((marketStats.totalBuyers + marketStats.totalSellers) / totalInvestors) * 100
  investorHoldings.sort((a, b) => b.value - a.value)

  const recentBuyers = investorHoldings.filter(inv => 
    inv.change?.type === 'buy' || inv.change?.type === 'new_entry'
  )
  const recentSellers = investorHoldings.filter(inv => inv.change?.type === 'sell')

  const holdingCount = marketStats.currentHolders
  const totalValue = investorHoldings.reduce<number>((sum: number, inv: InvestorHolding) => sum + inv.value, 0)
  const currentQuarter = getLatestQuarterFromData()

  // ✅ Historische Daten für Chart - MIT aktuellen Holdings für Korrektur
  const historicalData = getHistoricalData(ticker, stock, investorHoldings, totalValue)
  
  console.log('DEBUG: Einzelne Holdings:', investorHoldings.map(inv => ({ name: inv.name, value: inv.value })))
  console.log('DEBUG: Gesamtwert berechnet:', totalValue)
  console.log('DEBUG: Historischer Wert (korrigiert):', historicalData.length > 0 ? historicalData[historicalData.length - 1].totalValue * 1_000_000 : 'keine Daten')

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* ✅ CLEAN HEADER - konsistent mit anderen Pages */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          
          {/* Zurück-Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Aktien-Auswahl
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <Logo
                ticker={ticker}
                alt={`${ticker} Logo`}
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                {stock.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg text-green-400 font-semibold">{ticker}</span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm text-theme-muted">
                  Super-Investoren Analyse
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT - konsistent mit Dashboard Style */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* ✅ DASHBOARD STYLE Overview Stats MIT DEUTSCHER FORMATIERUNG */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-theme-card border border-theme/10 rounded-xl p-6 hover:border-theme/20 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserGroupIcon className="w-6 h-6 text-green-400" />
                <h3 className="text-theme-primary font-bold text-lg">Penetration</h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-theme-primary">
                {Math.round((holdingCount / totalInvestors) * 100).toLocaleString('de-DE')}%
              </div>
              <div className="text-sm text-theme-muted">
                {holdingCount.toLocaleString('de-DE')} von {totalInvestors.toLocaleString('de-DE')} Investoren
              </div>
            </div>
          </div>

          <div className="bg-theme-card border border-theme/10 rounded-xl p-6 hover:border-theme/20 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ArrowUpIcon className="w-6 h-6 text-green-400" />
                <h3 className="text-theme-primary font-bold text-lg">Käufer</h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-green-400">
                {marketStats.totalBuyers.toLocaleString('de-DE')}
              </div>
              <div className="text-sm text-theme-muted">
                {marketStats.newEntries.toLocaleString('de-DE')} neue, {marketStats.positionIncreases.toLocaleString('de-DE')} erhöht (vs. Vorquartal)
              </div>
            </div>
          </div>

          <div className="bg-theme-card border border-theme/10 rounded-xl p-6 hover:border-theme/20 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ArrowDownIcon className="w-6 h-6 text-red-400" />
                <h3 className="text-theme-primary font-bold text-lg">Verkäufer</h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-red-400">
                {marketStats.totalSellers.toLocaleString('de-DE')}
              </div>
              <div className="text-sm text-theme-muted">
                {marketStats.positionDecreases.toLocaleString('de-DE')} reduziert, {marketStats.completeExits.toLocaleString('de-DE')} exits (vs. Vorquartal)
              </div>
            </div>
          </div>

          <div className="bg-theme-card border border-theme/10 rounded-xl p-6 hover:border-theme/20 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ChartBarIcon className="w-6 h-6 text-green-400" />
                <h3 className="text-theme-primary font-bold text-lg">Gesamtwert</h3>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-theme-primary">
                {formatCurrencyGerman(totalValue)}
              </div>
              <div className="text-sm text-theme-muted">
                13F Holdings
              </div>
            </div>
          </div>
        </div>

        {/* ✅ SECTION HEADER mit korrektem Count */}
        <div>
          <h2 className="text-2xl font-bold text-theme-primary mb-2">
            Aktuelle Holdings ({holdingCount.toLocaleString('de-DE')})
          </h2>
          <p className="text-theme-secondary text-sm">
            13F-Daten • Berichtet für {currentQuarter} • Zeige alle {holdingCount.toLocaleString('de-DE')} Holdings
          </p>
        </div>

        {/* ✅ VERBESSERTE KOMPAKTE CARDS - 4 Spalten für alle Holdings MIT DEUTSCHER FORMATIERUNG */}
        {investorHoldings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {investorHoldings.map((investor) => (
              <Link 
                key={investor.slug} 
                href={`/superinvestor/${investor.slug}`}
                className="group block"
              >
                {/* ✅ KOMPAKTE CARD - für alle Holdings */}
                <div className="bg-theme-card border border-theme/10 rounded-xl p-4 group-hover:border-theme/20 group-hover:shadow-lg transition-all duration-300 h-[200px] flex flex-col">
                  
                  {/* Kompakter Header */}
                  <div className="flex items-center justify-between mb-3">
                    <InvestorAvatar 
                      name={investor.name} 
                      imageUrl={investor.imageUrl} 
                      size="sm"
                    />
                    
                    {/* Badge Container */}
                    <div className="h-5 flex items-center">
                      {investor.change?.type === 'new_entry' && (
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-bold">
                          NEU
                        </span>
                      )}
                      
                      {investor.change && investor.change.type !== 'new_entry' && (
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          investor.change.type === 'buy' ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                      )}
                    </div>
                  </div>

                  {/* Kompakter Name */}
                  <h3 className="text-sm font-bold text-theme-primary mb-3 group-hover:text-green-400 transition-colors line-clamp-2 flex-shrink-0">
                    {investor.name.split('–')[0].split(' ').slice(0, 2).join(' ')}
                  </h3>
                  
                  {/* Kompakte Stats MIT DEUTSCHER FORMATIERUNG */}
                  <div className="flex-grow flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-theme-primary">
                        {formatCurrencyGerman(investor.value)}
                      </div>
                      <div className="text-xs text-theme-muted">
                        {(investor.weight * 100).toLocaleString('de-DE', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1
                        })}% Portfolio
                      </div>
                    </div>
                    
                    {/* Kompakter Change */}
                    <div className="mt-2 h-6 flex items-end">
                      {investor.change ? (
                        <div className={`text-xs px-2 py-1 rounded ${
                          investor.change.type === 'buy' || investor.change.type === 'new_entry'
                            ? 'text-green-400 bg-green-500/20'
                            : 'text-red-400 bg-red-500/20'
                        }`}>
                          {investor.change.type === 'new_entry' ? 'Neu' : 
                           investor.change.type === 'buy' ? '↗ Erhöht' : '↘ Reduziert'}
                        </div>
                      ) : (
                        <div className="text-xs text-theme-muted">
                          Unverändert
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Empty State - auch als Card
          <div className="bg-theme-card border border-theme/10 rounded-xl p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-theme-tertiary/20 rounded-xl flex items-center justify-center mb-4">
              <UserGroupIcon className="w-8 h-8 text-theme-muted" />
            </div>
            <h3 className="text-lg font-semibold text-theme-secondary mb-2">
              Keine Holdings gefunden
            </h3>
            <p className="text-theme-muted max-w-md mx-auto">
              {ticker} wird aktuell von keinem der verfolgten Super-Investoren gehalten.
            </p>
          </div>
        )}

        {/* ✅ NEUE SEKTION: Top Movers & Portfolio Insights MIT DEUTSCHER FORMATIERUNG */}
        {investorHoldings.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Movers */}
            {recentBuyers.length > 0 && (
              <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-theme-primary mb-4">
                  Größte Änderungen (letztes Quartal)
                </h3>
                <div className="space-y-3">
                  {recentBuyers.slice(0, 5).map(investor => (
                    <div key={investor.slug} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <InvestorAvatar 
                          name={investor.name} 
                          imageUrl={investor.imageUrl} 
                          size="sm" 
                        />
                        <span className="text-sm text-theme-primary">
                          {investor.name.split('–')[0].split(' ').slice(0, 2).join(' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-green-400 font-medium">
                          {investor.change?.type === 'new_entry' ? 'NEU' : 
                           `+${investor.change?.percent.toLocaleString('de-DE', {
                             minimumFractionDigits: 1,
                             maximumFractionDigits: 1
                           })}%`}
                        </div>
                        <div className="text-xs text-theme-muted">
                          {formatCurrencyGerman(investor.value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio Konzentration MIT DEUTSCHER FORMATIERUNG */}
            <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-theme-primary mb-4">
                Portfolio Konzentration
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-theme-muted text-sm">Top 3 Holdings:</span>
                  <span className="text-theme-primary font-medium">
                    {((investorHoldings.slice(0, 3).reduce((sum, inv) => sum + inv.value, 0) / totalValue) * 100).toLocaleString('de-DE', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1
                    })}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-muted text-sm">Ø Position Größe:</span>
                  <span className="text-theme-primary font-medium">
                    {formatCurrencyGerman(totalValue / holdingCount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-muted text-sm">Aktivitätsrate:</span>
                  <span className="text-theme-primary font-medium">
                    {marketStats.activityRate.toLocaleString('de-DE', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1
                    })}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-muted text-sm">Größte Position:</span>
                  <span className="text-theme-primary font-medium">
                    {formatCurrencyGerman(investorHoldings[0]?.value || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ CTA Card - Dashboard Style */}
        <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-theme-primary mb-1">
                Vollständige {ticker} Analyse
              </h3>
              <p className="text-theme-muted text-sm">
                Charts, Fundamentaldaten, Dividenden und technische Analyse
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <WatchlistButton ticker={ticker} />
              <Link
                href={`/analyse/stocks/${ticker.toLowerCase()}`}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Zur Analyse
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}