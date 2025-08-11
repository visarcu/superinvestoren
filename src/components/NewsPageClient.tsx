// components/NewsPageClient.tsx - VERBESSERTE TYPOGRAPHY & SPACING

'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowRightIcon,
  SparklesIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import FallbackImage from '@/components/FallbackImage'
import type { BlogPost } from '@/lib/blog'

interface NewsPageClientProps {
  posts: BlogPost[]
}

export default function NewsPageClient({ posts }: NewsPageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvestor, setSelectedInvestor] = useState<string>('all')

  // URL-Parameter auslesen
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const categoryParam = urlParams.get('category')
    const investorParam = urlParams.get('investor')
    
    if (categoryParam && ['superinvestor-news', 'portfolio-moves', 'insider-trading', 'newsletter', 'analysis', 'education'].includes(categoryParam)) {
      setSelectedCategory(categoryParam)
    }
    
    if (investorParam) {
      setSelectedInvestor(investorParam)
    }
  }, [])

  // Unique investors from posts
  const availableInvestors = Array.from(new Set(
    posts.flatMap(post => post.relatedInvestors || [])
  )).sort()

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    const matchesInvestor = selectedInvestor === 'all' || 
      (post.relatedInvestors && post.relatedInvestors.includes(selectedInvestor))
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (post.relatedInvestors || []).some(inv => inv.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesInvestor && matchesSearch
  })

  const featuredPost = posts.find(post => post.featured)
  const regularPosts = filteredPosts

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'newsletter': return 'bg-green-500/15 text-green-300 border-green-400/20'
      case 'analysis': return 'bg-green-500/15 text-green-300 border-green-400/20'
      case 'education': return 'bg-green-500/15 text-green-300 border-green-400/20'
      case 'superinvestor-news': return 'bg-green-500/15 text-green-300 border-green-400/20'
      case 'portfolio-moves': return 'bg-green-500/15 text-green-300 border-green-400/20'
      case 'insider-trading': return 'bg-yellow-500/15 text-yellow-300 border-yellow-400/20'
      default: return 'bg-gray-700/50 text-gray-300 border-gray-600/30'
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'newsletter': return 'Newsletter'
      case 'analysis': return 'Analyse'
      case 'education': return 'Bildung'
      case 'superinvestor-news': return 'Investor News'
      case 'portfolio-moves': return 'Portfolio Moves'
      case 'insider-trading': return 'Insider Trading'
      default: return category
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'superinvestor-news': return <UserIcon className="w-4 h-4" />
      case 'portfolio-moves': return <ArrowTrendingUpIcon className="w-4 h-4" />
      case 'insider-trading': return <ExclamationTriangleIcon className="w-4 h-4" />
      case 'newsletter': return <DocumentTextIcon className="w-4 h-4" />
      default: return <SparklesIcon className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* Search Bar - GRÖSSERE EINGABE */}
      <div className="max-w-2xl mb-12">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Suche nach Artikeln, Investoren oder Themen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-14 pr-5 py-5 text-lg bg-[#1A1B23] border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
          />
        </div>
      </div>

      {/* Investor Filter - GRÖSSERE BUTTONS */}
      {availableInvestors.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 font-medium text-base">Investoren:</span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedInvestor('all')}
                className={`px-4 py-2.5 rounded-lg transition-all text-base font-medium ${
                  selectedInvestor === 'all'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
                    : 'bg-[#1A1B23] text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                Alle
              </button>
              
              {availableInvestors.map(investor => {
                const count = posts.filter(post => 
                  post.relatedInvestors?.includes(investor)
                ).length
                
                return (
                  <button
                    key={investor}
                    onClick={() => setSelectedInvestor(investor)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all text-base font-medium ${
                      selectedInvestor === investor
                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
                        : 'bg-[#1A1B23] text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {investor.charAt(0).toUpperCase() + investor.slice(1)} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Category Filter - GRÖSSERE BUTTONS & MEHR SPACING */}
      <div className="mb-16">
        <div className="flex items-center gap-4 mb-10">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400 font-medium text-base">Kategorien:</span>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-lg transition-all text-base font-medium ${
                selectedCategory === 'all'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
                  : 'bg-[#1A1B23] text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              Alle ({posts.length})
            </button>
            
            {['education', 'newsletter', 'analysis', 'superinvestor-news', 'portfolio-moves', 'insider-trading'].map(category => {
              const count = posts.filter(post => post.category === category).length
              if (count === 0) return null
              
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all text-base font-medium ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white shadow-lg shadow-green-600/25'
                      : 'bg-[#1A1B23] text-white hover:bg-white/10 border border-white/10'
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

      {/* Featured Article - GRÖSSERE TYPOGRAPHY */}
      {featuredPost && selectedCategory === 'all' && selectedInvestor === 'all' && searchQuery === '' && (
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-10">
            <SparklesIcon className="w-7 h-7 text-green-400" />
            <h2 className="text-3xl font-bold text-white">Lesetipp</h2>
          </div>

          <article className="bg-[#1A1B23] border border-white/10 rounded-2xl overflow-hidden hover:border-green-500/30 transition-all group">
            <div className="md:flex">
              <div className="md:w-1/2">
                <img
                  src={featuredPost.imageUrl}
                  alt={featuredPost.imageAlt}
                  className="w-full h-72 md:h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="md:w-1/2 p-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${getCategoryColor(featuredPost.category)}`}>
                    {getCategoryIcon(featuredPost.category)}
                    {getCategoryName(featuredPost.category)}
                  </span>
                  <span className="text-green-400 text-sm font-medium">⭐ Lesetipp</span>
                </div>

                <h3 className="text-3xl font-bold text-white mb-5 leading-tight group-hover:text-green-400 transition-colors">
                  {featuredPost.title}
                </h3>
                
                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                  {featuredPost.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FallbackImage
                      src={featuredPost.authorImage}
                      alt={featuredPost.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-white font-medium text-base">{featuredPost.author}</div>
                      <div className="text-gray-400 text-sm">{formatDate(featuredPost.publishedDate)} • {featuredPost.readTime}</div>
                    </div>
                  </div>
                  
                  <Link
                    href={`/news/${featuredPost.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-medium text-base rounded-lg transition-colors shadow-lg shadow-green-600/25"
                  >
                    Artikel lesen
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* Articles Grid - GRÖSSERE CARDS & TYPOGRAPHY */}
      <section>
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold text-white">
            {selectedCategory === 'all' ? 'Alle Artikel' : `${getCategoryName(selectedCategory)} Artikel`}
          </h2>
          <span className="text-gray-400 text-base">
            {filteredPosts.length} Artikel gefunden
          </span>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <DocumentTextIcon className="w-20 h-20 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-400 mb-3">
              Keine Artikel gefunden
            </h3>
            <p className="text-gray-500 text-lg mb-8">
              Versuche andere Filter oder Suchbegriffe
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedInvestor('all')
                setSearchQuery('')
              }}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-base font-medium rounded-lg transition-colors shadow-lg shadow-green-600/25"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {regularPosts.map(post => (
              <article
                key={post.slug}
                className="bg-[#1A1B23] border border-white/10 rounded-xl overflow-hidden hover:border-green-500/30 transition-all group hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1"
              >
                <div className="relative">
                  <img
                    src={post.imageUrl}
                    alt={post.imageAlt}
                    className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm border ${getCategoryColor(post.category)}`}>
                      {getCategoryIcon(post.category)}
                      {getCategoryName(post.category)}
                    </span>
                  </div>
                </div>

                <div className="p-7">
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-green-400 transition-colors line-clamp-2 leading-tight">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-400 text-base mb-5 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FallbackImage
                        src={post.authorImage}
                        alt={post.author}
                        className="w-8 h-8 rounded-full object-cover"
                        fallbackSrc="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=24&h=24&fit=crop&crop=face"
                      />
                      <div className="text-sm text-gray-400">
                        <span className="font-medium">{post.author}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(post.publishedDate)}</span>
                      </div>
                    </div>
                    
                    <Link
                      href={`/news/${post.slug}`}
                      className="text-green-400 hover:text-green-300 text-base font-medium group-hover:underline"
                    >
                      Lesen →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}