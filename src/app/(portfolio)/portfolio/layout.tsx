// src/app/(portfolio)/layout.tsx - SUPER EINFACH
'use client'

import React, { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { id: 'dashboard', label: 'Dashboard', href: '/portfolio' },
  { id: 'positions', label: 'Positionen', href: '/portfolio/positions' },
  { id: 'performance', label: 'Performance', href: '/portfolio/performance' },
  { id: 'settings', label: 'Einstellungen', href: '/portfolio/settings' }
]

export default function PortfolioLayout({ children }: LayoutProps) {
  const pathname = usePathname()

  return (
    <html lang="de" className="dark">
      <head>
        <title>Portfolio Tracker - FinClue</title>
      </head>
      <body className="h-screen bg-gray-900 text-white overflow-hidden">
        <div className="h-screen flex">
          
          {/* Simple Sidebar */}
          <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <h1 className="text-xl font-bold text-white">Portfolio</h1>
              <p className="text-sm text-gray-400">100% Privat & Sicher</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <div className="space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
              <Link
                href="/"
                className="block px-4 py-2 text-gray-400 hover:text-white text-sm"
              >
                ← Zurück zu FinClue
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            
            {/* Top Bar */}
            <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-6">
              <h2 className="text-lg font-semibold text-white">Portfolio Tracker</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-900">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}