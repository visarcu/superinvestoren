import React, { useState, useEffect, useMemo } from 'react'
import { 
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useCurrency } from '@/lib/CurrencyContext'
import Logo from '@/components/Logo'

interface MarketMoverStock {
  ticker: string
  name: string
  price: number
  changePct: number
  volume: number
  avgVolume: number
  volumeRatio: number
}

const MarketMovers = React.memo(({ 
  watchlistTickers = [],
  popularTickers = []
}: { 
  watchlistTickers?: string[]
  popularTickers?: string[]
}) => {
  const [moversData, setMoversData] = useState<{
    gainers: MarketMoverStock[]
    losers: MarketMoverStock[]
    mostActive: MarketMoverStock[]
  }>({
    gainers: [],
    losers: [],
    mostActive: []
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'active'>('gainers')
  const { formatStockPrice, formatPercentage } = useCurrency()

  useEffect(() => {
    async function loadMarketMovers() {
      setLoading(true)
      
      try {
        // Kombiniere Watchlist + Popular Tickers
        const allTickers = [...new Set([...watchlistTickers, ...popularTickers])]
        
        if (allTickers.length === 0) {
          setLoading(false)
          return
        }

        // Batch API Call für alle Tickers
        const tickerString = allTickers.join(',')
        const response = await fetch(`/api/market-movers?tickers=${tickerString}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch market movers')
        }
        
        const data = await response.json()
        
        // Sortiere für verschiedene Kategorien
        const stocks: MarketMoverStock[] = data.stocks || []
        
        // Top Gainers (größte positive Bewegung)
        const gainers = stocks
          .filter(s => s.changePct > 0)
          .sort((a, b) => b.changePct - a.changePct)
          .slice(0, 3) // Nur 3 für kompaktere Ansicht
        
        // Top Losers (größte negative Bewegung)
        const losers = stocks
          .filter(s => s.changePct < 0)
          .sort((a, b) => a.changePct - b.changePct)
          .slice(0, 3) // Nur 3 für kompaktere Ansicht
        
        // Most Active (höchstes Volume im Vergleich zum Average)
        const mostActive = stocks
          .filter(s => s.volumeRatio > 1.5) // Mindestens 50% über Average
          .sort((a, b) => b.volumeRatio - a.volumeRatio)
          .slice(0, 3) // Nur 3 für kompaktere Ansicht
        
        setMoversData({
          gainers,
          losers,
          mostActive
        })
        
      } catch (error) {
        console.error('Error loading market movers:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (watchlistTickers.length > 0 || popularTickers.length > 0) {
        loadMarketMovers()
        // Kein setInterval mehr!
      }
  }, [watchlistTickers, popularTickers])


  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'gainers': return moversData.gainers
      case 'losers': return moversData.losers
      case 'active': return moversData.mostActive
      default: return []
    }
  }, [activeTab, moversData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-secondary rounded-xl flex items-center justify-center">
              <FireIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-primary">🔥 Market Movers</h3>
              <p className="text-sm text-theme-muted">Lade Live-Daten...</p>
            </div>
          </div>
        </div>
        <div className="bg-theme-card border border-theme/10 rounded-xl p-4 animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-theme-secondary rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-theme-primary">Market Movers</h3>
          <p className="text-xs text-theme-muted">Top Performer heute</p>
        </div>
        
        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      {/* Tab Navigation - Cleaner ohne bunte Farben */}
      <div className="flex bg-theme-secondary border border-theme/10 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('gainers')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === 'gainers'
              ? 'bg-theme-card text-theme-primary shadow-sm'
              : 'text-theme-muted hover:text-theme-primary'
          }`}
        >
          <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
          <span>Gainers</span>
          {moversData.gainers.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === 'gainers' ? 'bg-green-500/20 text-green-400' : 'bg-theme-secondary text-theme-muted'
            }`}>
              {moversData.gainers.length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('losers')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === 'losers'
              ? 'bg-theme-card text-theme-primary shadow-sm'
              : 'text-theme-muted hover:text-theme-primary'
          }`}
        >
          <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
          <span>Losers</span>
          {moversData.losers.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === 'losers' ? 'bg-red-500/20 text-red-400' : 'bg-theme-secondary text-theme-muted'
            }`}>
              {moversData.losers.length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === 'active'
              ? 'bg-theme-card text-theme-primary shadow-sm'
              : 'text-theme-muted hover:text-theme-primary'
          }`}
        >
          <BoltIcon className="w-3.5 h-3.5" />
          <span>Active</span>
          {moversData.mostActive.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-theme-secondary text-theme-muted'
            }`}>
              {moversData.mostActive.length}
            </span>
          )}
        </button>
      </div>

      {/* Stocks List - Flex Container */}
      <div className="flex-1 overflow-hidden">
        {currentData.length > 0 ? (
          <div className="space-y-2 h-full overflow-y-auto">
            {currentData.map((stock, index) => (
              <a
                key={stock.ticker}
                href={`/analyse/stocks/${stock.ticker.toLowerCase()}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-theme-secondary/30 transition-all duration-200 group"
              >
                {/* Ranking */}
                <div className="text-xs font-medium text-theme-muted w-4 text-center">
                  {index + 1}
                </div>

                {/* Logo */}
                <Logo 
                  ticker={stock.ticker}
                  alt={stock.ticker}
                  className="w-6 h-6 rounded"
                  padding="small"
                />
                
                {/* Ticker & Change */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-theme-primary group-hover:text-green-400 transition-colors">
                      {stock.ticker}
                    </span>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      stock.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stock.changePct >= 0 ? (
                        <ArrowTrendingUpIcon className="w-3 h-3" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-3 h-3" />
                      )}
                      <span>{formatPercentage(Math.abs(stock.changePct), false)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-theme-muted">
                    {formatStockPrice(stock.price)}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <EyeIcon className="w-6 h-6 text-theme-muted mx-auto mb-2 opacity-50" />
              <p className="text-xs text-theme-muted">
                {activeTab === 'gainers' ? 'Keine Gewinner' :
                 activeTab === 'losers' ? 'Keine Verlierer' :
                 'Keine Aktivität'}
              </p>
            </div>
          </div>
        )}
      </div>

    </>
  )
})

export default MarketMovers