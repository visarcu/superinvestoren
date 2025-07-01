// src/app/analyse/stocks/[ticker]/super-investors/page.tsx - COMPLETE FISCAL STYLE
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
  MinusIcon
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

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

function formatCurrencyGerman(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} Mrd.`;
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} Mio.`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)} Tsd.`;
  }
  return `${amount.toFixed(0)}`;
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

  // Formatter
  const formatPrice = (n: number) => n.toLocaleString('de-DE', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 2 
  })

  const formatPercent = (n: number) => 
    `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

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
    
    const currentTotal = currentPositions.reduce((sum, pos) => ({
      shares: sum.shares + pos.shares,
      value: sum.value + pos.value
    }), { shares: 0, value: 0 })
    
    const previousTotal = previousPositions.reduce((sum, pos) => ({
      shares: sum.shares + pos.shares,
      value: sum.value + pos.value  
    }), { shares: 0, value: 0 })
    
    const hasCurrentPosition = currentTotal.shares > 0
    const hadPreviousPosition = previousTotal.shares > 0
    
    // Stats berechnen
    if (hasCurrentPosition) {
      marketStats.currentHolders++
      
      const totalPortfolioValue = latestData.positions.reduce((sum: number, p: any) => sum + p.value, 0)
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
  const totalValue = investorHoldings.reduce((sum, inv) => sum + inv.value, 0)
  const currentQuarter = getLatestQuarterFromData()

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

      {/* ✅ MAIN CONTENT - konsistent mit anderen Pages */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* ✅ CLEAN Overview Stats */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <UserGroupIcon className="w-5 h-5 text-green-400" />
              <span className="text-theme-muted text-sm">Markt-Penetration</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {Math.round((holdingCount / totalInvestors) * 100)}%
            </div>
            <div className="text-theme-secondary text-sm">
              {holdingCount} von {totalInvestors} Investoren
            </div>
          </div>

          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <ArrowUpIcon className="w-5 h-5 text-green-400" />
              <span className="text-theme-muted text-sm">Käufer {currentQuarter}</span>
            </div>
            <div className="text-2xl font-bold text-green-400 mb-1">
              {marketStats.totalBuyers}
            </div>
            <div className="text-theme-secondary text-sm">
              {marketStats.newEntries} neue, {marketStats.positionIncreases} erhöht
            </div>
          </div>

          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <ArrowDownIcon className="w-5 h-5 text-red-400" />
              <span className="text-theme-muted text-sm">Verkäufer {currentQuarter}</span>
            </div>
            <div className="text-2xl font-bold text-red-400 mb-1">
              {marketStats.totalSellers}
            </div>
            <div className="text-theme-secondary text-sm">
              {marketStats.positionDecreases} reduziert, {marketStats.completeExits} exits
            </div>
          </div>

          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <ChartBarIcon className="w-5 h-5 text-green-400" />
              <span className="text-theme-muted text-sm">Gesamtwert</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {formatCurrencyGerman(totalValue)}
            </div>
            <div className="text-theme-secondary text-sm">
              13F Holdings
            </div>
          </div>
        </div>

        {/* ✅ CLEAN Current Holdings - Fiscal Style */}
        <div className="bg-theme-card rounded-xl">
          <div className="border-b border-theme/5 px-6 py-4">
            <h2 className="text-lg font-semibold text-theme-primary">
              Aktuelle Holdings ({holdingCount})
            </h2>
            <p className="text-theme-secondary text-sm mt-1">
              13F-Daten • {currentQuarter} 2025
            </p>
          </div>

          <div className="p-6">
            {investorHoldings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {investorHoldings.slice(0, 12).map((investor) => (
                  <Link 
                    key={investor.slug} 
                    href={`/superinvestor/${investor.slug}`}
                    className="group block"
                  >
                    {/* ✅ FISCAL STYLE - Kein Border, nur Hover Background */}
                    <div className="p-4 rounded-lg hover:bg-theme-secondary/20 transition-all duration-200">
                      <div className="flex items-start gap-3 mb-4">
                        <InvestorAvatar 
                          name={investor.name} 
                          imageUrl={investor.imageUrl} 
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-theme-primary group-hover:text-green-400 transition-colors text-sm truncate">
                              {investor.name.split('–')[0].trim()}
                            </h3>
                            {investor.change?.type === 'new_entry' && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                NEU
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-theme-muted">
                            {(investor.weight * 100).toFixed(1)}% Portfolio
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-theme-muted">Positionswert</span>
                          <span className="text-theme-primary font-semibold text-sm">
                            {formatCurrencyGerman(investor.value)}
                          </span>
                        </div>
                        
                        {investor.change && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-theme-muted">Letzte Änderung</span>
                            <div className={`flex items-center gap-1 text-xs font-medium ${
                              investor.change.type === 'buy' || investor.change.type === 'new_entry' 
                                ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {investor.change.type === 'buy' || investor.change.type === 'new_entry' ? (
                                <PlusIcon className="w-3 h-3" />
                              ) : (
                                <MinusIcon className="w-3 h-3" />
                              )}
                              <span>{(investor.change.shares / 1000000).toFixed(1)}M</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
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
          </div>
        </div>

        {/* ✅ CLEAN CTA */}
        <div className="bg-theme-card rounded-xl p-6">
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