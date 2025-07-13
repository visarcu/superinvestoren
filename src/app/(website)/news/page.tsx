'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import NewsletterSignup from '@/components/NewsletterSignup'
import { 
  NewspaperIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  ArrowRightIcon,
  SparklesIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  CheckIcon,
  FunnelIcon,
  BookOpenIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

// Types
interface BlogPost {
  id: string
  slug: string
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

// Mock Blog Data
const blogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'warren-buffett-q4-2024-portfolio-analyse',
    title: 'Warren Buffetts Q4 2024 Portfolio: Die wichtigsten Änderungen im Detail',
    excerpt: 'Eine tiefgreifende Analyse der neuesten 13F-Filing von Berkshire Hathaway und was diese Moves für Privatanleger bedeuten.',
    content: 'Vollständiger Artikel Inhalt...',
    author: 'FinClue Research',
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
    slug: 'newsletter-47-tech-aktien-value-chancen',
    title: 'Newsletter #47: Tech-Aktien unter Druck - Chancen für Value Investoren?',
    excerpt: 'Unser wöchentlicher Newsletter mit den wichtigsten Marktbewegungen, Super-Investor Updates und einer Deep-Dive Analyse zu aktuellen Markttrends.',
    content: 'Newsletter Inhalt...',
    author: 'Max Steinberg',
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
    slug: 'bill-ackman-media-strategie-2024',
    title: 'Bill Ackmans größte Bets 2024: Universal Music und Netflix im Fokus', 
    excerpt: 'Warum setzt der Star-Investor weiterhin auf Media-Aktien und was können wir aus seiner Strategie lernen?',
    content: 'Artikel Inhalt...',
    author: 'Sarah Johnson',
    authorImage: '/images/author-sarah.png',
    publishedDate: '2024-12-08',
    readTime: '12 min',
    category: 'analysis',
    tags: ['Bill Ackman', 'Pershing Square', 'Media Stocks'],
    image: 'https://images.unsplash.com/photo-1611532736853-04841ac2c85b?w=800&h=400&fit=crop',
    featured: false
  },
  {
    id: '4',
    slug: 'grundlagen-13f-filings-richtig-lesen',
    title: 'Grundlagen: Wie man 13F Filings richtig liest und interpretiert',
    excerpt: 'Ein kompletter Guide für Anfänger: Was sind 13F Filings, wo findet man sie und wie nutzt man sie für bessere Investment-Entscheidungen.',
    content: 'Educational content...',
    author: 'FinClue Team',
    authorImage: '/images/author-team.png', 
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
  const [searchQuery, setSearchQuery] = useState('')

  // Filter posts by category and search
  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })

  const featuredPost = blogPosts.find(post => post.featured)
  const regularPosts = filteredPosts.filter(post => !post.featured)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'newsletter': return 'bg-gray-800 text-gray-300'
      case 'analysis': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'market-news': return 'bg-gray-800 text-gray-300'
      case 'education': return 'bg-gray-800 text-gray-300'
      default: return 'bg-gray-800 text-gray-300'
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
    <div className="min-h-screen bg-[#0A0B0F]">
      
      {/* 🏛️ CLEAN Hero Section - Lexikon Style */}
      <div className="relative pt-24 pb-16 px-4">
        {/* Subtile Background wie Lexikon */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-gray-500/5 to-gray-500/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0B0F]/50 to-[#0A0B0F]" />
        
        <div className="relative max-w-6xl mx-auto text-center">
          {/* Badge wie Lexikon */}
          <br>
          </br>
          {/* Clean Typography wie Lexikon */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Research & Analysen
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Professionelle Marktanalysen, Super-Investor Updates und fundierte Einblicke 
            in die Welt der Finanzen. Von Experten für bessere Investment-Entscheidungen.
          </p>
          
          {/* Search Bar wie Lexikon */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Suche nach Artikeln, Investoren oder Themen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-[#1A1B23] border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
              />
            </div>
          </div>
          
          {/* Clean CTA Buttons wie Lexikon */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/analyse"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25"
            >
              <SparklesIcon className="w-5 h-5" />
              Jetzt Aktien analysieren
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#artikel"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              <BookOpenIcon className="w-5 h-5" />
              Artikel durchstöbern
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section wie Lexikon */}
      <div className="py-16 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">100+</div>
              <div className="text-gray-400">Newsletter Leser</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">20+</div>
              <div className="text-gray-400">Analysen</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">90+</div>
              <div className="text-gray-400">Getrackte Investoren</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">Markt Updates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-20" id="artikel">
        
        {/* Category Filter wie Lexikon */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 font-medium">Filter:</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-[#1A1B23] text-white hover:bg-white/10 border border-white/10'
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
                    className={`px-4 py-2 rounded-lg transition-all ${
                      selectedCategory === category
                        ? 'bg-green-600 text-white'
                        : 'bg-[#1A1B23] text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {getCategoryName(category)} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Featured Article */}
        {featuredPost && selectedCategory === 'all' && searchQuery === '' && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <SparklesIcon className="w-6 h-6 text-green-400" />
              <h2 className="text-2xl font-bold text-white">Featured Article</h2>
            </div>

            <article className="bg-[#1A1B23] border border-white/10 rounded-2xl overflow-hidden hover:border-green-500/30 transition-all group">
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
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getCategoryColor(featuredPost.category)}`}>
                      {getCategoryName(featuredPost.category)}
                    </span>
                    <span className="text-green-400 text-sm font-medium">⭐ Featured</span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-green-400 transition-colors">
                    {featuredPost.title}
                  </h3>
                  
                  <p className="text-gray-400 mb-6 leading-relaxed">
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
                        <div className="text-white font-medium">{featuredPost.author}</div>
                        <div className="text-gray-400">{formatDate(featuredPost.publishedDate)} • {featuredPost.readTime}</div>
                      </div>
                    </div>
                    
                    <Link
                      href={`/news/${featuredPost.slug}`}
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
            <h2 className="text-2xl font-bold text-white">
              {selectedCategory === 'all' ? 'Alle Artikel' : `${getCategoryName(selectedCategory)} Artikel`}
            </h2>
            <span className="text-gray-400">
              {filteredPosts.length} Artikel gefunden
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {regularPosts.map(post => (
              <article
                key={post.id}
                className="bg-[#1A1B23] border border-white/10 rounded-xl overflow-hidden hover:border-green-500/30 transition-all group"
              >
                <div className="relative">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${getCategoryColor(post.category)}`}>
                      {getCategoryName(post.category)}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-3 group-hover:text-green-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    {post.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded"
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
                      <div className="text-xs text-gray-400">
                        <span className="font-medium">{post.author}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(post.publishedDate)}</span>
                      </div>
                    </div>
                    
                    <Link
                      href={`/news/${post.slug}`}
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
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
              <NewspaperIcon className="w-5 h-5 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Live Markt-News</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apiNews.map((news, index) => (
              <article
                key={index}
                className="bg-[#1A1B23] border border-white/10 rounded-xl p-6 hover:border-green-500/30 transition-all"
              >
                <h3 className="text-lg font-semibold text-white mb-2 hover:text-green-400 transition-colors">
                  {news.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {news.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{news.source}</span>
                    <span>•</span>
                    <span>{formatDate(news.publishedDate)}</span>
                  </div>
                  <div className="text-gray-500 text-sm font-medium">
                    Coming Soon
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Newsletter Section - Clean wie Lexikon */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Clean Newsletter Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6">
              <EnvelopeIcon className="w-4 h-4" />
              Newsletter
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Research Updates erhalten
            </h3>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Erhalte wöchentlich die wichtigsten Super-Investor Updates, 
              Marktanalysen und Research-Insights direkt in dein Postfach.
            </p>
            
            {/* Newsletter Signup Component */}
            <div className="mb-8">
              <NewsletterSignup />
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-green-400 text-sm">
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

          {/* Clean CTA Section */}
          <div className="relative p-12 bg-gradient-to-r from-green-500/10 via-gray-500/10 to-gray-500/10 border border-green-500/20 rounded-3xl text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-gray-500/5" />
            
            <div className="relative">
              <h3 className="text-3xl font-bold text-white mb-4">
                Bereit für die Praxis?
              </h3>
              <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Nutze die Erkenntnisse aus unseren Analysen mit echten Börsendaten 
                in unserem professionellen Analyse-Terminal.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/analyse"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Terminal kostenlos testen
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20"
                >
                  Kostenloses Konto erstellen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}