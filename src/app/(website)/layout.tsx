// src/app/layout.tsx - OPTIMIERTE WEBSITE VERSION
'use client'

import '@/app/globals.css'
import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Analytics } from "@vercel/analytics/next"
import { CurrencyProvider } from '@/lib/CurrencyContext'

// ❌ ENTFERNT: useTheme Hook (nur für Terminal)

export default function OptimizedWebsiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark"> {/* 🎯 FIXIERT auf Dark Theme */}
      <head>
        <title>FinClue</title>
        <meta name="description" content="Portfolios der bekanntesten Investoren im Überblick" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect" href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Orbitron:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-gray-950 noise-bg text-white">
        <CurrencyProvider>
          {/* ✅ Optimierte Navbar ohne Theme-Toggle */}
          <Navbar />
          
          {/* ✅ Main Content */}
          <main className="flex-grow">
            {children}
          </main>
          
          {/* ✅ OPTIMIERTER Footer - Dark Theme Only */}
          <footer className="bg-gray-900 border-t border-gray-800 py-10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Footer Content */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                
                {/* Brand Column */}
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

                {/* Product Links */}
                <div>
                  <h3 className="text-white font-semibold mb-3 text-sm">Produkte</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/analyse" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                        Aktien-Analyse
                      </Link>
                    </li>
                    <li>
                      <Link href="/superinvestor" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                        Super-Investoren
                      </Link>
                    </li>
                    <li>
                      <Link href="/pricing" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                        Preise
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Company Links */}
                <div>
                  <h3 className="text-white font-semibold mb-3 text-sm">Unternehmen</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/news" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                        News
                      </Link>
                    </li>
                    <li>
                      <a href="mailto:team.finclue@gmail.com" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                        Kontakt
                      </a>
                    </li>
                    <li>
                      <Link href="/impressum" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                        Impressum
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Legal Links */}
                <div>
                  <h3 className="text-white font-semibold mb-3 text-sm">Rechtliches</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/privacy" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                        Datenschutz
                      </Link>
                    </li>
                    <li>
                      <Link href="/terms" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                        AGB
                      </Link>
                    </li>
                    <li>
                      <span className="text-gray-500 text-sm">
                        Keine Anlageberatung
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="pt-6 border-t border-gray-800">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  
                  {/* Copyright */}
                  <div className="text-sm text-gray-500">
                    © {new Date().getFullYear()} FinClue. Alle Rechte vorbehalten.
                  </div>

                  {/* Status Indicators */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
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
      </body>
    </html>
  )
}