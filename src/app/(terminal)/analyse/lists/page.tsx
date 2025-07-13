// src/app/analyse/lists/page.tsx - PROFESSIONELLES DESIGN
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ListBulletIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  StarIcon,
  GlobeAltIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface StockList {
  id: string
  title: string
  description: string
  category: 'curated' | 'indices' | 'performance' | 'dividends'
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  stockCount: number
  updateFrequency: 'static' | 'quarterly' | 'daily'
  lastUpdated: string
  href: string
  premium?: boolean
  comingSoon?: boolean
}

// ✅ SMARTE DATUM-GENERIERUNG
function getLastUpdatedDate(updateFrequency: string): string {
  const now = new Date()
  
  switch (updateFrequency) {
    case 'daily':
      return now.toISOString().split('T')[0]
      
    case 'quarterly':
      const currentMonth = now.getMonth()
      const quarterEndMonth = Math.floor(currentMonth / 3) * 3 + 2
      const quarterEndDate = new Date(now.getFullYear(), quarterEndMonth, 0)
      
      if (quarterEndDate > now) {
        quarterEndDate.setMonth(quarterEndMonth - 3)
      }
      
      return quarterEndDate.toISOString().split('T')[0]
      
    case 'static':
      return '2024-06-26'
      
    default:
      return now.toISOString().split('T')[0]
  }
}

// ✅ LISTS MIT DYNAMISCHEN DATEN
const STOCK_LISTS_CONFIG: Omit<StockList, 'lastUpdated'>[] = [
  // KURATIERTE LISTEN
  {
    id: 'global-titans',
    title: 'Globale Marktführer',
    description: 'Handverlesene globale Champions mit stabiler Performance',
    category: 'curated',
    icon: GlobeAltIcon,
    stockCount: 45,
    updateFrequency: 'static',
    href: '/analyse/lists/global-titans'
  },
  {
    id: 'magnificent-seven',
    title: 'Magnificent Seven',
    description: 'Die 7 größten Tech-Unternehmen der Welt',
    category: 'curated',
    icon: StarIcon,
    stockCount: 7,
    updateFrequency: 'static',
    href: '/analyse/lists/magnificent-seven'
  },
  {
    id: 'ai-leaders',
    title: 'KI-Marktführer',
    description: 'Führende Unternehmen im Bereich Künstliche Intelligenz',
    category: 'curated',
    icon: ChartBarIcon,
    stockCount: 19,
    updateFrequency: 'static',
    href: '/analyse/lists/ai-leaders'
  },
  {
    id: 'german-champions',
    title: 'Deutsche Champions',
    description: 'Führende deutsche Unternehmen im globalen Markt',
    category: 'curated',
    icon: BuildingOfficeIcon,
    stockCount: 14,
    updateFrequency: 'static',
    href: '/analyse/lists/german-champions'
  },

  // INDIZES
  {
    id: 'sp500',
    title: 'S&P 500',
    description: 'Standard & Poor\'s 500 Index - Top US-Unternehmen',
    category: 'indices',
    icon: ChartBarIcon,
    stockCount: 100,
    updateFrequency: 'quarterly',
    href: '/analyse/lists/sp500'
  },
  {
    id: 'nasdaq100',
    title: 'NASDAQ 100',
    description: 'NASDAQ 100 Tech-Index der größten Technologieunternehmen',
    category: 'indices',
    icon: ChartBarIcon,
    stockCount: 50,
    updateFrequency: 'quarterly',
    href: '/analyse/lists/nasdaq100'
  },
  {
    id: 'dax40',
    title: 'DAX 40',
    description: 'Deutscher Aktienindex der 40 größten Unternehmen',
    category: 'indices',
    icon: ChartBarIcon,
    stockCount: 40,
    updateFrequency: 'quarterly',
    href: '/analyse/lists/dax40'
  },

  // PERFORMANCE
  {
    id: 'gainers-today',
    title: 'Tagesgewinner',
    description: 'Aktien mit der besten Performance des heutigen Handelstags',
    category: 'performance',
    icon: ArrowTrendingUpIcon,
    stockCount: 20,
    updateFrequency: 'daily',
    href: '/analyse/lists/gainers-today'
  },
  {
    id: 'losers-today',
    title: 'Tagesverlierer',
    description: 'Aktien mit der schlechtesten Performance heute',
    category: 'performance',
    icon: ArrowTrendingDownIcon,
    stockCount: 20,
    updateFrequency: 'daily',
    href: '/analyse/lists/losers-today'
  },
  {
    id: 'most-active',
    title: 'Meist gehandelt',
    description: 'Aktien mit dem höchsten Handelsvolumen heute',
    category: 'performance',
    icon: ChartBarIcon,
    stockCount: 20,
    updateFrequency: 'daily',
    href: '/analyse/lists/most-active'
  },

  // DIVIDENDEN
  {
    id: 'dividend-aristocrats',
    title: 'Dividenden Aristokraten',
    description: 'Unternehmen mit 25+ Jahren Dividendenerhöhung',
    category: 'dividends',
    icon: BanknotesIcon,
    stockCount: 50,
    updateFrequency: 'quarterly',
    href: '/analyse/lists/dividend-aristocrats',
    comingSoon: true
  },
  {
    id: 'high-yield',
    title: 'Hohe Dividendenrendite',
    description: 'Aktien mit attraktiver Dividendenrendite über 4%',
    category: 'dividends',
    icon: BanknotesIcon,
    stockCount: 30,
    updateFrequency: 'quarterly',
    href: '/analyse/lists/high-yield',
    comingSoon: true
  }
]

