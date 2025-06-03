// src/app/analyse/layout.tsx
'use client'
import React, { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChartBarIcon, 
  BookmarkIcon, 
  MapIcon, 
  CalendarIcon 
} from '@heroicons/react/24/outline'

const tabs = [
  { 
    href: '/analyse', 
    label: 'Übersicht',
    icon: <ChartBarIcon className="w-4 h-4" />,
    description: 'Aktien-Dashboard'
  },
  { 
    href: '/analyse/watchlist', 
    label: 'Watchlist',
    icon: <BookmarkIcon className="w-4 h-4" />,
    description: 'Gespeicherte Aktien'
  },
  { 
    href: '/analyse/heatmap', 
    label: 'Heatmap',
    icon: <MapIcon className="w-4 h-4" />,
    description: 'Markt-Übersicht'
  },
  { 
    href: '/analyse/earnings', 
    label: 'Earnings',
    icon: <CalendarIcon className="w-4 h-4" />,
    description: 'Gewinntermine'
  },
]

export default function AnalyseLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      {/* Navigation Header - Dark Theme */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Page Title */}
          <div className="py-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Aktien-Analyse
                </h1>
                <p className="text-sm text-gray-400">
                  Professionelle Tools für bessere Investments
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-2 py-4 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200
                    ${isActive
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
                    }
                  `}
                >
                  <span className={`transition-colors duration-200 ${
                    isActive 
                      ? 'text-green-400' 
                      : 'text-gray-500 group-hover:text-gray-300'
                  }`}>
                    {tab.icon}
                  </span>
                  <div className="flex flex-col">
                    <span>{tab.label}</span>
                    <span className={`text-xs transition-colors duration-200 ${
                      isActive 
                        ? 'text-green-400/70' 
                        : 'text-gray-500 group-hover:text-gray-400'
                    }`}>
                      {tab.description}
                    </span>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Page Content - No Container, Full Width */}
      <main>
        {children}
      </main>
    </>
  )
}