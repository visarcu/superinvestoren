// app/(website)/lexikon/page.tsx - MODERNISIERT MIT SUCHE
'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { LEARN_DEFINITIONS, LEXIKON_CATEGORIES } from '@/data/learnDefinitions'
import { ArrowRightIcon, BookOpenIcon, LightBulbIcon, CalculatorIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function LexikonPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Filter terms based on search query
  const filteredTerms = useMemo(() => {
    if (!searchQuery.trim()) return []
    
    const query = searchQuery.toLowerCase()
    return Object.entries(LEARN_DEFINITIONS)
      .filter(([key, term]) => 
        term.term.toLowerCase().includes(query) ||
        term.definition.toLowerCase().includes(query) ||
        key.toLowerCase().includes(query)
      )
      .slice(0, 6) // Limit to 6 results
  }, [searchQuery])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
      {/* Header */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium backdrop-blur-sm mb-4">
            <BookOpenIcon className="w-3 h-3" />
            Finanz-Lexikon
          </div>
          
          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4">
            Verstehe die Finanzmärkte
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Entdecke die wichtigsten Kennzahlen und Begriffe der Aktienanalyse
          </p>
          
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Suche nach Begriffen wie KGV, Dividende, Beta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-green-500/50 transition-all"
            />
          </div>
          
          {/* Search Results Dropdown */}
          {searchQuery && isSearchFocused && filteredTerms.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#161618] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {filteredTerms.map(([key, term]) => {
                // Find category
                const categoryEntry = Object.entries(LEXIKON_CATEGORIES).find(([_, cat]) => 
                  cat.terms.includes(key)
                )
                const category = categoryEntry ? categoryEntry[1] : null

                return (
                  <Link
                    key={key}
                    href={`/lexikon/${key}`}
                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                    onClick={() => setSearchQuery('')}
                  >
                    {category && <span className="text-lg">{category.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white mb-1">{term.term}</div>
                      <div className="text-sm text-gray-400 truncate">
                        {term.definition.slice(0, 100)}...
                      </div>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-gray-500" />
                  </Link>
                )
              })}
              
              {filteredTerms.length === 6 && (
                <div className="p-3 text-center text-sm text-gray-400 bg-white/5">
                  Weitere Ergebnisse verfügbar - verfeinere deine Suche
                </div>
              )}
            </div>
          )}
          
          {/* No Results */}
          {searchQuery && isSearchFocused && filteredTerms.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#161618] border border-white/10 rounded-xl shadow-2xl z-50 p-4 text-center">
              <div className="text-gray-400">Keine Begriffe gefunden für "{searchQuery}"</div>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BookOpenIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Kostenloses Finanz-Lexikon</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Über {Object.keys(LEARN_DEFINITIONS).length} wichtige Kennzahlen und Begriffe der Aktienanalyse. 
                Kostenlose Erklärungen von Experten für Einsteiger und Fortgeschrittene.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06] text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {Object.keys(LEARN_DEFINITIONS).length}+
          </div>
          <div className="text-gray-400 text-sm">Finanz-Begriffe</div>
        </div>
        <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06] text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {Object.keys(LEXIKON_CATEGORIES).length}
          </div>
          <div className="text-gray-400 text-sm">Kategorien</div>
        </div>
        <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06] text-center">
          <div className="text-2xl font-bold text-white mb-1">100%</div>
          <div className="text-gray-400 text-sm">Kostenlos</div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {Object.entries(LEXIKON_CATEGORIES).map(([key, category]) => (
          <div 
            key={key} 
            className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/5 transition-all group"
          >
            <div className="text-3xl mb-4">{category.icon}</div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-brand-light transition-colors">
              {category.title}
            </h3>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              {category.description}
            </p>
            <div className="text-sm text-brand-light font-medium">
              {category.terms.length} Begriffe
            </div>
          </div>
        ))}
      </div>

      {/* Terms by Category */}
      <div className="space-y-12">
        {Object.entries(LEXIKON_CATEGORIES).map(([categoryKey, category]) => (
          <div key={categoryKey} id={categoryKey}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{category.icon}</span>
              <h3 className="text-2xl font-semibold text-white">{category.title}</h3>
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-sm text-gray-400">{category.terms.length} Begriffe</span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.terms.map((termKey) => {
                const termData = LEARN_DEFINITIONS[termKey as keyof typeof LEARN_DEFINITIONS]
                return (
                  <Link
                    key={termKey}
                    href={`/lexikon/${termKey}`}
                    className="group block p-6 bg-[#161618] border border-white/[0.06] rounded-xl hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-white group-hover:text-brand-light transition-colors">
                        {termData.term}
                      </h4>
                      <ArrowRightIcon className="w-4 h-4 text-gray-500 group-hover:text-brand-light transition-all" />
                    </div>
                    
                    <p className="text-gray-400 text-sm leading-relaxed mb-3">
                      {termData.definition.slice(0, 120)}...
                    </p>
                    
                    {termData.calculation && (
                      <div className="flex items-center gap-2 text-xs text-brand-light/80">
                        <CalculatorIcon className="w-3 h-3" />
                        <span>Berechnung verfügbar</span>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-16">
        <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-semibold text-white mb-4">
            Bereit für die Praxis?
          </h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Nutze diese Kennzahlen mit echten Börsendaten in unserem professionellen 
            Analyse-Terminal und werde zum besseren Investor.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/analyse"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all"
            >
              <LightBulbIcon className="w-4 h-4" />
              Terminal kostenlos testen
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all border border-white/10 hover:border-white/20"
            >
              Kostenloses Konto erstellen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}