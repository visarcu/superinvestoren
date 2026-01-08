// ============================================
// 📁 app/(website)/news/[slug]/page.tsx (LAYOUT FIXED!)
// ============================================

import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { 
  ArrowLeftIcon,
  ClockIcon,
  TagIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import NewsletterSignup from '@/components/NewsletterSignup'
import FallbackImage from '@/components/FallbackImage'

// SERVER IMPORTS
import { getPostBySlug, getPostContent, getRelatedPosts } from '@/lib/blog'

interface Props {
  params: { slug: string }
}

// KEIN 'use client' - Server Component!
export default async function NewsArticlePage({ params }: Props) {
  // Läuft auf Server - kein fs Problem!
  const article = getPostBySlug(params.slug)
  
  if (!article) {
    notFound()
  }

  // Markdown zu HTML konvertieren
  const content = await getPostContent(params.slug)
  const relatedArticles = getRelatedPosts(params.slug, 3)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'newsletter': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'analysis': return 'bg-brand/20 text-brand-light border-green-500/30'
      case 'market-news': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'education': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
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
      {/* Header/Navigation - FIXED SPACING & Z-INDEX */}
      <div className="relative z-10 pt-32 pb-8 px-4 border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/news"
            className="relative z-20 inline-flex items-center gap-2 text-gray-400 hover:text-brand-light transition-colors mb-6 cursor-pointer group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Zurück zu Research & Analysen
          </Link>
        </div>
      </div>

      {/* Article Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Article Header */}
        <header className="mb-12">
          {/* Category Badge */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getCategoryColor(article.category)}`}>
              {getCategoryName(article.category)}
            </span>
            {article.featured && (
              <span className="flex items-center gap-1 text-brand-light text-sm font-medium">
                <SparklesIcon className="w-4 h-4" />
                Featured
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Meta Info */}
          <div className="flex items-center gap-6 text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <FallbackImage
                src={article.authorImage}
                alt={article.author}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="font-medium">{article.author}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{article.readTime}</span>
            </div>
            
            <span>{formatDate(article.publishedDate)}</span>
          </div>

          {/* Hero Image */}
          <div className="relative rounded-2xl overflow-hidden mb-8">
            <img
              src={article.imageUrl}
              alt={article.imageAlt}
              className="w-full h-64 md:h-96 object-cover"
            />
            {article.imageCaption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm p-4">
                {article.imageCaption}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {(article.tags || []).map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 px-3 py-1 bg-[#1A1B23] border border-white/10 text-gray-300 text-sm rounded-lg"
              >
                <TagIcon className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* Article Body - Rendered Markdown */}
        <article className="prose prose-invert prose-lg max-w-none">
          <div 
            className="text-gray-300 leading-relaxed space-y-6 markdown-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>

        {/* Call-to-Action */}
        <div className="mt-16 p-8 bg-gradient-to-r from-brand/10 to-gray-500/10 border border-brand/20 rounded-2xl text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Mehr solche Analysen gefällig?
          </h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Tracke über 90 Super-Investoren automatisch und erhalte Alerts bei wichtigen Portfolio-Änderungen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/analyse"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              <SparklesIcon className="w-5 h-5" />
              Jetzt kostenlos testen
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors border border-white/10"
            >
              Kostenloses Konto erstellen
            </Link>
          </div>
        </div>
      </main>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16 border-t border-white/5">
          <h3 className="text-2xl font-bold text-white mb-8">Weitere Artikel</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map(post => (
              <article
                key={post.slug}
                className="bg-[#1A1B23] border border-white/10 rounded-xl overflow-hidden hover:border-green-500/30 transition-all group"
              >
                <div className="relative">
                  <img
                    src={post.imageUrl}
                    alt={post.imageAlt}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium backdrop-blur-sm border ${getCategoryColor(post.category)}`}>
                      {getCategoryName(post.category)}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="text-lg font-bold text-white mb-3 group-hover:text-brand-light transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      <span>{formatDate(post.publishedDate)}</span>
                      <span className="mx-1">•</span>
                      <span>{post.readTime}</span>
                    </div>
                    
                    <Link
                      href={`/news/${post.slug}`}
                      className="text-brand-light hover:text-green-300 text-sm font-medium group-hover:underline"
                    >
                      Lesen →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter Signup */}
      <section className="py-16 px-4 bg-[#1A1B23]/50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Verpasse keine wichtigen Updates
          </h3>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Erhalte wöchentlich die wichtigsten Super-Investor Moves und Marktanalysen direkt in dein Postfach.
          </p>
          
          <NewsletterSignup />
          
          <div className="flex flex-wrap justify-center gap-6 text-brand-light text-sm mt-6">
            <span>✓ Kostenlos & Werbefrei</span>
            <span>✓ Jederzeit abmeldbar</span>
            <span>✓ DSGVO-konform</span>
          </div>
        </div>
      </section>
    </div>
  )
}