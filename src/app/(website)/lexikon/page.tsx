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
    <div className="min-h-screen bg-[#0A0B0F]">
      {/* Hero Section - Fixed Navbar Issue */}
      <div className="relative pt-24 pb-16 px-4">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-blue-500/5 to-purple-500/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0B0F]/50 to-[#0A0B0F]" />
        
        <div className="relative max-w-6xl mx-auto text-center">
         <br /><br />
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Verstehe die Finanzmärkte
          </h1>
          
          <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Entdecke die wichtigsten Kennzahlen und Begriffe der Aktienanalyse. 
            Kostenlose Erklärungen von Experten für Einsteiger und Fortgeschrittene.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Suche nach Begriffen wie KGV, Dividende, Beta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="block w-full pl-12 pr-4 py-4 bg-[#1A1B23] border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {searchQuery && isSearchFocused && filteredTerms.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1B23] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1B23] border border-white/10 rounded-xl shadow-2xl z-50 p-4 text-center">
                <div className="text-gray-400">Keine Begriffe gefunden für "{searchQuery}"</div>
              </div>
            )}
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/analyse"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25"
            >
              <LightBulbIcon className="w-5 h-5" />
              Jetzt mit echten Daten analysieren
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#kategorien"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              <BookOpenIcon className="w-5 h-5" />
              Begriffe erkunden
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {Object.keys(LEARN_DEFINITIONS).length}+
              </div>
              <div className="text-gray-400">Finanz-Begriffe</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {Object.keys(LEXIKON_CATEGORIES).length}
              </div>
              <div className="text-gray-400">Kategorien</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">100%</div>
              <div className="text-gray-400">Kostenlos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div id="kategorien" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Erkunde die Kategorien
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Finde schnell die Kennzahlen, die du suchst - organisiert nach Themengebieten
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {Object.entries(LEXIKON_CATEGORIES).map(([key, category]) => (
              <div 
                key={key} 
                className="group bg-[#1A1B23] border border-white/10 rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="text-4xl mb-4">{category.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">
                  {category.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  {category.description}
                </p>
                <div className="text-sm text-green-400 font-medium">
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
                  <h3 className="text-2xl font-bold text-white">{category.title}</h3>
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
                        className="group block p-6 bg-[#1A1B23] border border-white/10 rounded-xl hover:border-green-500/30 transition-all duration-200 hover:transform hover:scale-102"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                            {termData.term}
                          </h4>
                          <ArrowRightIcon className="w-4 h-4 text-gray-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
                        </div>
                        
                        <p className="text-gray-400 text-sm leading-relaxed mb-3">
                          {termData.definition.slice(0, 120)}...
                        </p>
                        
                        {termData.calculation && (
                          <div className="flex items-center gap-2 text-xs text-green-400/80">
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
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border border-green-500/20 rounded-3xl text-center overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5" />
            
            <div className="relative">
              <h3 className="text-3xl font-bold text-white mb-4">
                Bereit für die Praxis?
              </h3>
              <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Nutze diese Kennzahlen mit echten Börsendaten in unserem professionellen 
                Analyse-Terminal und werde zum besseren Investor.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/analyse"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25"
                >
                  <LightBulbIcon className="w-5 h-5" />
                  Terminal kostenlos testen
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20"
                >
                  Kostenloses Konto erstellen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}