// app/(website)/layout.tsx
'use client'

import '@/app/globals.css'
import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import Image from 'next/image'
import { Analytics } from "@vercel/analytics/next"
import { CurrencyProvider } from '@/lib/CurrencyContext'
import { useTheme } from '@/lib/useTheme'
import { useEffect, useState } from 'react'
import PageTransitionLoader from '@/components/PageTransitionLoader'
import { usePathname } from 'next/navigation'

export default function OptimizedWebsiteLayout({ children }: { children: ReactNode }) {
  const { theme, mounted } = useTheme()
  const [isClient, setIsClient] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()

  // Check if we're on a blog page for light theme
  const isLightTheme = pathname?.startsWith('/blog')

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  if (!mounted || !isClient) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isLightTheme ? 'bg-white' : 'bg-[#0a0a0a]'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-end gap-0.5">
            <div className="w-2 h-4 bg-brand rounded-sm animate-pulse"></div>
            <div className="w-2 h-6 bg-brand rounded-sm animate-pulse animation-delay-150"></div>
            <div className="w-2 h-8 bg-brand rounded-sm animate-pulse animation-delay-300"></div>
          </div>
          <p className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>Lade Finclue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col ${isLightTheme ? 'bg-white text-gray-900' : 'bg-[#0a0a0a] text-white'}`} suppressHydrationWarning>
      <CurrencyProvider>
        {/* Page Transition Loader */}
        <PageTransitionLoader />

        <Navbar />

        <main className={`flex-grow ${pathname?.startsWith('/superinvestor') || isLightTheme ? '' : 'pt-16'}`}>
          {children}
        </main>

        {/* Footer - hidden in superinvestor section (has its own layout) */}
        {!pathname?.startsWith('/superinvestor') && (
        <footer className={`py-10 border-t ${
          isLightTheme
            ? 'bg-white border-gray-200'
            : 'bg-[#0a0a0a] border-white/10'
        }`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">

              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <Image
                    src="/logos/logo-transparent-white.svg"
                    alt="Finclue Logo"
                    width={28}
                    height={28}
                    className="w-7 h-7"
                  />
                  <span className={`text-lg font-bold ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>Finclue</span>
                </div>
                <p className={`text-sm leading-relaxed ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                  Professionelle Investment-Analyse und Super-Investor Portfolios für bessere Anlageentscheidungen.
                </p>
              </div>

              <div>
                <h3 className={`font-semibold mb-3 text-sm ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>Produkte</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/analyse"
                      className={`text-sm transition-colors ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-brand-light'}`}
                      onClick={() => setIsNavigating(true)}
                    >
                      Aktien-Analyse
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/superinvestor"
                      className={`text-sm transition-colors ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-brand-light'}`}
                      onClick={() => setIsNavigating(true)}
                    >
                      Super-Investoren
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pricing"
                      className={`text-sm transition-colors ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-brand-light'}`}
                      onClick={() => setIsNavigating(true)}
                    >
                      Preise
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className={`font-semibold mb-3 text-sm ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>Unternehmen</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/blog"
                      className={`text-sm transition-colors ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-brand-light'}`}
                      onClick={() => setIsNavigating(true)}
                    >
                      Blog
                    </Link>
                  </li>
                  <li>
                    <a href="mailto:team@finclue.de" className={`text-sm transition-colors ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-brand-light'}`}>
                      Kontakt
                    </a>
                  </li>
                  <li>
                    <Link
                      href="/impressum"
                      className={`text-sm transition-colors ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-brand-light'}`}
                      onClick={() => setIsNavigating(true)}
                    >
                      Impressum
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className={`font-semibold mb-3 text-sm ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>Rechtliches</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/privacy"
                      className={`text-sm transition-colors ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-brand-light'}`}
                      onClick={() => setIsNavigating(true)}
                    >
                      Datenschutz
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms"
                      className={`text-sm transition-colors ${isLightTheme ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-brand-light'}`}
                      onClick={() => setIsNavigating(true)}
                    >
                      AGB
                    </Link>
                  </li>
                  <li>
                    <span className={`text-sm ${isLightTheme ? 'text-gray-400' : 'text-gray-400'}`}>
                      Keine Anlageberatung
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className={`pt-6 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">

                <div className={`text-sm ${isLightTheme ? 'text-gray-400' : 'text-gray-400'}`}>
                  © {new Date().getFullYear()} Finclue. Alle Rechte vorbehalten.
                </div>

                <div className={`flex items-center gap-4 text-xs ${isLightTheme ? 'text-gray-400' : 'text-gray-400'}`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span>Live-Daten</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>DSGVO-konform</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span>SSL-gesichert</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
        )}
      </CurrencyProvider>

      <Analytics />
    </div>
  )
}