// ✅ GENERIERE FINALE LISTE MIT DYNAMISCHEN DATEN
const STOCK_LISTS: StockList[] = STOCK_LISTS_CONFIG.map(config => ({
  ...config,
  lastUpdated: getLastUpdatedDate(config.updateFrequency)
}))

// ✅ VEREINFACHTE KATEGORIEN - weniger Farben
const CATEGORIES = {
  curated: { 
    label: 'Kuratierte Listen', 
    description: 'Handverlesene Aktien nach Qualitätskriterien und Themen'
  },
  indices: { 
    label: 'Index-Listen', 
    description: 'Offizielle Börsenindizes mit automatischen Updates'
  },
  performance: { 
    label: 'Performance-Listen', 
    description: 'Täglich aktualisierte Listen basierend auf Marktbewegungen'
  },
  dividends: { 
    label: 'Dividenden-Listen', 
    description: 'Unternehmen mit stabilen Dividendenausschüttungen'
  }
}

const TABS = [
  { id: 'all', label: 'Alle', count: STOCK_LISTS.length },
  { id: 'curated', label: 'Kuratiert', count: STOCK_LISTS.filter(l => l.category === 'curated').length },
  { id: 'indices', label: 'Indizes', count: STOCK_LISTS.filter(l => l.category === 'indices').length },
  { id: 'performance', label: 'Performance', count: STOCK_LISTS.filter(l => l.category === 'performance').length },
  { id: 'dividends', label: 'Dividende', count: STOCK_LISTS.filter(l => l.category === 'dividends').length }
]

