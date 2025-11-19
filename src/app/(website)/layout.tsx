// app/(website)/layout.tsx
'use client'

import '@/app/globals.css'
import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Analytics } from "@vercel/analytics/next"
import { CurrencyProvider } from '@/lib/CurrencyContext'
import { useTheme } from '@/lib/useTheme'
import { useEffect, useState } from 'react'
import PageTransitionLoader from '@/components/PageTransitionLoader'
import SuperinvestorSecondaryNav from '@/components/SuperinvestorSecondaryNav'
import { usePathname } from 'next/navigation'

export default function OptimizedWebsiteLayout({ children }: { children: ReactNode }) {
  const { theme, mounted } = useTheme()
  const [isClient, setIsClient] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  if (!mounted || !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-end gap-0.5">
            <div className="w-2 h-4 bg-green-500 rounded-sm animate-pulse"></div>
            <div className="w-2 h-6 bg-green-500 rounded-sm animate-pulse animation-delay-150"></div>
            <div className="w-2 h-8 bg-green-500 rounded-sm animate-pulse animation-delay-300"></div>
          </div>
          <p className="text-gray-400 text-sm">Lade FinClue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white" suppressHydrationWarning>
      <CurrencyProvider>
        {/* Page Transition Loader */}
        <PageTransitionLoader />
        
        <Navbar />
        <SuperinvestorSecondaryNav />
 
        <main className="flex-grow pt-40">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-black border-t border-white/10 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              
              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-end gap-0.5">
                    <div className="w-1.5 h-3 bg-green-500 rounded-sm"></div>
                    <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
                    <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
                  </div>
                  <span className="text-lg font-bold text-white">FinClue</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Professionelle Investment-Analyse und Super-Investor Portfolios für bessere Anlageentscheidungen.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3 text-sm">Produkte</h3>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/analyse" 
                      className="text-gray-400 hover:text-green-400 transition-colors text-sm"
                      onClick={() => setIsNavigating(true)}
                    >
                      Aktien-Analyse
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/superinvestor" 
                      className="text-gray-400 hover:text-green-400 transition-colors text-sm"
                      onClick={() => setIsNavigating(true)}
                    >
                      Super-Investoren
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/pricing" 
                      className="text-gray-400 hover:text-green-400 transition-colors text-sm"
                      onClick={() => setIsNavigating(true)}
                    >
                      Preise
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3 text-sm">Unternehmen</h3>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/news" 
                      className="text-gray-400 hover:text-green-400 transition-colors text-sm"
                      onClick={() => setIsNavigating(true)}
                    >
                      Blog
                    </Link>
                  </li>
                  <li>
                    <a href="mailto:team@finclue.de" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                      Kontakt
                    </a>
                  </li>
                  <li>
                    <Link 
                      href="/impressum" 
                      className="text-gray-400 hover:text-green-400 transition-colors text-sm"
                      onClick={() => setIsNavigating(true)}
                    >
                      Impressum
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3 text-sm">Rechtliches</h3>
                <ul className="space-y-2">
                  <li>
                    <Link 
                      href="/privacy" 
                      className="text-gray-400 hover:text-green-400 transition-colors text-sm"
                      onClick={() => setIsNavigating(true)}
                    >
                      Datenschutz
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/terms" 
                      className="text-gray-400 hover:text-green-400 transition-colors text-sm"
                      onClick={() => setIsNavigating(true)}
                    >
                      AGB
                    </Link>
                  </li>
                  <li>
                    <span className="text-gray-400 text-sm">
                      Keine Anlageberatung
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                
                <div className="text-sm text-gray-400">
                  © {new Date().getFullYear()} FinClue. Alle Rechte vorbehalten.
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live-Daten</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span>DSGVO-konform</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span>SSL-gesichert</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </CurrencyProvider>

      <Analytics />
    </div>
  )
}