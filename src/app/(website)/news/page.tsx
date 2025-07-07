'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  NewspaperIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  ArrowRightIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  CheckIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

// Types
interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  author: string
  authorImage: string
  publishedDate: string
  readTime: string
  category: 'newsletter' | 'analysis' | 'market-news' | 'education'
  tags: string[]
  image: string
  featured: boolean
}

interface APINews {
  title: string
  description: string
  url: string
  publishedDate: string
  source: string
  symbol?: string
}

// Mock Blog Data - Das würdest du später durch deine CMS/Database ersetzen
const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Warren Buffetts Q4 2024 Portfolio: Die wichtigsten Änderungen im Detail',
    excerpt: 'Eine tiefgreifende Analyse der neuesten 13F-Filing von Berkshire Hathaway und was diese Moves für Privatanleger bedeuten.',
    content: 'Vollständiger Artikel Inhalt...',
    author: 'FinClue Team',
    authorImage: '/images/team-avatar.png',
    publishedDate: '2024-12-15',
    readTime: '8 min',
    category: 'analysis',
    tags: ['Warren Buffett', 'Portfolio Analysis', '13F Filing'],
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop',
    featured: true
  },
  {
    id: '2', 
    title: 'Newsletter #47: Tech-Aktien unter Druck - Chancen für Value Investoren?',
    excerpt: 'Unser wöchentlicher Newsletter mit den wichtigsten Marktbewegungen, Super-Investor Updates und einer Deep-Dive Analyse zu aktuellen Markttrends.',
    content: 'Newsletter Inhalt...',
    author: 'FinClue Research',
    authorImage: '/images/newsletter-avatar.png',
    publishedDate: '2024-12-10',
    readTime: '5 min',
    category: 'newsletter',
    tags: ['Newsletter', 'Tech Stocks', 'Value Investing'],
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop',
    featured: false
  },
  {
    id: '3',
    title: 'Bill Ackmans größte Bets 2024: Universal Music und Netflix im Fokus', 
    excerpt: 'Warum setzt der Star-Investor weiterhin auf Media-Aktien und was können wir aus seiner Strategie lernen?',
    content: 'Artikel Inhalt...',
    author: 'Max Investor',
    authorImage: '/images/author-max.png',
    publishedDate: '2024-12-08',
    readTime: '12 min',
    category: 'analysis',
    tags: ['Bill Ackman', 'Pershing Square', 'Media Stocks'],
    image: 'https://images.unsplash.com/photo-1611532736853-04841ac2c85b?w=800&h=400&fit=crop',
    featured: false
  },
  {
    id: '4',
    title: 'Grundlagen: Wie man 13F Filings richtig liest und interpretiert',
    excerpt: 'Ein kompletter Guide für Anfänger: Was sind 13F Filings, wo findet man sie und wie nutzt man sie für bessere Investment-Entscheidungen.',
    content: 'Educational content...',
    author: 'Sarah Analytics',
    authorImage: '/images/author-sarah.png', 
    publishedDate: '2024-12-05',
    readTime: '15 min',
    category: 'education',
    tags: ['13F Filings', 'SEC', 'Investment Education'],
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop',
    featured: false
  }
]

