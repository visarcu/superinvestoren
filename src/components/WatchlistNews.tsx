import React, { useState, useEffect } from 'react'
import { 
  NewspaperIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'

// Types
interface NewsArticle {
  title: string
  url: string
  publishedDate: string
  text: string
  image: string
  site: string
  symbol: string
}

// ===== WATCHLIST NEWS COMPONENT - SECURE VERSION =====
const WatchlistNews = React.memo(() => {
  const [newsData, setNewsData] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([])
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())

  // Load Watchlist from Supabase
  useEffect(() => {
    async function loadWatchlist() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const { data: watchlistItems } = await supabase
            .from('watchlists')
            .select('ticker')
            .eq('user_id', session.user.id)
            .limit(5) // Limit to top 5 for performance
          
          if (watchlistItems && watchlistItems.length > 0) {
            setWatchlistTickers(watchlistItems.map(item => item.ticker))
          } else {
            setError('Keine Aktien in der Watchlist')
            setLoading(false)
          }
        } else {
          setError('Nicht eingeloggt')
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading watchlist:', err)
        setError('Fehler beim Laden der Watchlist')
        setLoading(false)
      }
    }
    
    loadWatchlist()
  }, [])

  // Load News for Watchlist Tickers - USING SECURE API ROUTE
  useEffect(() => {
    async function loadWatchlistNews() {
      if (watchlistTickers.length === 0) return
      
      setLoading(true)
      setError(null)
      
      try {
        // Create ticker string for API
        const tickersString = watchlistTickers.join(',')
        
        // ✅ SECURE: Using your API route instead of direct FMP call
        const response = await fetch(`/api/watchlist-news?tickers=${tickersString}`)
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }
        
        const newsJson = await response.json()
        
        if (Array.isArray(newsJson) && newsJson.length > 0) {
          // Sort by date and take top 6
          const sortedNews = newsJson
            .sort((a: NewsArticle, b: NewsArticle) => 
              new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
            )
            .slice(0, 4)
          
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
    
    if (watchlistTickers.length > 0) {
      loadWatchlistNews()
    }
  }, [watchlistTickers])

  // Format Date Helper
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

  // Get Source Icon
  const getSourceIcon = (site: string) => {
    const siteLower = site.toLowerCase()
    if (siteLower.includes('reuters')) return '📰'
    if (siteLower.includes('bloomberg')) return '💼'
    if (siteLower.includes('yahoo')) return '🟢'
    if (siteLower.includes('marketwatch')) return '📈'
    if (siteLower.includes('cnbc')) return '📺'
    if (siteLower.includes('motley')) return '🎩'
    if (siteLower.includes('seeking')) return '🔍'
    return '🌐'
  }

  // Toggle article expansion
  const toggleArticle = (url: string) => {
    const newExpanded = new Set(expandedArticles)
    if (newExpanded.has(url)) {
      newExpanded.delete(url)
    } else {
      newExpanded.add(url)
    }
    setExpandedArticles(newExpanded)
  }

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-secondary rounded-xl flex items-center justify-center">
              <NewspaperIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-primary">
                📰 Watchlist News
              </h3>
              <p className="text-sm text-theme-muted">
                Lädt aktuelle Nachrichten...
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-theme-card border border-theme/10 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-theme-secondary rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-theme-secondary rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-secondary rounded-xl flex items-center justify-center">
              <NewspaperIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-primary">
                📰 Watchlist News
              </h3>
              <p className="text-sm text-theme-muted">
                Nachrichten zu deinen Favoriten
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme/10 rounded-xl p-6 text-center">
          <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <p className="text-theme-muted">{error}</p>
          {watchlistTickers.length === 0 && (
            <a 
              href="/analyse/watchlist" 
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand hover:bg-brand text-white rounded-lg transition-colors text-sm"
            >
              Zur Watchlist
              <ArrowRightIcon className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    )
  }

  // No Data State
  if (newsData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-secondary rounded-xl flex items-center justify-center">
              <NewspaperIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-primary">
                📰 Watchlist News
              </h3>
              <p className="text-sm text-theme-muted">
                Nachrichten zu deinen Favoriten
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme/10 rounded-xl p-6 text-center">
          <p className="text-theme-muted">Keine aktuellen News verfügbar</p>
        </div>
      </div>
    )
  }

  // Main Render
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-theme-secondary/30 rounded-xl flex items-center justify-center">
            <NewspaperIcon className="w-5 h-5 text-theme-muted" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-theme-primary">
              📰 Watchlist News
            </h3>
            <p className="text-sm text-theme-muted">
              Aktuelle Nachrichten • {watchlistTickers.join(', ')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/20 text-brand-light rounded-lg text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* News Articles */}
      <div className="space-y-3">
        {newsData.map((article, index) => {
          const isExpanded = expandedArticles.has(article.url)
          
          return (
            <article 
              key={`${article.url}-${index}`}
              className="bg-theme-card border border-theme/10 rounded-xl p-4 hover:border-theme/20 transition-all duration-200 group"
            >
              <div className="space-y-3">
                {/* Article Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-theme-primary font-semibold text-sm leading-tight line-clamp-2 group-hover:text-brand-light transition-colors">
                      {article.title}
                    </h4>
                  </div>
                  
                  {article.symbol && (
                    <span className="px-2 py-1 bg-brand/20 text-brand-light rounded text-xs font-bold flex-shrink-0">
                      {article.symbol}
                    </span>
                  )}
                </div>

                {/* Article Meta */}
                <div className="flex items-center gap-3 text-xs text-theme-muted">
                  <div className="flex items-center gap-1">
                    <span>{getSourceIcon(article.site)}</span>
                    <span>{article.site}</span>
                  </div>
                  
                  <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                  
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    <span>{formatDate(article.publishedDate)}</span>
                  </div>
                </div>

                {/* Article Text - Expandable */}
                {article.text && (
                  <div>
                    <p className={`text-theme-secondary text-xs leading-relaxed ${
                      isExpanded ? '' : 'line-clamp-2'
                    }`}>
                      {article.text}
                    </p>
                    
                    {article.text.length > 150 && (
                      <button
                        onClick={() => toggleArticle(article.url)}
                        className="text-brand-light hover:text-green-300 text-xs font-medium mt-1 transition-colors"
                      >
                        {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                      </button>
                    )}
                  </div>
                )}

                {/* Article Action */}
                <div className="flex items-center justify-between pt-2 border-t border-theme/5">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-theme-hover text-theme-primary rounded-lg transition-colors text-xs font-medium group"
                  >
                    <span>Artikel lesen</span>
                    <ArrowTopRightOnSquareIcon className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                  
                  {article.image && (
                    <div className="w-16 h-10 rounded overflow-hidden">
                      <img 
                        src={article.image} 
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* View All Link */}
      <div className="flex items-center justify-center">
        <a
          href="/analyse/watchlist"
          className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-secondary border border-theme/10 hover:border-theme/20 text-theme-primary rounded-lg transition-all text-sm font-medium group"
        >
          <span>Zur Watchlist</span>
          <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>
    </div>
  )
})

// Export for use in Dashboard
export default WatchlistNews