// src/app/layout.tsx
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
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
                    'surface-dark': '#1f1f1f',
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
      <body className="min-h-screen flex flex-col bg-white dark:bg-surface-dark text-gray-900 dark:text-white">
        {/* ——— Navbar: schwarz mit weißem Text ——— */}
        <header className="bg-heroFrom text-white">
          <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center">
          <Link href="/" className="text-2xl font-semibold">
  <span className="text-white">Super</span>
  <span className="text-accent">Investor</span>
</Link>
            <ul className="hidden md:flex ml-8 space-x-6">
              <li>
                <Link href="/" className="hover:text-gray-200">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/activity" className="hover:text-gray-200">
                  Activity
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="hover:text-gray-200">
                  Watchlist
                </Link>
              </li>

              <li>
                <Link href="/watchlist" className="hover:text-gray-200">
                  Videos
                </Link>
              </li>
           
              <li className="relative group">
    <button
      className="hover:text-accent flex items-center"
    >
      LINKS
      <svg
        className="ml-1 h-3 w-3 fill-current"
        viewBox="0 0 10 6"
      >
        <path d="M0 0l5 6 5-6H0z" />
      </svg>
    </button>
    <div className="pointer-events-none absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-surface-dark shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
      <a
        href="https://de.scalable.capital/trading-aff?utm_medium=affiliate&utm_source=qualityclick&utm_campaign=broker&utm_term=764&c_id=QC5-b486e7461716d777857i74425940697f6676687279547b46"
        target="_blank"
        rel="noopener noreferrer"
        className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        Scalable Capital Depot
      </a>
       {/* Falls Du später noch weitere Links möchtest */}
       {/* <a href="https://another.link" …>Mein Broker 2</a> */}
    </div>
  </li>


              <li>
                <Link href="/realtime" className="hover:text-gray-200">
                  Echtzeit Filings
                </Link>
              </li>
            </ul>
            {/* Suchfeld mit grünem Rahmen */}
            <div className="ml-auto hidden lg:block w-64 border-2 border-accent rounded-lg focus-within:ring-2 focus-within:ring-accent">
              <SearchBar />
            </div>
            <div className="md:hidden ml-auto text-2xl">☰</div>
          </nav>
        </header>

        {/* ——— Hero-Section: etwas helleres Schwarz als Hintergrund ——— */}
        <section className="w-full bg-gradient-to-r from-heroFrom to-heroTo text-white/80">
          <div className="max-w-6xl mx-auto px-6 py-16 text-center">
            <h1 className="text-5xl font-orbitron font-bold mb-4">
              LERNE VON DEN BESTEN INVESTOREN DER WELT
            </h1>
            <p className="text-lg font-sans">
             "Der Preis ist, was Sie bezahlen, der Wert ist, was Sie erhalten."<br />
              Warren Buffett
            </p>
          </div>
        </section>

        <main className="flex-grow max-w-screen-xl mx-auto px-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        <footer className="bg-white dark:bg-surface-dark border-t text-center p-4 text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} SUPERINVESTOR
        </footer>
      </body>
    </html>
  )
}