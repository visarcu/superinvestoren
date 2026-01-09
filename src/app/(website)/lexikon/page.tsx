// app/(website)/lexikon/page.tsx - IMPROVED DESIGN
'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { LEARN_DEFINITIONS, LEXIKON_CATEGORIES } from '@/data/learnDefinitions'
import { ArrowRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function LexikonPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return []
    
    const query = searchQuery.toLowerCase()
    return Object.entries(LEARN_DEFINITIONS)
      .filter(([key, term]) => 
        term.term.toLowerCase().includes(query) ||
        term.definition.toLowerCase().includes(query) ||
        key.toLowerCase().includes(query)
      )
      .slice(0, 6)
  }, [searchQuery])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      
      {/* Hero Section */}
      <div className="pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
            Finanz-Lexikon
          </h1>
          <p className="text-lg text-neutral-400 max-w-xl mx-auto mb-10">
            Entdecke die wichtigsten Kennzahlen und Begriffe der Aktienanalyse
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Suche nach Begriffen wie KGV, Dividende, Beta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-all"
            />
            
            {/* Search Results Dropdown */}
            {searchQuery && isSearchFocused && filteredTerms.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                {filteredTerms.map(([key, term]) => {
                  const categoryEntry = Object.entries(LEXIKON_CATEGORIES).find(([_, cat]) => 
                    cat.terms.includes(key)
                  )
                  const category = categoryEntry ? categoryEntry[1] : null

                  return (
                    <Link
                      key={key}
                      href={`/lexikon/${key}`}
                      className="flex items-center gap-3 p-4 hover:bg-neutral-800 transition-colors border-b border-neutral-800 last:border-b-0"
                      onClick={() => setSearchQuery('')}
                    >
                      {category && <span className="text-lg">{category.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white mb-0.5">{term.term}</div>
                        <div className="text-sm text-neutral-500 truncate">
                          {term.definition.slice(0, 80)}...
                        </div>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-neutral-600" />
                    </Link>
                  )
                })}
              </div>
            )}
            
            {/* No Results */}
            {searchQuery && isSearchFocused && filteredTerms.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 p-4 text-center">
                <div className="text-neutral-500">Keine Begriffe gefunden für &quot;{searchQuery}&quot;</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <div className="flex items-center justify-center gap-12">
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">{Object.keys(LEARN_DEFINITIONS).length}+</div>
            <div className="text-sm text-neutral-500">Begriffe</div>
          </div>
          <div className="w-px h-8 bg-neutral-800"></div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">{Object.keys(LEXIKON_CATEGORIES).length}</div>
            <div className="text-sm text-neutral-500">Kategorien</div>
          </div>
          <div className="w-px h-8 bg-neutral-800"></div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">100%</div>
            <div className="text-sm text-neutral-500">Kostenlos</div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(LEXIKON_CATEGORIES).map(([key, category]) => (
            <Link 
              key={key}
              href={`#${key}`}
              className="group p-6 bg-neutral-900/30 border border-neutral-800/50 hover:border-neutral-700 hover:bg-neutral-900/60 rounded-2xl transition-all duration-200"
            >
              <div className="text-2xl mb-3">{category.icon}</div>
              <h3 className="text-lg font-medium text-white mb-1 group-hover:text-neutral-200">
                {category.title}
              </h3>
              <p className="text-sm text-neutral-500 mb-3 leading-relaxed">
                {category.description}
              </p>
              <div className="text-sm text-neutral-400 font-medium">
                {category.terms.length} Begriffe →
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Terms by Category */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        {Object.entries(LEXIKON_CATEGORIES).map(([categoryKey, category]) => (
          <div key={categoryKey} id={categoryKey} className="mb-16 scroll-mt-24">
            {/* Category Header */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{category.icon}</span>
              <h2 className="text-2xl font-semibold text-white">{category.title}</h2>
              <div className="flex-1 h-px bg-neutral-800/50"></div>
              <span className="text-sm text-neutral-500">{category.terms.length} Begriffe</span>
            </div>
            
            {/* Terms Grid - Cards mit Tags */}
            <div className="grid md:grid-cols-2 gap-3">
              {category.terms.map((termKey) => {
                const termData = LEARN_DEFINITIONS[termKey as keyof typeof LEARN_DEFINITIONS]
                const hasCalculation = !!termData.calculation
                const hasExample = !!termData.example
                
                return (
                  <Link
                    key={termKey}
                    href={`/lexikon/${termKey}`}
                    className="group p-5 rounded-xl border border-transparent hover:border-neutral-800 hover:bg-neutral-900/50 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors mb-1.5">
                          {termData.term}
                        </h3>
                        <p className="text-sm text-neutral-500 leading-relaxed mb-3 line-clamp-2">
                          {termData.definition.slice(0, 100)}...
                        </p>
                        
                        {/* Tags */}
                        {(hasCalculation || hasExample) && (
                          <div className="flex flex-wrap gap-2">
                            {hasCalculation && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-neutral-800/50 text-neutral-400 rounded-md">
                                <span className="text-[10px]">📊</span> Formel
                              </span>
                            )}
                            {hasExample && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-neutral-800/50 text-neutral-400 rounded-md">
                                <span className="text-[10px]">💡</span> Beispiel
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-neutral-700 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-neutral-800/50">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Bereit für die Praxis?
          </h2>
          <p className="text-neutral-400 mb-8">
            Nutze diese Kennzahlen mit echten Börsendaten in unserem Analyse-Terminal.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/analyse"
              className="px-8 py-3 bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl transition-colors"
            >
              Terminal öffnen
            </Link>
            <Link
              href="/auth/signup"
              className="px-8 py-3 text-neutral-400 hover:text-white font-medium transition-colors"
            >
              Kostenloses Konto erstellen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}