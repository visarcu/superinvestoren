// src/app/layout.tsx

import './globals.css'
import Link from 'next/link'
import Script from 'next/script'
import type { ReactNode } from 'react'
import SearchBar from '@/components/SearchBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import ConditionalHero from '@/components/ConditionalHero'
import TickerBar from '@/components/TickerBar'
import Providers from './providers'
import AuthButton from '@/components/AuthButton'

export const metadata = {
  title: 'SUPERINVESTOR',
  description: 'Portfolios der bekanntesten Investoren im Überblick',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Orbitron:wght@400;500;700&display=swap"
          rel="stylesheet"
        />

        {/* Tailwind via CDN */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <Script id="tw-config" strategy="beforeInteractive">
          {`
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    heroFrom: '#000000',
                    heroTo:   '#1f1f1f',
                    accent:   '#00ff88',
                    'surface-dark':'#1f1f1f',
                    'card-dark':   '#37383A',
                  },
                  fontFamily: {
                    sans:    ['Poppins','system-ui','sans-serif'],
                    orbitron:['Orbitron','sans-serif'],
                  },
                }
              }
            }
          `}
        </Script>
      </head>
      <body className="min-h-screen flex flex-col bg-black text-gray-100">
        {/* Jetzt wird wirklich alles in den SessionProvider gewrappt */}
        <Providers>
          <TickerBar />

          <header className="bg-heroFrom text-white">
            <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center">
              {/* Logo */}
              <Link href="/" className="text-2xl font-semibold">
                <span className="text-white">Super</span>
                <span className="text-accent">Investor</span>
              </Link>
              
              {/* Desktop-Navi */}
              <ul className="hidden md:flex ml-8 space-x-6 items-center">
                <li><Link href="/" className="hover:text-gray-200">Home</Link></li>
                <li className="relative group">
                  <button className="hover:text-gray-200 flex items-center">
                    Analyse-Hub
                    <svg className="ml-1 h-3 w-3 fill-current" viewBox="0 0 10 6">
                      <path d="M0 0l5 6 5-6H0z" />
                    </svg>
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-40 rounded-md bg-surface-dark text-gray-100 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                    <Link href="/analyse" className="block px-4 py-2 hover:bg-gray-700">Übersicht</Link>
                    <Link href="/analyse/watchlist" className="block px-4 py-2 hover:bg-gray-700">Watchlist</Link>
                    <Link href="/analyse/heatmap" className="block px-4 py-2 hover:bg-gray-700">Heatmap</Link>
                    <Link href="/analyse/earnings" className="block px-4 py-2 hover:bg-gray-700">Earnings</Link>
                  </div>
                </li>
               
                <li><Link href="/realtime" className="hover:text-gray-200">Echtzeit Filings</Link></li>
              </ul>

              {/* Suche */}
              <div className="ml-auto hidden lg:block w-64 border-2 border-accent rounded-lg focus-within:ring-2 focus-within:ring-accent">
                <SearchBar />
              </div>

              {/* AuthButton jetzt INSIDE SessionProvider */}
              <AuthButton />

              {/* Mobile-Icon */}
              <div className="md:hidden ml-4 text-2xl">☰</div>
            </nav>
          </header>

          {/* Hero & Main Content */}
          <ConditionalHero />
          <main className="flex-grow max-w-screen-xl mx-auto px-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>

          <footer className="bg-white dark:bg-surface-dark border-t text-center p-4 text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} SUPERINVESTOR
          </footer>
        </Providers>
      </body>
    </html>
  )
}