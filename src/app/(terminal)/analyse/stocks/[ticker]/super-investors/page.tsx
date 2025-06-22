// src/app/analyse/stocks/[ticker]/super-investors/page.tsx - MIT THEME SUPPORT
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
  StarIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon
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
    return data.quarterKey; // "2025-Q2"
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

// ✅ KORRIGIERTE FUNKTION - gibt das BERICHTETE Quartal zurück (nicht Filing-Quartal)
function getLatestQuarterFromData(): string {
  let latestQuarter = 'Q1'; // Korrigierter Fallback
  let latestDate = '';
  
  Object.values(holdingsHistory).forEach(snaps => {
    if (snaps.length > 0) {
      const latest = snaps[snaps.length - 1];
      const normalizedData = normalizeHoldingsData(latest.data);
      const filingQuarter = extractQuarter(latest.data);
      
      if (normalizedData.date > latestDate) {
        latestDate = normalizedData.date;
        // ✅ KORREKTUR: 13F-Filings beziehen sich auf das VORHERIGE Quartal
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

// ✅ DEUTSCHE WÄHRUNGSFORMATIERUNG hinzufügen
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

export default async function ModernStockPage({ params }: { params: { ticker: string } }) {
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

  // 4) Investoren berechnen
  interface InvestorHolding {
    slug: string
    name: string
    imageUrl?: string
    weight: number
    value: number
    change?: {
      type: 'buy' | 'sell'
      shares: number
      percent: number
    }
  }

  const investorHoldings: InvestorHolding[] = Object.entries(holdingsHistory)
    .map(([slug, snaps]) => {
      if (!snaps || snaps.length === 0) return null
      
      const latest = snaps[snaps.length - 1]?.data
      const previous = snaps.length >= 2 ? snaps[snaps.length - 2]?.data : null
      
      if (!latest) return null
      
      const latestData = normalizeHoldingsData(latest)
      const previousData = previous ? normalizeHoldingsData(previous) : null
      
      if (!latestData.positions) return null
      
      const findTickerPositions = (positions: any[]) => {
        return positions.filter(pos => {
          if (pos.ticker?.toLowerCase() === ticker.toLowerCase()) return true
          return pos.cusip === stock.cusip
        })
      }
      
      const currentPositions = findTickerPositions(latestData.positions)
      const previousPositions = previousData ? findTickerPositions(previousData.positions) : []
      
      if (currentPositions.length === 0) return null
      
      const currentTotal = currentPositions.reduce((sum, pos) => ({
        shares: sum.shares + pos.shares,
        value: sum.value + pos.value
      }), { shares: 0, value: 0 })
      
      const previousTotal = previousPositions.reduce((sum, pos) => ({
        shares: sum.shares + pos.shares,
        value: sum.value + pos.value  
      }), { shares: 0, value: 0 })
      
      const totalPortfolioValue = latestData.positions.reduce((sum: number, p: any) => sum + p.value, 0)
      
      if (!totalPortfolioValue) return null
      
      const inv = investors.find(i => i.slug === slug)
      if (!inv) return null

      let change = undefined
      if (previousData) {
        const shareDelta = currentTotal.shares - previousTotal.shares
        
        if (Math.abs(shareDelta) > 1000) {
          change = {
            type: shareDelta > 0 ? 'buy' as const : 'sell' as const,
            shares: Math.abs(shareDelta),
            percent: previousTotal.shares > 0 ? Math.abs(shareDelta) / previousTotal.shares * 100 : 100
          }
        }
      }
      
      return { 
        slug, 
        name: inv.name, 
        imageUrl: inv.imageUrl, 
        weight: currentTotal.value / totalPortfolioValue,
        value: currentTotal.value,
        change
      }
    })
    .filter(Boolean) as InvestorHolding[]

  investorHoldings.sort((a, b) => b.value - a.value)

  // ✅ NEUE: Separate Listen für Käufer und Verkäufer
  const recentBuyers = investorHoldings.filter(inv => inv.change?.type === 'buy')
  const recentSellers = investorHoldings.filter(inv => inv.change?.type === 'sell')

  // Stats berechnen
  const holdingCount = investorHoldings.length
  const totalValue = investorHoldings.reduce((sum, inv) => sum + inv.value, 0)

  // ✅ KORRIGIERTES Quartal
  const currentQuarter = getLatestQuarterFromData()

  return (
    <div className="min-h-screen bg-theme-primary noise-bg">
      {/* Header Section - Theme-aware */}
      <div className="bg-theme-primary noise-bg pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors text-sm mb-8 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Zurück
          </Link>

          <div className="bg-theme-card/70 border border-theme rounded-xl p-8 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row items-start gap-8">
              
              <div className="flex items-center gap-6 flex-1">
                <div className="w-20 h-20 bg-theme-secondary/50 rounded-xl flex items-center justify-center">
                  <Logo
                    ticker={ticker}
                    alt={`${stock.name} Logo`}
                    className="w-16 h-16"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-theme-primary mb-2">
                    {stock.name}
                  </h1>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-lg text-theme-secondary font-medium">{ticker}</span>
                    {livePrice && (
                      <span className="text-2xl font-bold text-theme-primary">
                        {formatPrice(livePrice)}
                      </span>
                    )}
                    {changePercent !== null && (
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        changePercent >= 0 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {formatPercent(changePercent)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-4">
                {changePercent !== null ? (
                  <>
                    <div className="text-sm text-theme-secondary">{performancePeriod} Performance</div>
                    <div className={`text-lg font-semibold ${
                      changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercent(changePercent)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-theme-secondary">Live-Daten</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-400 font-medium">Aktuell</span>
                    </div>
                  </>
                )}
                
                <div className="flex items-center gap-3">
                  <WatchlistButton ticker={ticker} />
                  <Link
                    href={`/analyse/stocks/${ticker.toLowerCase()}`}
                    className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all text-sm"
                  >
                    Detaillierte Analyse
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* ✅ KORRIGIERTE Stats mit deutschem Währungsformat - Theme-aware */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-theme-card/50 border border-theme rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <UserGroupIcon className="w-5 h-5 text-green-400" />
              <span className="text-sm text-theme-secondary">Holdings</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary">{holdingCount}</div>
            <div className="text-xs text-theme-muted">Super-Investoren</div>
          </div>
          
          <div className="bg-theme-card/50 border border-theme rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-theme-secondary">Käufer {currentQuarter}</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{recentBuyers.length}</div>
            <div className="text-xs text-theme-muted">Neue Positionen</div>
          </div>
          
          <div className="bg-theme-card/50 border border-theme rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <ChartBarIcon className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-theme-secondary">Smart Money</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary">
              {formatCurrencyGerman(totalValue)}
            </div>
            <div className="text-xs text-theme-muted">Gesamtwert</div>
          </div>
          
          <div className="bg-theme-card/50 border border-theme rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <StarIcon className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-theme-secondary">Verkäufer {currentQuarter}</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{recentSellers.length}</div>
            <div className="text-xs text-theme-muted">Reduzierte Positionen</div>
          </div>
        </div>

        {/* ✅ NEUE: Käufer/Verkäufer-Sektion - Theme-aware */}
        {(recentBuyers.length > 0 || recentSellers.length > 0) && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-theme-primary mb-6">
              Portfolio-Bewegungen {currentQuarter} 2025
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Käufer */}
              {recentBuyers.length > 0 && (
                <div className="bg-theme-card/50 border border-theme rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <ArrowUpIcon className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-theme-primary">Käufer</h3>
                      <p className="text-sm text-theme-secondary">Neue oder erhöhte Positionen</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {recentBuyers.map((buyer) => (
                      <Link 
                        key={buyer.slug} 
                        href={`/superinvestor/${buyer.slug}`}
                        className="group block"
                      >
                        <div className="bg-theme-secondary/50 border border-theme rounded-lg p-4 hover:bg-theme-secondary/70 hover:border-border-hover transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <InvestorAvatar 
                                name={buyer.name} 
                                imageUrl={buyer.imageUrl} 
                                size="md"
                              />
                              <div>
                                <h4 className="font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                                  {buyer.name.split('–')[0].trim()}
                                </h4>
                                <p className="text-sm text-theme-secondary">
                                  {(buyer.weight * 100).toFixed(1)}% Portfolio-Anteil
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-semibold">
                                +{(buyer.change!.shares / 1000000).toFixed(1)}M
                              </div>
                              <div className="text-xs text-theme-muted">Aktien</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Verkäufer */}
              {recentSellers.length > 0 && (
                <div className="bg-theme-card/50 border border-theme rounded-xl p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <ArrowDownIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-theme-primary">Verkäufer</h3>
                      <p className="text-sm text-theme-secondary">Reduzierte oder verkaufte Positionen</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {recentSellers.map((seller) => (
                      <Link 
                        key={seller.slug} 
                        href={`/superinvestor/${seller.slug}`}
                        className="group block"
                      >
                        <div className="bg-theme-secondary/50 border border-theme rounded-lg p-4 hover:bg-theme-secondary/70 hover:border-border-hover transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <InvestorAvatar 
                                name={seller.name} 
                                imageUrl={seller.imageUrl} 
                                size="md"
                              />
                              <div>
                                <h4 className="font-bold text-theme-primary group-hover:text-red-400 transition-colors">
                                  {seller.name.split('–')[0].trim()}
                                </h4>
                                <p className="text-sm text-theme-secondary">
                                  {(seller.weight * 100).toFixed(1)}% Portfolio-Anteil
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-red-400 font-semibold">
                                -{(seller.change!.shares / 1000000).toFixed(1)}M
                              </div>
                              <div className="text-xs text-theme-muted">Aktien</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bestehende Investor Holdings - Theme-aware */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-theme-primary">
              Super-Investoren Holdings
            </h2>
            <div className="text-sm text-theme-secondary">
              Live 13F-Daten • {currentQuarter} 2025
            </div>
          </div>

          {/* Top Investors Grid */}
          {investorHoldings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {investorHoldings.slice(0, 6).map((investor) => (
                <Link 
                  key={investor.slug} 
                  href={`/superinvestor/${investor.slug}`}
                  className="group"
                >
                  <div className="bg-theme-card/50 border border-theme rounded-lg p-6 hover:bg-theme-card/70 hover:border-border-hover transition-all backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <InvestorAvatar 
                          name={investor.name} 
                          imageUrl={investor.imageUrl} 
                          size="lg"
                          className="ring-2 ring-theme group-hover:ring-green-500/50 transition-all"
                        />
                        <div>
                          <h3 className="font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                            {investor.name.split('–')[0].trim()}
                          </h3>
                          <p className="text-sm text-theme-secondary">
                            {investor.name.includes('–') ? investor.name.split('–')[1].trim() : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-theme-secondary">Portfolio-Anteil</span>
                        <span className="text-green-400 font-medium">
                          {(investor.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-theme-secondary">Positionswert</span>
                        <span className="text-theme-primary font-medium">
                          {formatCurrencyGerman(investor.value)}
                        </span>
                      </div>
                      {investor.change && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-theme-secondary">Letzte Änderung</span>
                          <span className={`text-sm font-medium ${
                            investor.change.type === 'buy' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {investor.change.type === 'buy' ? '+' : '-'}
                            {(investor.change.shares / 1000000).toFixed(1)}M Aktien
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-theme-card/30 border border-theme rounded-xl p-12 text-center">
              <UserGroupIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
              <h3 className="text-xl font-bold text-theme-secondary mb-2">
                Keine Super-Investoren Holdings gefunden
              </h3>
              <p className="text-theme-muted mb-6">
                {ticker} wird aktuell von keinem der verfolgten Super-Investoren gehalten, 
                oder die Daten sind noch nicht verfügbar.
              </p>
              <Link
                href="/superinvestor"
                className="inline-flex items-center gap-2 px-6 py-3 bg-theme-secondary hover:bg-theme-tertiary text-theme-primary font-medium rounded-lg transition-all border border-theme"
              >
                <UserGroupIcon className="w-4 h-4" />
                Alle Super-Investoren ansehen
              </Link>
            </div>
          )}

          {/* CTA Section - Theme-aware */}
          <div className="bg-theme-card/30 border border-theme rounded-xl p-8 text-center backdrop-blur-sm">
            <h3 className="text-xl font-bold text-theme-primary mb-3">
              Professionelle Analyse benötigt?
            </h3>
            <p className="text-theme-secondary mb-6 max-w-2xl mx-auto">
              Erweiterte Charts, technische Indikatoren, Fundamentaldaten, 
              Dividenden-Historie und detaillierte Kennzahlen-Analyse für {ticker}.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/analyse/stocks/${ticker.toLowerCase()}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all"
              >
                <ChartBarIcon className="w-4 h-4" />
                Zur Analyse-Zentrale
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-theme-secondary hover:bg-theme-tertiary text-theme-primary font-medium rounded-lg transition-all border border-theme"
              >
                Premium Features entdecken
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}