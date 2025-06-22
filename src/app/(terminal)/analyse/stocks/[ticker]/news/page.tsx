// src/app/analyse/[ticker]/news/page.tsx - Ticker-spezifische News-Seite mit Theme Support
'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  NewspaperIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { 
  BookmarkIcon as BookmarkSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

interface NewsArticle {
  title: string
  url: string
  publishedDate: string
  text: string
  image: string
  site: string
  symbol: string
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

// Mock News Data für Fallback
const mockNewsData: NewsArticle[] = [
  {
    title: "Apple Reports Strong Q4 Earnings with Record Revenue Growth",
    url: "https://example.com/apple-earnings",
    publishedDate: "2024-11-08T10:30:00.000Z",
    text: "Apple Inc. reported exceptional fourth-quarter earnings with revenue growing 8% year-over-year, driven by strong iPhone and Services performance...",
    image: "https://images.unsplash.com/photo-1611532736853-04841ac2c85b?w=400",
    site: "Financial News",
    symbol: "AAPL"
  },
  {
    title: "Apple Vision Pro Sales Exceed Expectations in First Quarter",
    url: "https://example.com/vision-pro-sales",
    publishedDate: "2024-11-07T14:20:00.000Z",
    text: "The Apple Vision Pro has shown remarkable market adoption with sales figures surpassing initial projections, marking a successful entry into spatial computing...",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400",
    site: "Tech Today",
    symbol: "AAPL"
  },
  {
    title: "Apple Announces New AI Features Coming to iOS 18.2",
    url: "https://example.com/ios-ai-features",
    publishedDate: "2024-11-06T16:45:00.000Z",
    text: "Apple unveiled groundbreaking AI capabilities that will be integrated into iOS 18.2, including enhanced Siri functionality and improved machine learning...",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400",
    site: "Apple Insider",
    symbol: "AAPL"
  },
  {
    title: "Institutional Investors Increase Apple Holdings in Q3",
    url: "https://example.com/institutional-holdings",
    publishedDate: "2024-11-05T11:15:00.000Z",
    text: "Major institutional investors have significantly increased their Apple holdings during Q3, with Warren Buffett's Berkshire Hathaway leading the charge...",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
    site: "Market Watch",
    symbol: "AAPL"
  },
  {
    title: "Apple Supplier Chain Optimization Boosts Profit Margins",
    url: "https://example.com/supply-chain",
    publishedDate: "2024-11-04T09:30:00.000Z",
    text: "Apple's strategic supply chain improvements have resulted in enhanced profit margins and reduced production costs across multiple product lines...",
    image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400",
    site: "Supply Chain Digest",
    symbol: "AAPL"
  }
]

export default function NewsPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newsData, setNewsData] = useState<NewsArticle[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set())
  
  const ARTICLES_PER_PAGE = user?.isPremium ? 20 : 5

  // User laden
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('Error loading user:', error)
      }
    }
    loadUser()
  }, [])

  // News laden
  useEffect(() => {
    async function loadNews() {
      setLoading(true)
      setError(null)
      
      try {
        console.log(`🔍 Loading news for ${ticker}, page ${currentPage}...`)
        
        let articles: NewsArticle[] = []
        
        try {
          // FMP Stock News API - ticker-spezifisch
          const newsRes = await fetch(
            `https://financialmodelingprep.com/api/v3/stock_news?tickers=${ticker}&limit=${ARTICLES_PER_PAGE}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          )
          
          if (newsRes.ok) {
            const newsJson = await newsRes.json()
            articles = Array.isArray(newsJson) ? newsJson : []
            console.log('✅ Stock News API successful:', articles.length, 'articles')
          } else {
            console.warn('❌ Stock News API failed:', newsRes.status)
            
            // Fallback: General News API
            const generalNewsRes = await fetch(
              `https://financialmodelingprep.com/stable/news/stock-latest?page=${currentPage}&limit=${ARTICLES_PER_PAGE}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
            )
            
            if (generalNewsRes.ok) {
              const generalNews = await generalNewsRes.json()
              articles = Array.isArray(generalNews) ? generalNews.filter((article: any) => 
                article.title.toLowerCase().includes(ticker.toLowerCase()) ||
                article.text.toLowerCase().includes(ticker.toLowerCase())
              ) : []
              console.log('✅ General News API fallback successful:', articles.length, 'articles')
            } else {
              console.warn('❌ General News API also failed:', generalNewsRes.status)
            }
          }
        } catch (err) {
          console.warn('❌ News API error:', err)
        }

        // Fallback zu Mock-Daten wenn keine echten Daten
        if (articles.length === 0) {
          articles = mockNewsData
          console.log('⚠️ Using mock news data')
          setError('Keine aktuellen Nachrichten verfügbar. Beispieldaten werden angezeigt.')
        }

        setNewsData(articles)
        setTotalPages(Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE)))
        
      } catch (error) {
        console.error('❌ Critical error loading news:', error)
        setError('Fehler beim Laden der Nachrichten')
        setNewsData(mockNewsData)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }

    if (ticker && user !== null) {
      loadNews()
    }
  }, [ticker, currentPage, user])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Heute'
    if (diffDays === 2) return 'Gestern'
    if (diffDays <= 7) return `vor ${diffDays - 1} Tagen`
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const toggleSaveArticle = (articleUrl: string) => {
    const newSaved = new Set(savedArticles)
    if (newSaved.has(articleUrl)) {
      newSaved.delete(articleUrl)
    } else {
      newSaved.add(articleUrl)
    }
    setSavedArticles(newSaved)
  }

  const getSourceIcon = (site: string) => {
    if (site.toLowerCase().includes('reuters')) return '📰'
    if (site.toLowerCase().includes('bloomberg')) return '💼'
    if (site.toLowerCase().includes('yahoo')) return '🟢'
    if (site.toLowerCase().includes('marketwatch')) return '📈'
    if (site.toLowerCase().includes('cnbc')) return '📺'
    return '🌐'
  }

  const filteredNews = selectedSource === 'all' 
    ? newsData 
    : newsData.filter(article => article.site.toLowerCase().includes(selectedSource.toLowerCase()))

  const sources = Array.from(new Set(newsData.map(article => article.site))).slice(0, 5)

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner />
              <p className="text-theme-secondary mt-4">Lade Nachrichten für {ticker}...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
              <NewspaperIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-theme-primary to-theme-secondary bg-clip-text text-transparent">
                {ticker} Nachrichten
              </h1>
              <p className="text-theme-secondary text-lg">Aktuelle News und Marktentwicklungen</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live News</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-200">{error}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-theme-card/70 backdrop-blur-sm rounded-2xl p-6 border border-theme">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-theme-secondary" />
              <span className="text-theme-secondary font-medium">Filter:</span>
            </div>
            
            <button
              onClick={() => setSelectedSource('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedSource === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-theme-secondary/50 text-theme-tertiary hover:bg-theme-secondary/70'
              }`}
            >
              Alle Quellen ({newsData.length})
            </button>
            
            {sources.map(source => (
              <button
                key={source}
                onClick={() => setSelectedSource(source)}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  selectedSource === source
                    ? 'bg-blue-500 text-white'
                    : 'bg-theme-secondary/50 text-theme-tertiary hover:bg-theme-secondary/70'
                }`}
              >
                <span>{getSourceIcon(source)}</span>
                {source}
              </button>
            ))}
          </div>
        </div>

        {/* News Articles */}
        <div className="space-y-6">
          {filteredNews.slice(0, user?.isPremium ? undefined : 5).map((article, index) => (
            <article 
              key={article.url + index}
              className="bg-theme-card/70 backdrop-blur-sm rounded-2xl border border-theme hover:border-border-hover transition-all duration-300 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Article Image */}
                  {article.image && (
                    <div className="lg:w-80 h-48 lg:h-32 rounded-xl overflow-hidden flex-shrink-0">
                      <img 
                        src={article.image} 
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = `https://images.unsplash.com/photo-1611532736853-04841ac2c85b?w=400&h=200&fit=crop`
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Article Content */}
                  <div className="flex-1 space-y-4">
                    {/* Article Header */}
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-xl font-bold text-theme-primary leading-tight group-hover:text-blue-400 transition-colors">
                        {article.title}
                      </h2>
                      
                      {user?.isPremium && (
                        <button
                          onClick={() => toggleSaveArticle(article.url)}
                          className="p-2 rounded-lg bg-theme-secondary/50 hover:bg-theme-secondary/70 transition-colors"
                        >
                          <BookmarkSolidIcon 
                            className={`w-5 h-5 ${
                              savedArticles.has(article.url) ? 'text-yellow-400' : 'text-theme-secondary'
                            }`} 
                          />
                        </button>
                      )}
                    </div>

                    {/* Article Meta */}
                    <div className="flex items-center gap-6 text-sm text-theme-secondary">
                      <div className="flex items-center gap-2">
                        <GlobeAltIcon className="w-4 h-4" />
                        <span className="font-medium">{getSourceIcon(article.site)} {article.site}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>{formatDate(article.publishedDate)} • {formatTime(article.publishedDate)}</span>
                      </div>
                      
                      {article.symbol && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">
                            {article.symbol}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Article Text */}
                    <p className="text-theme-tertiary leading-relaxed">
                      {user?.isPremium ? article.text : truncateText(article.text, 200)}
                    </p>

                    {/* Article Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-theme/50">
                      <Link
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors font-medium"
                      >
                        <span>Artikel lesen</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </Link>
                      
                      {!user?.isPremium && index >= 2 && (
                        <div className="text-sm text-theme-secondary">
                          <Link href="/pricing" className="text-blue-400 hover:underline">
                            Premium für vollständige Artikel
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && user?.isPremium && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-2 px-4 py-2 bg-theme-secondary/50 hover:bg-theme-secondary/70 disabled:opacity-50 disabled:cursor-not-allowed text-theme-primary rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Zurück
            </button>
            
            <span className="text-theme-secondary">
              Seite {currentPage + 1} von {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center gap-2 px-4 py-2 bg-theme-secondary/50 hover:bg-theme-secondary/70 disabled:opacity-50 disabled:cursor-not-allowed text-theme-primary rounded-lg transition-colors"
            >
              Weiter
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Premium CTA für Non-Premium Users */}
        {!user?.isPremium && (
          <div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border border-theme rounded-2xl p-8 text-center backdrop-blur-sm">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
              <NewspaperIcon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-theme-primary mb-4">Unlimited News Access</h3>
            <p className="text-theme-secondary mb-8 max-w-2xl mx-auto text-lg">
              Erhalte Zugang zu allen Nachrichten, vollständigen Artikeltexten, erweiterten Filtern, 
              Bookmark-Funktion und exklusiven Markt-Insights für {ticker} und 3000+ weitere Aktien.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Unbegrenzte Artikel</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Vollständige Texte</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Bookmark-Funktion</span>
              </div>
            </div>
            <button className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl hover:from-green-400 hover:to-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl">
              Premium freischalten - Nur 9€/Monat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}