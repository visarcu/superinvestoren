// app/(website)/layout.tsx - HYDRATION-FIX (KEIN HTML/BODY mehr)
'use client'

import '@/app/globals.css'
import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Analytics } from "@vercel/analytics/next"
import { CurrencyProvider } from '@/lib/CurrencyContext'
import { useTheme } from '@/lib/useTheme'
import { useEffect, useState } from 'react'

export default function OptimizedWebsiteLayout({ children }: { children: ReactNode }) {
  const { theme, mounted } = useTheme()
  const [isClient, setIsClient] = useState(false)

  // ✅ FIX: Client-side hydration protection
  useEffect(() => {
    setIsClient(true)
  }, [])

  // ✅ FIX: Während Hydration Loading anzeigen (OHNE HTML/BODY)
  if (!mounted || !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // ✅ FIX: Nur Content rendern, KEIN <html>/<body> (das macht Root Layout)
  return (
    <div className="min-h-screen flex flex-col bg-theme-primary noise-bg text-theme-primary" suppressHydrationWarning>
      <CurrencyProvider>
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-theme-secondary border-t border-theme py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              
              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-end gap-0.5">
                    <div className="w-1.5 h-3 bg-green-500 rounded-sm"></div>
                    <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
                    <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
                  </div>
                  <span className="text-lg font-bold text-theme-primary">FinClue</span>
                </div>
                <p className="text-sm text-theme-muted leading-relaxed">
                  Professionelle Investment-Analyse und Super-Investor Portfolios für bessere Anlageentscheidungen.
                </p>
              </div>

              <div>
                <h3 className="text-theme-primary font-semibold mb-3 text-sm">Produkte</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/analyse" className="text-theme-muted hover:text-green-400 transition-colors text-sm">
                      Aktien-Analyse
                    </Link>
                  </li>
                  <li>
                    <Link href="/superinvestor" className="text-theme-muted hover:text-green-400 transition-colors text-sm">
                      Super-Investoren
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="text-theme-muted hover:text-green-400 transition-colors text-sm">
                      Preise
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-theme-primary font-semibold mb-3 text-sm">Unternehmen</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/news" className="text-theme-muted hover:text-green-400 transition-colors text-sm">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <a href="mailto:team@finclue.de" className="text-theme-muted hover:text-green-400 transition-colors text-sm">
                      Kontakt
                    </a>
                  </li>
                  <li>
                    <Link href="/impressum" className="text-theme-muted hover:text-green-400 transition-colors text-sm">
                      Impressum
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-theme-primary font-semibold mb-3 text-sm">Rechtliches</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/privacy" className="text-theme-muted hover:text-green-400 transition-colors text-sm">
                      Datenschutz
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-theme-muted hover:text-green-400 transition-colors text-sm">
                      AGB
                    </Link>
                  </li>
                  <li>
                    <span className="text-theme-muted text-sm">
                      Keine Anlageberatung
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-theme">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                
                <div className="text-sm text-theme-muted">
                  © {new Date().getFullYear()} FinClue. Alle Rechte vorbehalten.
                </div>

                <div className="flex items-center gap-4 text-xs text-theme-muted">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
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