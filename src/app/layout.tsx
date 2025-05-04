import './globals.css'
import Link from 'next/link'
import Script from 'next/script'
import type { ReactNode } from 'react'
import SearchBar from '@/components/SearchBar'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata = {
  title: 'SUPERINVESTOR',
  description: 'Portfolios der bekanntesten Investoren im Überblick',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        {/* Google Fonts: Poppins + Orbitron */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Orbitron:wght@400;500;700&display=swap"
          rel="stylesheet"
        />

        {/* Tailwind über CDN + eigene Farben */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <Script id="tw-config" strategy="beforeInteractive">
          {`
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    heroFrom: '#000000',
                    heroTo:   '#1a1a1a',
                    accent:   '#00ff88',
                  },
                  fontFamily: {
                    sans:    ['Poppins','system-ui','sans-serif'],
                    orbitron: ['Orbitron','sans-serif'],
                  },
                }
              }
            }
          `}
        </Script>
      </head>
      <body className="min-h-screen flex flex-col bg-white dark:bg-surface-dark text-gray-900 dark:text-white">
        {/* Navbar: schwarz mit weißem Text */}
        <header className="bg-heroFrom text-white">
          <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center">
            <Link href="/" className="text-2xl font-semibold text-white">
              SuperInvestor
            </Link>
            <ul className="hidden md:flex ml-8 space-x-6">
              <li><Link href="/" className="hover:text-gray-200">Home</Link></li>
              <li><Link href="/activity" className="hover:text-gray-200">Activity</Link></li>
              <li><Link href="/watchlist" className="hover:text-gray-200">Watchlist</Link></li>
              <li><Link href="/scoreboard" className="hover:text-gray-200">Scoreboard</Link></li>
              <li><Link href="/realtime" className="hover:text-gray-200">Echtzeit Filings</Link></li>
            </ul>
            <div className="ml-auto hidden lg:block w-64">
              <SearchBar />
            </div>
            <div className="md:hidden ml-auto text-2xl text-white">☰</div>
          </nav>
        </header>

        <main className="flex-grow">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        <footer className="bg-white dark:bg-surface-dark border-t text-center p-4 text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} SUPERINVESTOR
        </footer>
      </body>
    </html>
  )
}