// src/app/superinvestor/layout.tsx
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
    icon: HomeIcon,
    description: 'Top-Investoren & Market Insights'
  },
  {
    name: 'Alle Investoren',
    href: '/superinvestor/investors',
    icon: UserGroupIcon,
    description: 'Vollständige Investoren-Liste'
  },
  {
    name: 'Market Insights',
    href: '/superinvestor/insights',
    icon: ChartBarIcon,
    description: 'Detaillierte Markt-Analysen'
  },
  {
    name: 'Trends',
    href: '/superinvestor/trends',
    icon: ArrowTrendingUpIcon,
    description: 'Bewegungen & Entwicklungen'
  },
  {
    name: 'Aktivität - Neuste Filings',
    href: '/superinvestor/activity',
    icon: DocumentTextIcon,
    description: 'Filing-Zentrale'
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
      {/* Navigation - OBEN */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <nav className="bg-gray-900/50 border border-gray-800 rounded-xl p-2">
          <div className="flex flex-wrap gap-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
      
      {/* Content */}
      {children}
    </div>
  )
}