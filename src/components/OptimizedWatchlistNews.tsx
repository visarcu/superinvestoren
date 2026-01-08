import React, { useState, useEffect } from 'react'
import { 
  NewspaperIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface NewsArticle {
  title: string
  url: string
  publishedDate: string
  text: string
  image: string
  site: string
  symbol: string
}

interface OptimizedWatchlistNewsProps {
  watchlistTickers: string[]
}

const OptimizedWatchlistNews = React.memo(({ watchlistTickers }: OptimizedWatchlistNewsProps) => {
  const [newsData, setNewsData] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadWatchlistNews() {
      if (watchlistTickers.length === 0) {
        setError('Keine Aktien in der Watchlist')
        setLoading(false)
        return
      }
      
      setLoading(true)
      setError(null)
      
      try {
        const tickersString = watchlistTickers.slice(0, 5).join(',') // Limit to 5 for performance
        const response = await fetch(`/api/watchlist-news?tickers=${tickersString}`, {
          next: { revalidate: 300 } // 5 minute cache
        })
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }
        
        const newsJson = await response.json()
        
        if (Array.isArray(newsJson) && newsJson.length > 0) {
          const sortedNews = newsJson
            .sort((a: NewsArticle, b: NewsArticle) => 
              new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
            )
            .slice(0, 3) // Only top 3 for faster loading
          
          setNewsData(sortedNews)
        } else {
          setError('Keine aktuellen News verfügbar')
        }
        
      } catch (error) {
        console.error('Error loading news:', error)
        setError('Fehler beim Laden der Nachrichten')
      } finally {
        setLoading(false)
      }
    }
    
    loadWatchlistNews()
  }, [watchlistTickers])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Gerade eben'
    if (diffHours < 24) return `vor ${diffHours}h`
    if (diffHours < 48) return 'Gestern'
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `vor ${diffDays} Tagen`
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const getSourceIcon = (site: string) => {
    const siteLower = site.toLowerCase()
    if (siteLower.includes('reuters')) return '📰'
    if (siteLower.includes('bloomberg')) return '💼'
    if (siteLower.includes('yahoo')) return '🟢'
    if (siteLower.includes('marketwatch')) return '📈'
    if (siteLower.includes('cnbc')) return '📺'
    return '🌐'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-theme-secondary rounded-lg flex items-center justify-center">
            <NewspaperIcon className="w-4 h-4 text-theme-muted" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme-primary">📰 Watchlist News</h3>
            <p className="text-xs text-theme-muted">Lädt...</p>
          </div>
        </div>
        
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-theme-card border border-theme/10 rounded-lg p-3 animate-pulse">
              <div className="h-3 bg-theme-secondary rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-theme-secondary rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || newsData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-theme-secondary rounded-lg flex items-center justify-center">
            <NewspaperIcon className="w-4 h-4 text-theme-muted" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme-primary">📰 Watchlist News</h3>
            <p className="text-xs text-theme-muted">{error || 'Keine News'}</p>
          </div>
        </div>
        
        {watchlistTickers.length === 0 && (
          <a 
            href="/analyse/watchlist" 
            className="inline-flex items-center gap-2 px-3 py-2 bg-brand hover:bg-brand text-white rounded-lg transition-colors text-sm"
          >
            Zur Watchlist
            <ArrowRightIcon className="w-3 h-3" />
          </a>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-theme-primary">Watchlist News</h3>
          <p className="text-xs text-theme-muted">{watchlistTickers.slice(0, 3).join(', ')}</p>
        </div>
        
        <div className="flex items-center gap-1 px-2 py-1 bg-brand/20 text-brand-light rounded text-xs">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      {/* News List - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {newsData.map((article, index) => (
          <article 
            key={`${article.url}-${index}`}
            className="border border-theme/5 rounded-lg p-3 hover:border-theme/20 transition-all duration-200 group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-theme-primary font-medium text-sm leading-tight line-clamp-2 group-hover:text-brand-light transition-colors flex-1">
                  {article.title}
                </h4>
                
                {article.symbol && (
                  <span className="px-1.5 py-0.5 bg-brand/20 text-brand-light rounded text-xs font-bold flex-shrink-0">
                    {article.symbol}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-theme-muted">
                  <span className="text-xs">{getSourceIcon(article.site)}</span>
                  <span className="truncate max-w-[80px]">{article.site}</span>
                  <ClockIcon className="w-3 h-3" />
                  <span>{formatDate(article.publishedDate)}</span>
                </div>
                
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-theme-secondary hover:bg-theme-hover text-theme-primary rounded text-xs font-medium"
                >
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-theme/10">
        <a
          href="/analyse/watchlist"
          className="inline-flex items-center gap-2 px-3 py-2 bg-theme-secondary hover:bg-theme-hover border border-theme/10 hover:border-theme/20 text-theme-primary rounded-lg transition-all text-xs font-medium group w-full justify-center"
        >
          <span>Zur Watchlist</span>
          <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </>
  )
})

export default OptimizedWatchlistNews