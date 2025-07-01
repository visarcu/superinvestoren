// src/app/superinvestor/layout.tsx - BETTER TAB NAVIGATION
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  HomeIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

const navigation = [
  {
    name: 'Übersicht',
    href: '/superinvestor',
    icon: HomeIcon
  },
  {
    name: 'Alle Investoren', 
    href: '/superinvestor/investors',
    icon: UserGroupIcon
  },
  {
    name: 'Market Insights',
    href: '/superinvestor/insights', 
    icon: ChartBarIcon
  },

  {
    name: 'Aktivität',
    href: '/superinvestor/activity',
    icon: DocumentTextIcon
  }
]

export default function SuperinvestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-950">
      
      {/* ✅ MUCH BETTER Tab Navigation - More Space & Prominence */}
      <div className="bg-gray-950 pt-32 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Super-Investoren
            </h1>
            <p className="text-lg text-gray-400">
              Verfolge die Portfolios der erfolgreichsten Investoren der Welt
            </p>
          </div>

          {/* ✅ Prominent Tab Navigation */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-2">
            <nav className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-green-500 text-black shadow-lg shadow-green-500/25'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
      
      {/* ✅ Content Area */}
      <main className="relative">
        {children}
      </main>
    </div>
  )
}