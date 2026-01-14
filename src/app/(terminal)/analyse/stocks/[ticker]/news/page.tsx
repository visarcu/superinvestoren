// src/app/(terminal)/analyse/stocks/[ticker]/news/page.tsx - FEY/QUARTR CLEAN STYLE
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import SocialPulse from '@/components/SocialPulse'
import {
  NewspaperIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  ChartBarIcon,
  BookmarkIcon
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

interface User {
  id: string
  email: string
  isPremium: boolean
}

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
  const [activeTab, setActiveTab] = useState<'news' | 'social'>('news')

  const stock = stocks.find(s => s.ticker === ticker)
  const ARTICLES_PER_PAGE = 20

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
          setUser({ id: session.user.id, email: session.user.email || '', isPremium: profile?.is_premium || false })
        }
      } catch (error) {
        console.error('Error loading user:', error)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (activeTab !== 'news') {
      setLoading(false)
      return
    }

    async function loadNews() {
      setLoading(true)
      setError(null)

      try {
        const newsRes = await fetch(`/api/stock-news/${ticker}?page=${currentPage}&limit=${ARTICLES_PER_PAGE}`)

        if (newsRes.ok) {
          const data = await newsRes.json()
          setNewsData(data.articles || [])
        } else {
          setNewsData([])
          setError('Keine aktuellen Nachrichten verfügbar.')
        }
      } catch (error) {
        console.error('Error loading news:', error)
        setError('Fehler beim Laden der Nachrichten')
        setNewsData([])
      } finally {
        setLoading(false)
      }
    }

    if (ticker && user !== null) {
      loadNews()
    }
  }, [ticker, currentPage, user, activeTab])

  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(newsData.length / ARTICLES_PER_PAGE)))
  }, [newsData])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Heute'
    if (diffDays === 2) return 'Gestern'
    if (diffDays <= 7) return `vor ${diffDays - 1} Tagen`

    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
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

  const filteredNews = selectedSource === 'all'
    ? newsData
    : newsData.filter(article => article.site.toLowerCase().includes(selectedSource.toLowerCase()))

  const sources = Array.from(new Set(newsData.map(article => article.site))).slice(0, 5)

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8 space-y-6">

        {/* Tab Navigation - Pill Style */}
        <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg w-fit">
          {[
            { id: 'news', label: 'Nachrichten', icon: NewspaperIcon },
            { id: 'social', label: 'Social Pulse', icon: SignalIcon }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-theme-card text-theme-primary shadow-sm'
                    : 'text-theme-muted hover:text-theme-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* News Tab Content */}
        {activeTab === 'news' ? (
          <>
            {/* Filter Bar - Clean Style */}
            {newsData.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-theme-muted">Filter:</span>
                <button
                  onClick={() => setSelectedSource('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    selectedSource === 'all'
                      ? 'bg-theme-card text-theme-primary border border-theme-light'
                      : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  Alle Quellen ({newsData.length})
                </button>
                {sources.map(source => (
                  <button
                    key={source}
                    onClick={() => setSelectedSource(source)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      selectedSource === source
                        ? 'bg-theme-card text-theme-primary border border-theme-light'
                        : 'text-theme-muted hover:text-theme-secondary'
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-theme-card rounded-xl border border-theme-light p-4">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-theme-muted" />
                  <span className="text-theme-muted text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <span className="text-theme-muted text-sm">Lade Nachrichten...</span>
                </div>
              </div>
            ) : (
              <>
                {/* News Articles - Clean Card Style */}
                <div className="space-y-4">
                  {filteredNews.map((article, index) => (
                    <article
                      key={article.url + index}
                      className="bg-theme-card rounded-xl border border-theme-light overflow-hidden hover:border-emerald-500/30 transition-colors group"
                    >
                      <div className="p-5">
                        <div className="flex flex-col lg:flex-row gap-5">
                          {/* Article Image */}
                          {article.image && (
                            <div className="lg:w-48 h-32 lg:h-28 rounded-lg overflow-hidden flex-shrink-0 bg-theme-secondary/30">
                              <img
                                src={article.image}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                          )}

                          {/* Article Content */}
                          <div className="flex-1 space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4">
                              <h2 className="text-base font-medium text-theme-primary leading-snug group-hover:text-emerald-400 transition-colors">
                                {article.title}
                              </h2>
                              {user?.isPremium && (
                                <button
                                  onClick={() => toggleSaveArticle(article.url)}
                                  className="p-1.5 rounded-lg hover:bg-theme-secondary/30 transition-colors flex-shrink-0"
                                >
                                  <BookmarkIcon
                                    className={`w-4 h-4 ${
                                      savedArticles.has(article.url) ? 'text-emerald-400 fill-emerald-400' : 'text-theme-muted'
                                    }`}
                                  />
                                </button>
                              )}
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-4 text-xs text-theme-muted">
                              <span>{article.site}</span>
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {formatDate(article.publishedDate)} • {formatTime(article.publishedDate)}
                              </span>
                              {article.symbol && (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                                  {article.symbol}
                                </span>
                              )}
                            </div>

                            {/* Text */}
                            <p className="text-theme-muted text-sm line-clamp-2">
                              {article.text}
                            </p>

                            {/* Action */}
                            <Link
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              Artikel lesen
                              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Empty State */}
                {filteredNews.length === 0 && !error && (
                  <div className="bg-theme-card rounded-xl border border-theme-light p-8 text-center">
                    <div className="w-12 h-12 bg-theme-secondary/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <NewspaperIcon className="w-6 h-6 text-theme-muted" />
                    </div>
                    <p className="text-theme-muted text-sm">Keine Nachrichten für {ticker} gefunden</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-light rounded-lg text-sm text-theme-primary hover:border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme-light rounded-lg text-sm text-theme-primary hover:border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Weiter
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* Social Pulse Tab */
          <SocialPulse ticker={ticker} />
        )}

        {/* Quick Link - Clean Style */}
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}`}
          className="flex items-center gap-3 p-4 bg-theme-card rounded-xl border border-theme-light hover:border-emerald-500/30 transition-colors group"
        >
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-theme-primary group-hover:text-emerald-400 transition-colors">
              {ticker} Analyse
            </p>
            <p className="text-xs text-theme-muted">Kennzahlen, Charts, Bewertungen</p>
          </div>
        </Link>

      </main>
    </div>
  )
}
