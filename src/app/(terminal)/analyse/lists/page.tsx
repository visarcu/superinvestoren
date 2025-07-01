// src/app/analyse/lists/page.tsx - PROFESSIONELLE VERSION
'use client'

import { useState } from 'react'
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
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

// ✅ CLEAN Interface
interface StockList {
  id: string
  title: string
  description: string
  category: 'curated' | 'indices' | 'performance' | 'dividends'
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  stockCount: number
  lastUpdated: string
  href: string
  premium?: boolean
  comingSoon?: boolean
}

// ✅ PROFESSIONAL Lists mit einheitlichen Farben
const STOCK_LISTS: StockList[] = [
  // KURATIERTE LISTEN
  {
    id: 'global-leaders',
    title: 'Globale Marktführer',
    description: 'Handverlesene globale Champions',
    category: 'curated',
    icon: GlobeAltIcon,
    stockCount: 25,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/global-leaders'
  },
  {
    id: 'magnificent-seven',
    title: 'Magnificent Seven',
    description: 'Die 7 Tech-Giganten',
    category: 'curated',
    icon: StarIcon,
    stockCount: 7,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/magnificent-seven'
  },
  {
    id: 'ki-leaders',
    title: 'KI-Marktführer',
    description: 'Führende KI-Unternehmen',
    category: 'curated',
    icon: ChartBarIcon,
    stockCount: 15,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/ki-leaders',
    premium: true
  },
  {
    id: 'german-champions',
    title: 'Deutsche Champions',
    description: 'Führende deutsche Unternehmen',
    category: 'curated',
    icon: BuildingOfficeIcon,
    stockCount: 20,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/german-champions'
  },

  // INDIZES
  {
    id: 'sp500',
    title: 'S&P 500',
    description: 'Standard & Poor\'s 500 Index',
    category: 'indices',
    icon: ChartBarIcon,
    stockCount: 500,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/sp500'
  },
  {
    id: 'nasdaq100',
    title: 'NASDAQ 100',
    description: 'NASDAQ 100 Tech-Index',
    category: 'indices',
    icon: ChartBarIcon,
    stockCount: 100,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/nasdaq100'
  },
  {
    id: 'dax40',
    title: 'DAX 40',
    description: 'Deutscher Aktienindex',
    category: 'indices',
    icon: ChartBarIcon,
    stockCount: 40,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/dax40'
  },

  // PERFORMANCE
  {
    id: 'top-gainers',
    title: 'Tagesgewinner',
    description: 'Beste Performance heute',
    category: 'performance',
    icon: ArrowTrendingUpIcon,
    stockCount: 20,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/top-gainers'
  },
  {
    id: 'top-losers',
    title: 'Tagesverlierer',
    description: 'Schlechteste Performance heute',
    category: 'performance',
    icon: ArrowTrendingDownIcon,
    stockCount: 20,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/top-losers'
  },
  {
    id: 'most-traded',
    title: 'Meist gehandelt',
    description: 'Höchstes Handelsvolumen heute',
    category: 'performance',
    icon: ChartBarIcon,
    stockCount: 20,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/most-traded',
    premium: true
  },

  // DIVIDENDEN
  {
    id: 'dividend-aristocrats',
    title: 'Dividenden Aristokraten',
    description: 'Unternehmen mit 25+ Jahren Dividendenerhöhung',
    category: 'dividends',
    icon: BanknotesIcon,
    stockCount: 50,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/dividend-aristocrats'
  },
  {
    id: 'high-yield',
    title: 'Hohe Dividendenrendite',
    description: 'Aktien mit >4% Dividendenrendite',
    category: 'dividends',
    icon: BanknotesIcon,
    stockCount: 30,
    lastUpdated: '2024-06-26',
    href: '/analyse/lists/high-yield'
  }
]

// ✅ CLEAN Category Mapping
const CATEGORIES = {
  curated: { 
    label: 'Kuratierte Listen', 
    description: 'Handverlesene Aktien nach Qualitätskriterien und Themen. Expertenselektion für optimale Diversifikation.',
    color: 'blue'
  },
  indices: { 
    label: 'Index-Listen', 
    description: 'Offizielle Börsenindizes mit automatischen Updates bei Zusammensetzungsänderungen.',
    color: 'green'
  },
  performance: { 
    label: 'Performance-Listen', 
    description: 'Täglich aktualisierte Listen basierend auf Kursbewegungen und Handelsvolumen.',
    color: 'orange'
  },
  dividends: { 
    label: 'Dividenden-Listen', 
    description: 'Unternehmen mit 25+ Jahren Dividendenausschüttungen.',
    color: 'purple'
  }
}

// ✅ CLEAN Tabs
const TABS = [
  { id: 'all', label: 'All', count: STOCK_LISTS.length },
  { id: 'curated', label: 'Kuratiert', count: STOCK_LISTS.filter(l => l.category === 'curated').length },
  { id: 'indices', label: 'Indices', count: STOCK_LISTS.filter(l => l.category === 'indices').length },
  { id: 'performance', label: 'Performance', count: STOCK_LISTS.filter(l => l.category === 'performance').length },
  { id: 'dividends', label: 'Dividende', count: STOCK_LISTS.filter(l => l.category === 'dividends').length }
]