export default function StockListsPage() {
  const [activeTab, setActiveTab] = useState('all')

  const filteredLists = activeTab === 'all' 
    ? STOCK_LISTS 
    : STOCK_LISTS.filter(list => list.category === activeTab)

  // ✅ VERBESSERTE DATUM-FORMATIERUNG
  const formatDate = (dateString: string, updateFrequency: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (updateFrequency === 'daily' && diffDays === 0) {
      return 'Heute'
    }
    
    if (diffDays === 1) return 'Gestern'
    if (diffDays < 7) return `vor ${diffDays} Tagen`
    if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* ✅ EINHEITLICHER HEADER */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          
          {/* Zurück-Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zum Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <ListBulletIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                Aktien Listen
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-theme-muted">
                  Kuratierte Listen, Indizes und Performance-Tracker
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">

        {/* ✅ PROFESSIONELLE TAB NAVIGATION */}
        <div className="border-b border-theme/20">
          <div className="flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-1 py-3 text-sm font-medium transition-all duration-200 relative ${
                  activeTab === tab.id
                    ? 'text-green-400'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-theme-tertiary text-theme-muted'
                }`}>
                  {tab.count}
                </span>
                
                {/* Active indicator line */}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ CLEAN LISTS GRID - Einheitliches Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLists.map((list) => {
            const Icon = list.icon
            
            if (list.comingSoon) {
              return (
                <div
                  key={list.id}
                  className="bg-theme-card border border-theme/10 rounded-xl p-6 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-theme-tertiary/50 rounded-xl flex items-center justify-center border border-theme/20">
                      <Icon className="w-6 h-6 text-theme-muted" />
                    </div>
                    
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-md text-xs font-medium border border-yellow-500/30">
                      Bald verfügbar
                    </span>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-theme-primary mb-2">
                      {list.title}
                    </h3>
                    <p className="text-theme-muted text-sm leading-relaxed">
                      {list.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-theme-secondary font-medium">
                      {list.stockCount} Aktien
                    </span>
                    <div className="flex items-center gap-1 text-theme-muted">
                      <ClockIcon className="w-3 h-3" />
                      <span>{formatDate(list.lastUpdated, list.updateFrequency)}</span>
                    </div>
                  </div>
                </div>
              )
            }
            
            return (
              <Link 
                key={list.id}
                href={list.href}
                className="block bg-theme-card border border-theme/10 rounded-xl p-6 hover:border-green-500/30 hover:bg-theme-secondary/20 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-theme-tertiary/50 rounded-xl flex items-center justify-center border border-theme/20 group-hover:bg-green-500/10 group-hover:border-green-500/30 transition-all duration-200">
                    <Icon className="w-6 h-6 text-theme-muted group-hover:text-green-400 transition-colors duration-200" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {list.premium && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md text-xs font-medium border border-green-500/30">
                        Premium
                      </span>
                    )}
                    <ChevronRightIcon className="w-4 h-4 text-theme-muted group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-theme-primary mb-2 group-hover:text-green-400 transition-colors duration-200">
                    {list.title}
                  </h3>
                  <p className="text-theme-muted text-sm leading-relaxed">
                    {list.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-theme-secondary font-medium">
                    {list.stockCount} Aktien
                  </span>
                  <div className="flex items-center gap-1 text-theme-muted">
                    <ClockIcon className="w-3 h-3" />
                    <span>{formatDate(list.lastUpdated, list.updateFrequency)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* ✅ SAUBERE INFO SECTION */}
        <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <InformationCircleIcon className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">Über unsere Listen-Kategorien</h3>
              <p className="text-theme-muted text-sm mb-4">
                Professionell kuratierte Aktienauswahl für jeden Anlegertyp mit verschiedenen Aktualisierungszyklen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <div key={key} className="p-4 bg-theme-secondary border border-theme/10 rounded-lg">
                <h4 className="font-medium text-theme-primary mb-2">{category.label}</h4>
                <p className="text-theme-muted text-xs leading-relaxed">{category.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ CLEAN STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-theme-card border border-theme/10 rounded-xl">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {STOCK_LISTS.filter(l => !l.comingSoon).length}
            </div>
            <div className="text-theme-muted text-sm">Verfügbare Listen</div>
          </div>
          
          <div className="text-center p-4 bg-theme-card border border-theme/10 rounded-xl">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              800+
            </div>
            <div className="text-theme-muted text-sm">Aktien verfügbar</div>
          </div>
          
          <div className="text-center p-4 bg-theme-card border border-theme/10 rounded-xl">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              24/7
            </div>
            <div className="text-theme-muted text-sm">Auto-Updates</div>
          </div>
          
          <div className="text-center p-4 bg-theme-card border border-theme/10 rounded-xl">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              Täglich
            </div>
            <div className="text-theme-muted text-sm">Neue Daten</div>
          </div>
        </div>

        {/* ✅ PROFESSIONAL FEATURES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-theme-card border border-theme/10 rounded-xl text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold text-theme-primary mb-2">Expertenkuratierung</h3>
            <p className="text-theme-muted text-sm">Professionell ausgewählte Aktien basierend auf fundamentalen Analysen und Marktforschung.</p>
          </div>

          <div className="p-6 bg-theme-card border border-theme/10 rounded-xl text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold text-theme-primary mb-2">Automatische Updates</h3>
            <p className="text-theme-muted text-sm">Listen werden automatisch bei Zusammensetzungsänderungen und Performance-Updates aktualisiert.</p>
          </div>

          <div className="p-6 bg-theme-card border border-theme/10 rounded-xl text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <StarIcon className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="font-semibold text-theme-primary mb-2">Vielfältige Strategien</h3>
            <p className="text-theme-muted text-sm">Von etablierten Indizes bis zu thematischen Investmentstrategien für jeden Anlegertyp.</p>
          </div>
        </div>
      </main>
    </div>
  )
}