// components/SuperinvestorNewsSection.tsx
// SERVER COMPONENT - kein 'use client'

import React from 'react'
import Link from 'next/link'
import { 
  DocumentTextIcon,
  ArrowRightIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { getSuperinvestorNews } from '@/lib/blog'
import InvestorAvatar from '@/components/InvestorAvatar'

export default function SuperinvestorNewsSection() {
  // Server-seitig ausführen - kein Problem mit fs
  const superinvestorNews = getSuperinvestorNews(3)

  return (
    <section className="bg-gray-950 noise-bg py-20 border-t border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium mb-6">
            <DocumentTextIcon className="w-4 h-4" />
            Superinvestor News
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Aktuelle 
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"> Portfolio-Moves</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Die neuesten Analysen und Einblicke zu den Portfolio-Bewegungen der Top-Investoren
          </p>
        </div>

        {superinvestorNews.length > 0 ? (
          <>
            {/* Featured Superinvestor Articles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {superinvestorNews.map(article => (
                <Link
                  key={article.slug}
                  href={`/news/${article.slug}`}
                  className="group bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-yellow-500/30 transition-all"
                >
                  <div className="relative">
                    <img
                      src={article.imageUrl}
                      alt={article.imageAlt}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-lg text-xs font-medium backdrop-blur-sm border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {article.category === 'superinvestor-news' ? 'Investor News' : 
                         article.category === 'portfolio-moves' ? 'Portfolio Moves' : 
                         'Insider Trading'}
                      </span>
                    </div>
                    
                    {/* Related Investor Badge */}
                    {article.relatedInvestors?.[0] && (
                      <div className="absolute top-4 right-4">
                        <InvestorAvatar
                          name={article.relatedInvestors[0]}
                          size="sm"
                          className="ring-2 ring-yellow-400/50"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>

                    {/* Related Investor Name */}
                    {article.relatedInvestors?.[0] && (
                      <div className="flex items-center gap-2 mb-3">
                        <UserIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400 text-sm font-medium">
                          {article.relatedInvestors[0].charAt(0).toUpperCase() + article.relatedInvestors[0].slice(1)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(article.publishedDate).toLocaleDateString('de-DE')}</span>
                      <span className="text-yellow-400 group-hover:underline">Mehr lesen →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* CTA to full news section */}
            <div className="text-center">
              <Link
                href="/news?category=superinvestor-news"
                className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 font-semibold rounded-xl transition-colors duration-200"
              >
                Alle Superinvestor News
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              <p className="text-gray-500 text-sm mt-3">
                Portfolio-Moves, 13F-Analysen und Investment-Strategien
              </p>
            </div>
          </>
        ) : (
          /* Fallback wenn keine News vorhanden */
          <div className="text-center py-12">
            <DocumentTextIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              Superinvestor News kommen bald
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Wir arbeiten daran, dir die neuesten Portfolio-Bewegungen und Analysen zu bringen
            </p>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 hover:text-white rounded-lg transition-colors"
            >
              Alle Research-Artikel ansehen
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}