export default function StockListsPage() {
  const [activeTab, setActiveTab] = useState('all')

  const filteredLists = activeTab === 'all' 
    ? STOCK_LISTS 
    : STOCK_LISTS.filter(list => list.category === activeTab)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      curated: 'border-blue-500/20 bg-blue-500/5',
      indices: 'border-green-500/20 bg-green-500/5',
      performance: 'border-orange-500/20 bg-orange-500/5',
      dividends: 'border-purple-500/20 bg-purple-500/5'
    }
    return colors[category as keyof typeof colors] || 'border-theme bg-theme-secondary'
  }

  const getIconColor = (category: string) => {
    const colors = {
      curated: 'text-blue-500',
      indices: 'text-green-500',
      performance: 'text-orange-500',
      dividends: 'text-purple-500'
    }
    return colors[category as keyof typeof colors] || 'text-theme-muted'
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ✅ CLEAN Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-theme-secondary border border-theme rounded-xl flex items-center justify-center">
              <ListBulletIcon className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">Aktien Listen</h1>
              <p className="text-theme-muted text-sm">Kuratierte Listen, offizielle Indizes und Performance-Tracker</p>
            </div>
          </div>

          {/* ✅ CLEAN Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-theme-secondary text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary border border-theme'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.id
                    ? 'bg-green-500/30 text-green-300'
                    : 'bg-theme-tertiary text-theme-muted'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ✅ PROFESSIONAL Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredLists.map((list) => {
            const Icon = list.icon
            return (
              <div
                key={list.id}
                className={`bg-theme-card border rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer group ${getCategoryColor(list.category)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getCategoryColor(list.category)}`}>
                    <Icon className={`w-6 h-6 ${getIconColor(list.category)}`} />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {list.premium && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded text-xs font-medium border border-yellow-500/30">
                        Premium
                      </span>
                    )}
                    {list.comingSoon && (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-600 dark:text-gray-400 rounded text-xs font-medium border border-gray-500/30">
                        Bald verfügbar
                      </span>
                    )}
                    <ChevronRightIcon className="w-4 h-4 text-theme-muted group-hover:text-theme-primary group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-theme-primary mb-2 group-hover:text-green-400 transition-colors">
                    {list.title}
                  </h3>
                  <p className="text-theme-muted text-sm leading-relaxed">
                    {list.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-theme-secondary font-medium">
                      {list.stockCount} Aktien
                    </span>
                    <div className="flex items-center gap-1 text-theme-muted">
                      <ClockIcon className="w-3 h-3" />
                      <span>{formatDate(list.lastUpdated)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ✅ CLEAN Info Section */}
        <div className="bg-theme-card border border-theme rounded-xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <InformationCircleIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">Über unsere Listen-Kategorien</h3>
              <p className="text-theme-muted text-sm mb-4">
                Professionell kuratierte Aktienauswahl für jeden Anlegertyp.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <div key={key} className="p-4 bg-theme-secondary border border-theme rounded-lg">
                <h4 className="font-medium text-theme-primary mb-2">{category.label}</h4>
                <p className="text-theme-muted text-xs leading-relaxed">{category.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ CLEAN Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-theme-card border border-theme rounded-xl">
            <div className="text-2xl font-bold text-green-500 mb-1">
              {STOCK_LISTS.length}
            </div>
            <div className="text-theme-muted text-sm">Verfügbare Listen</div>
          </div>
          
          <div className="text-center p-4 bg-theme-card border border-theme rounded-xl">
            <div className="text-2xl font-bold text-blue-500 mb-1">
              1000+
            </div>
            <div className="text-theme-muted text-sm">Aktien verfügbar</div>
          </div>
          
          <div className="text-center p-4 bg-theme-card border border-theme rounded-xl">
            <div className="text-2xl font-bold text-orange-500 mb-1">
              24/7
            </div>
            <div className="text-theme-muted text-sm">Automatische Updates</div>
          </div>
          
          <div className="text-center p-4 bg-theme-card border border-theme rounded-xl">
            <div className="text-2xl font-bold text-purple-500 mb-1">
              Täglich
            </div>
            <div className="text-theme-muted text-sm">Neue Erkenntnisse</div>
          </div>
        </div>

        {/* ✅ CLEAN Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-theme-card border border-theme rounded-xl text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-theme-primary mb-2">Expertenkuratierung</h3>
            <p className="text-theme-muted text-sm">Professionell ausgewählte Aktien basierend auf fundamentalen Analysen.</p>
          </div>

          <div className="p-6 bg-theme-card border border-theme rounded-xl text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-theme-primary mb-2">Automatische Updates</h3>
            <p className="text-theme-muted text-sm">Listen werden automatisch bei Zusammensetzungsänderungen aktualisiert.</p>
          </div>

          <div className="p-6 bg-theme-card border border-theme rounded-xl text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <StarIcon className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="font-semibold text-theme-primary mb-2">Vielfältige Kategorien</h3>
            <p className="text-theme-muted text-sm">Von reichen Indizes bis zu thematischen Investmentstrategien.</p>
          </div>
        </div>
      </div>
    </div>
  )
}