// Mock API News
const apiNews: APINews[] = [
  {
    title: 'S&P 500 erreicht neues Allzeithoch inmitten KI-Optimismus',
    description: 'Der Markt zeigt weiterhin Stärke, angetrieben von starken Technologie-Earnings und positiven KI-Entwicklungen.',
    url: 'https://example.com/sp500-high',
    publishedDate: '2024-12-16T10:30:00Z',
    source: 'MarketWatch'
  },
  {
    title: 'Fed signalisiert weniger aggressive Zinssenkungen für 2025',
    description: 'Jerome Powell deutet auf eine vorsichtigere Geldpolitik hin, was Auswirkungen auf Growth-Aktien haben könnte.',
    url: 'https://example.com/fed-rates',
    publishedDate: '2024-12-15T14:20:00Z',
    source: 'Reuters'
  }
]

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [emailInput, setEmailInput] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // Filter posts by category
  const filteredPosts = selectedCategory === 'all' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory)

  const featuredPost = blogPosts.find(post => post.featured)
  const regularPosts = blogPosts.filter(post => !post.featured)

  // Newsletter signup
  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewsletterStatus('loading')
    
    // Simulate API call
    setTimeout(() => {
      setNewsletterStatus('success')
      setEmailInput('')
      setTimeout(() => setNewsletterStatus('idle'), 3000)
    }, 1000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    })
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'newsletter': return <EnvelopeIcon className="w-4 h-4" />
      case 'analysis': return <ArrowTrendingUpIcon className="w-4 h-4" />
      case 'market-news': return <NewspaperIcon className="w-4 h-4" />
      case 'education': return <DocumentTextIcon className="w-4 h-4" />
      default: return <DocumentTextIcon className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'newsletter': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'analysis': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'market-news': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'education': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'newsletter': return 'Newsletter'
      case 'analysis': return 'Analyse'
      case 'market-news': return 'Markt News'
      case 'education': return 'Bildung'
      default: return category
    }
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-950 to-black py-24 overflow-hidden">
        
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(34,197,94,0.1),transparent_50%)]"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium mb-8">
              <NewspaperIcon className="w-4 h-4" />
              FinClue Research & News
            </div>
            
            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Investment
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-400 to-purple-400">
                Research & News
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto">
              Professionelle Marktanalysen, Super-Investor Updates und das Wichtigste 
              aus der Finanzwelt. Von Experten für Experten.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-white mb-2">50k+</div>
                <div className="text-gray-400 text-sm">Newsletter Leser</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-2">200+</div>
                <div className="text-gray-400 text-sm">Research Articles</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-2">70+</div>
                <div className="text-gray-400 text-sm">Tracked Investors</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-gray-400 text-sm">Market Updates</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="w-16 h-16 mx-auto mb-6 bg-white/20 rounded-xl flex items-center justify-center">
              <EnvelopeIcon className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              Verpasse keine wichtigen Updates
            </h2>
            <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
              Erhalte wöchentlich unsere Research-Updates zu Super-Investor Portfolios, 
              Marktanalysen und exklusive Insights direkt in dein Postfach.
            </p>

            <form onSubmit={handleNewsletterSignup} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="deine@email.de"
                required
                className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {newsletterStatus === 'loading' ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : newsletterStatus === 'success' ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Angemeldet!
                  </>
                ) : (
                  'Anmelden'
                )}
              </button>
            </form>

            {newsletterStatus === 'success' && (
              <p className="text-green-200 mt-4 text-sm">
                ✅ Erfolgreich angemeldet! Check deine E-Mails.
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-6 mt-8 text-blue-200 text-sm">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Kostenlos & Werbefrei
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Jederzeit abmeldbar
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                DSGVO-konform
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        
        {/* Category Filter */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-theme-muted" />
              <span className="text-theme-muted font-medium">Kategorien:</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-theme-card text-theme-primary hover:bg-theme-secondary/50 border border-theme/10'
                }`}
              >
                Alle ({blogPosts.length})
              </button>
              
              {['newsletter', 'analysis', 'market-news', 'education'].map(category => {
                const count = blogPosts.filter(post => post.category === category).length
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      selectedCategory === category
                        ? 'bg-green-600 text-white'
                        : 'bg-theme-card text-theme-primary hover:bg-theme-secondary/50 border border-theme/10'
                    }`}
                  >
                    {getCategoryIcon(category)}
                    {getCategoryName(category)} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Featured Article */}
        {featuredPost && selectedCategory === 'all' && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <SparklesIcon className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-theme-primary">Featured Article</h2>
            </div>

            <article className="bg-theme-card rounded-2xl overflow-hidden hover:bg-theme-secondary/20 transition-all group border border-theme/10">
              <div className="md:flex">
                <div className="md:w-1/2">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    className="w-full h-64 md:h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="md:w-1/2 p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getCategoryColor(featuredPost.category)}`}>
                      {getCategoryIcon(featuredPost.category)}
                      <span className="ml-1">{getCategoryName(featuredPost.category)}</span>
                    </span>
                    <span className="text-yellow-400 text-sm font-medium">⭐ Featured</span>
                  </div>

                  <h3 className="text-2xl font-bold text-theme-primary mb-4 group-hover:text-green-400 transition-colors">
                    {featuredPost.title}
                  </h3>
                  
                  <p className="text-theme-secondary mb-6 leading-relaxed">
                    {featuredPost.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={featuredPost.authorImage}
                        alt={featuredPost.author}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
                        }}
                      />
                      <div className="text-sm">
                        <div className="text-theme-primary font-medium">{featuredPost.author}</div>
                        <div className="text-theme-muted">{formatDate(featuredPost.publishedDate)} • {featuredPost.readTime}</div>
                      </div>
                    </div>
                    
                    <Link
                      href={`/news/${featuredPost.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Artikel lesen
                      <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* Articles Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-theme-primary">
              {selectedCategory === 'all' ? 'Alle Artikel' : `${getCategoryName(selectedCategory)} Artikel`}
            </h2>
            <span className="text-theme-muted">
              {filteredPosts.length} Artikel gefunden
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map(post => (
              <article
                key={post.id}
                className="bg-theme-card rounded-xl overflow-hidden hover:bg-theme-secondary/20 transition-all group border border-theme/10"
              >
                <div className="relative">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium border backdrop-blur-sm ${getCategoryColor(post.category)}`}>
                      {getCategoryIcon(post.category)}
                      <span className="ml-1">{getCategoryName(post.category)}</span>
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-theme-primary mb-3 group-hover:text-green-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-theme-secondary text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    {post.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-theme-tertiary/50 text-theme-muted text-xs rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={post.authorImage}
                        alt={post.author}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=24&h=24&fit=crop&crop=face'
                        }}
                      />
                      <div className="text-xs text-theme-muted">
                        <span className="font-medium">{post.author}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(post.publishedDate)}</span>
                      </div>
                    </div>
                    
                    <Link
                      href={`/news/${post.id}`}
                      className="text-green-400 hover:text-green-300 text-sm font-medium group-hover:underline"
                    >
                      Lesen →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Market News API Section */}
        <section className="mt-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-theme-primary">Live Markt-News</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apiNews.map((news, index) => (
              <article
                key={index}
                className="bg-theme-card rounded-xl p-6 hover:bg-theme-secondary/20 transition-all border border-theme/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-theme-primary mb-2 hover:text-orange-400 transition-colors">
                      {news.title}
                    </h3>
                    <p className="text-theme-secondary text-sm mb-4">
                      {news.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-theme-muted">
                        <span>{news.source}</span>
                        <span>•</span>
                        <span>{formatDate(news.publishedDate)}</span>
                      </div>
                      <Link
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 text-sm font-medium"
                      >
                        Quelle →
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/market-news"
              className="inline-flex items-center gap-2 px-6 py-3 bg-theme-card hover:bg-theme-secondary/50 text-theme-primary rounded-lg transition-colors border border-theme/10"
            >
              Alle Markt-News ansehen
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}