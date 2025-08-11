'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChartPieIcon, 
  CurrencyEuroIcon 
} from '@heroicons/react/24/outline'

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navigation = [
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: ChartPieIcon,
      current: pathname === '/portfolio'
    },
    {
      name: '💎 Dividenden',
      href: '/dividends',
      icon: CurrencyEuroIcon,
      current: pathname === '/dividends'
    }
  ]

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Top Navigation Bar */}
      <div className="bg-theme-card border-b border-theme-hover sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">📊</div>
              <span className="text-xl font-bold text-theme-primary">
                FinDepot
              </span>
            </div>
            
            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    item.current
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main>
        {children}
      </main>
    </div>
  )
}