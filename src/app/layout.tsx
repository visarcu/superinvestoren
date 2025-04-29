// src/app/layout.tsx
import './globals.css'
import Link from 'next/link'
import Script from 'next/script'
import type { ReactNode } from 'react'
import SearchBar from '@/components/SearchBar'

export const metadata = {
  title: 'SUPERINVESTOR',
  description: 'Portfolios der bekanntesten Investoren im Überblick',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="de">
      <head>
        {/* Google Font Poppins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&display=swap"
          rel="stylesheet"
        />

        {/* Tailwind-CDN (Dark-Mode via class) */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <Script id="tailwind-config" strategy="beforeInteractive">
          {`
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    primary: '#2563eb',
                    surface: '#ffffff',
                    'surface-dark': '#1f2937',
                  }
                }
              }
            }
          `}
        </Script>

        {/* TradingView Charting Library */}
        <Script src="https://s3.tradingview.com/tv.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen flex flex-col bg-surface dark:bg-surface-dark text-on-surface dark:text-white">
        <header className="bg-surface dark:bg-surface-dark shadow-sm sticky top-0 z-10">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center">
            <Link
              href="/"
              className="
                text-2xl sm:text-3xl
                font-semibold
                tracking-tight
                text-gray-900 dark:text-white
              "
            >
              SuperInvestor
            </Link>

            <ul className="hidden md:flex space-x-6 ml-8 text-gray-700 dark:text-gray-300">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/activity">Activity</Link></li>
              <li><Link href="/watchlist">Watchlist</Link></li>
              <li><Link href="/scoreboard">Scoreboard</Link></li>
              <li><Link href="/realtime">Echtzeit Filings</Link></li>
              <li><Link href="/insider">Insider</Link></li>
            </ul>

            <div className="ml-auto hidden lg:block w-48">
              <SearchBar />
            </div>

            <div className="md:hidden ml-auto text-2xl">☰</div>
          </nav>
        </header>

        <main className="flex-grow max-w-5xl mx-auto p-4 sm:p-8">{children}</main>

        <footer className="bg-surface dark:bg-surface-dark border-t text-center p-4 text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} SUPERINVESTOR
        </footer>
      </body>
    </html>
  )
}