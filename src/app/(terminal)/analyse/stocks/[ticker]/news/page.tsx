// src/app/(terminal)/analyse/stocks/[ticker]/news/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import SocialPulse from '@/components/SocialPulse'
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
  CalendarIcon,
  SparklesIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  SignalIcon
} from '@heroicons/react/24/outline'
import { 
  BookmarkIcon as BookmarkSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid'

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
    text: "Apple Inc. reported exceptional fourth-quarter earnings with revenue growing 8% year-over-year, driven by strong iPhone and Services performance. The company's diversified portfolio continues to show resilience amid global economic uncertainties.",
    image: "https://images.unsplash.com/photo-1611532736853-04841ac2c85b?w=400",
    site: "Financial News",
    symbol: "AAPL"
  },
  {
    title: "Apple Vision Pro Sales Exceed Expectations in First Quarter",
    url: "https://example.com/vision-pro-sales",
    publishedDate: "2024-11-07T14:20:00.000Z",
    text: "The Apple Vision Pro has shown remarkable market adoption with sales figures surpassing initial projections, marking a successful entry into spatial computing. Industry analysts are optimistic about the long-term potential of this new product category.",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400",
    site: "Tech Today",
    symbol: "AAPL"
  },
  {
    title: "Apple Announces New AI Features Coming to iOS 18.2",
    url: "https://example.com/ios-ai-features",
    publishedDate: "2024-11-06T16:45:00.000Z",
    text: "Apple unveiled groundbreaking AI capabilities that will be integrated into iOS 18.2, including enhanced Siri functionality and improved machine learning capabilities across the ecosystem. These features represent a major step forward in Apple's AI strategy.",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400",
    site: "Apple Insider",
    symbol: "AAPL"
  },
  {
    title: "Institutional Investors Increase Apple Holdings in Q3",
    url: "https://example.com/institutional-holdings",
    publishedDate: "2024-11-05T11:15:00.000Z",
    text: "Major institutional investors have significantly increased their Apple holdings during Q3, with Warren Buffett's Berkshire Hathaway leading the charge. This reflects continued confidence in Apple's long-term growth prospects and financial stability.",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
    site: "Market Watch",
    symbol: "AAPL"
  },
  {
    title: "Apple Supplier Chain Optimization Boosts Profit Margins",
    url: "https://example.com/supply-chain",
    publishedDate: "2024-11-04T09:30:00.000Z",
    text: "Apple's strategic supply chain improvements have resulted in enhanced profit margins and reduced production costs across multiple product lines. The company continues to demonstrate operational excellence in managing global manufacturing partnerships.",
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
  
  // NEU: Tab State für News vs Social
  const [activeTab, setActiveTab] = useState<'news' | 'social'>('news')
  
  // Get stock info for header
  const stock = stocks.find(s => s.ticker === ticker)
  
  const ARTICLES_PER_PAGE = 20

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

  // News laden - NUR wenn news tab aktiv
  useEffect(() => {
    if (activeTab !== 'news') {
      setLoading(false) // Kein Loading für Social Tab
      return
    }
    
    async function loadNews() {
      setLoading(true)
      setError(null)
      
      try {
        console.log(`🔍 Loading news for ${ticker}, page ${currentPage}...`)
        
        let articles: NewsArticle[] = []
        
        try {
          // Stock News über sichere Backend API Route (mit eingebauter Fallback-Logik)
          const newsRes = await fetch(
            `/api/stock-news/${ticker}?page=${currentPage}&limit=${ARTICLES_PER_PAGE}`
          )
          
          if (newsRes.ok) {
            const data = await newsRes.json()
            articles = data.articles || []
            console.log(`✅ Stock News API successful: ${articles.length} articles for ${ticker}`)
          } else {
            console.error(`❌ Stock News API failed for ${ticker}:`, newsRes.status)
            articles = []
          }
        } catch (err) {
          console.warn(`❌ News API error for ${ticker}:`, err)
          articles = []
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
  }, [ticker, currentPage, user, activeTab])

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

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Info Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-theme-secondary">
              {activeTab === 'news' 
                ? `Aktuelle News und Marktentwicklungen für` 
                : `Social Media Sentiment für`} <span className="font-semibold text-theme-primary">{ticker}</span>
            </p>
            <p className="text-theme-muted text-sm mt-1">
              {activeTab === 'news' 
                ? 'Kostenlos verfügbar • Täglich aktualisiert'
                : 'StockTwits & Twitter Analyse • Live Daten'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-theme-secondary/30 border border-theme/20 text-theme-primary rounded-lg text-sm">
            <div className="w-2 h-2 bg-theme-primary rounded-full animate-pulse"></div>
            <span>{activeTab === 'news' ? 'Live News' : 'Live Sentiment'}</span>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="bg-theme-card rounded-xl p-1 border border-theme/10">
          <nav className="flex gap-1">
            <button
              onClick={() => setActiveTab('news')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'news'
                  ? 'bg-theme-primary text-white shadow-md'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
                }
              `}
            >
              <NewspaperIcon className="w-4 h-4" />
              Nachrichten
            </button>
            
            <button
              onClick={() => setActiveTab('social')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'social'
                  ? 'bg-theme-primary text-white shadow-md'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
                }
              `}
            >
              <SignalIcon className="w-4 h-4" />
              Social Pulse
            </button>
          </nav>
        </div>

        {/* CONTENT AREA */}
        {activeTab === 'news' ? (
          <>
            {/* Error Message */}
            {error && (
              <div className="bg-theme-secondary/30 border border-theme/20 rounded-xl p-4 flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-theme-secondary" />
                <span className="text-theme-secondary">{error}</span>
              </div>
            )}

            {/* Filter Bar - nur für News */}
            <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                    <FunnelIcon className="w-3 h-3 text-theme-secondary" />
                  </div>
                  <span className="text-theme-muted font-medium text-sm">Filter:</span>
                </div>
                
                <button
                  onClick={() => setSelectedSource('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all text-sm ${
                    selectedSource === 'all'
                      ? 'bg-theme-primary text-white'
                      : 'bg-theme-tertiary/50 text-theme-primary hover:bg-theme-tertiary/70'
                  }`}
                >
                  Alle Quellen ({newsData.length})
                </button>
                
                {sources.map(source => (
                  <button
                    key={source}
                    onClick={() => setSelectedSource(source)}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-sm ${
                      selectedSource === source
                        ? 'bg-theme-primary text-white'
                        : 'bg-theme-tertiary/50 text-theme-primary hover:bg-theme-tertiary/70'
                    }`}
                  >
                    <span>{getSourceIcon(source)}</span>
                    {source}
                  </button>
                ))}
              </div>
            </div>

            {/* News Articles */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-theme-muted mt-4">Lade Nachrichten für {ticker}...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNews.map((article, index) => (
                  <article 
                    key={article.url + index}
                    className="bg-theme-card rounded-xl hover:bg-theme-secondary/20 transition-all overflow-hidden group border border-theme/10"
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Article Image */}
                        {article.image && (
                          <div className="lg:w-64 h-40 lg:h-24 rounded-lg overflow-hidden flex-shrink-0">
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
                        <div className="flex-1 space-y-3">
                          {/* Article Header */}
                          <div className="flex items-start justify-between gap-4">
                            <h2 className="text-lg font-semibold text-theme-primary leading-tight group-hover:text-theme-secondary transition-colors">
                              {article.title}
                            </h2>
                            
                            {/* Bookmark nur für Premium User */}
                            {user?.isPremium && (
                              <button
                                onClick={() => toggleSaveArticle(article.url)}
                                className="p-1.5 rounded-lg bg-theme-tertiary/50 hover:bg-theme-tertiary/70 transition-colors"
                              >
                                <BookmarkSolidIcon 
                                  className={`w-4 h-4 ${
                                    savedArticles.has(article.url) ? 'text-theme-primary' : 'text-theme-muted'
                                  }`} 
                                />
                              </button>
                            )}
                          </div>

                          {/* Article Meta */}
                          <div className="flex items-center gap-4 text-sm text-theme-muted">
                            <div className="flex items-center gap-1">
                              <GlobeAltIcon className="w-3 h-3" />
                              <span>{getSourceIcon(article.site)} {article.site}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              <span>{formatDate(article.publishedDate)} • {formatTime(article.publishedDate)}</span>
                            </div>
                            
                            {article.symbol && (
                              <span className="px-2 py-0.5 bg-theme-secondary/30 text-theme-primary rounded text-xs font-medium">
                                {article.symbol}
                              </span>
                            )}
                          </div>

                          {/* Article Text */}
                          <p className="text-theme-secondary text-sm leading-relaxed">
                            {article.text}
                          </p>

                          {/* Article Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-theme/5">
                            <Link
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-theme-secondary/30 hover:bg-theme-secondary/50 text-theme-primary rounded-lg transition-colors text-sm font-medium"
                            >
                              <span>Artikel lesen</span>
                              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination - nur für News */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed text-theme-primary rounded-lg transition-colors border border-theme/10"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Zurück
                </button>
                
                <span className="text-theme-muted text-sm">
                  Seite {currentPage + 1} von {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed text-theme-primary rounded-lg transition-colors border border-theme/10"
                >
                  Weiter
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* SOCIAL PULSE TAB */
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <SocialPulse ticker={ticker} />
          </div>
        )}

        {/* CTA für Analysis */}
        <div className="bg-theme-card rounded-lg p-6 border border-theme/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold text-theme-primary mb-1">
                Detaillierte {ticker} Analyse verfügbar
              </h3>
              <p className="text-theme-muted text-sm">
                Financial Statements • Wachstumsanalyse • DCF Bewertung • Advanced Charts
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href={`/analyse/stocks/${ticker.toLowerCase()}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-secondary text-white rounded-lg transition-colors"
              >
                <ChartBarIcon className="w-4 h-4" />
                Zur Analyse
              </Link>
              
              <Link
                href={`/analyse/stocks/${ticker.toLowerCase()}/financials`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary text-theme-primary rounded-lg transition-colors"
              >
                <DocumentTextIcon className="w-4 h-4" />
                Financials
              </Link>
            </div>
          </div>
        </div>

        {/* Premium User Benefits */}
        {user?.isPremium && (
          <div className="bg-theme-secondary/20 rounded-xl p-6 border border-theme/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-theme-primary rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary">
                Premium Aktiv - Erweiterte Features verfügbar
              </h3>
            </div>
            <p className="text-theme-muted text-sm mb-4">
              Du hast Zugang zu Financial Statements, Wachstumsanalysen, DCF Calculator und weiteren Premium-Features.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/analyse/stocks/${ticker.toLowerCase()}/financials`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-theme-secondary/30 text-theme-primary rounded-md text-sm hover:bg-theme-secondary/50 transition-colors"
              >
                <DocumentTextIcon className="w-3 h-3" />
                Financial Statements
              </Link>
              <Link
                href={`/analyse/stocks/${ticker.toLowerCase()}/growth`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-theme-secondary/30 text-theme-primary rounded-md text-sm hover:bg-theme-secondary/50 transition-colors"
              >
                <ChartBarIcon className="w-3 h-3" />
                Wachstumsanalyse
              </Link>
              <Link
                href={`/analyse/dcf?ticker=${ticker}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-theme-secondary/30 text-theme-primary rounded-md text-sm hover:bg-theme-secondary/50 transition-colors"
              >
                <BanknotesIcon className="w-3 h-3" />
                DCF Calculator
              </Link>
            </div>
          </div>
        )}

        {/* Non-Premium User - Soft CTA */}
        {!user?.isPremium && (
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-theme-secondary/20 rounded-xl flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-theme-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary mb-2">
              Erweiterte Analyse-Tools
            </h3>
            <p className="text-theme-muted text-sm mb-4 max-w-md mx-auto">
              Erhalte Zugang zu Financial Statements, Wachstumsanalysen, DCF Calculator und erweiterten Charts für {ticker} und 3000+ weitere Aktien.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-secondary text-white rounded-lg transition-colors text-sm"
            >
              Premium Features entdecken
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}