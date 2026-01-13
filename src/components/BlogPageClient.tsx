// src/components/BlogPageClient.tsx - Light Theme Quartr Style
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { BlogPost } from '@/lib/blog'

interface BlogPageClientProps {
  posts: BlogPost[]
}

// Category mapping
const categoryMap: Record<string, string> = {
  'superinvestor-news': 'Superinvestor Updates',
  'portfolio-moves': 'Superinvestor Updates',
  'insider-trading': 'Superinvestor Updates',
  'analysis': 'Aktienanalysen',
  'education': 'Guides',
  'newsletter': 'Guides',
  'market-news': 'Aktienanalysen',
}

const filterTabs = [
  { id: 'all', label: 'Alle' },
  { id: 'superinvestor', label: 'Superinvestor Updates' },
  { id: 'analysis', label: 'Aktienanalysen' },
  { id: 'guides', label: 'Guides' },
]

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getCategoryLabel(category: string): string {
  return categoryMap[category] || 'Artikel'
}

function matchesFilter(post: BlogPost, filter: string): boolean {
  if (filter === 'all') return true

  if (filter === 'superinvestor') {
    // Superinvestor Updates = mehrere Kategorien + Posts mit relatedInvestors
    const isSuperinvestorCategory = ['superinvestor-news', 'portfolio-moves', 'insider-trading'].includes(post.category)
    const hasRelatedInvestors = post.relatedInvestors && post.relatedInvestors.length > 0
    return isSuperinvestorCategory || hasRelatedInvestors
  }

  if (filter === 'analysis') {
    return ['analysis', 'market-news'].includes(post.category)
  }

  if (filter === 'guides') {
    return ['education', 'newsletter'].includes(post.category)
  }

  return false
}

export default function BlogPageClient({ posts }: BlogPageClientProps) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (!matchesFilter(post, activeFilter)) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query) ||
          post.tags.some(tag => tag.toLowerCase().includes(query))
        )
      }

      return true
    })
  }, [posts, activeFilter, searchQuery])

  return (
    <div>
      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                activeFilter === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Artikel suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-full text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-gray-200 focus:ring-1 focus:ring-gray-200 transition-all"
          />
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <p className="text-sm text-gray-500 mb-6">
          {filteredPosts.length} {filteredPosts.length === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden
        </p>
      )}

      {/* Posts Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 mb-4">
                <Image
                  src={post.imageUrl}
                  alt={post.imageAlt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-emerald-600">
                  {getCategoryLabel(post.category)}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-400">
                  {formatDate(post.publishedDate)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                {post.title}
              </h3>

              {/* Excerpt */}
              <p className="text-sm text-gray-500 line-clamp-2">
                {post.excerpt}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-600 mb-2">Keine Artikel gefunden</p>
          <p className="text-sm text-gray-400">
            Versuche einen anderen Suchbegriff oder Filter
          </p>
        </div>
      )}
    </div>
  )
}
