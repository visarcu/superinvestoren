import './globals.css'
import Script from 'next/script'
import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Analytics } from "@vercel/analytics/next"
export const metadata = {
  title: 'FinClue',
  description: 'Portfolios der bekanntesten Investoren im Überblick',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark">
      <head>
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
      <body className="min-h-screen flex flex-col bg-black text-gray-100">
        {/* Navbar bleibt */}
        <Navbar />

        {/* pt-20 sorgt dafür, dass der Inhalt nicht unter Navbar/TickerBar verschwindet */}
        <main className="pt-20 flex-grow max-w-screen-xl mx-auto px-6">
          {children}
        </main>

        {/* Footer bleibt */}
        <footer className="bg-gray-900 border-t border-gray-700 py-6">
          <div className="max-w-screen-xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {/* Links linksbündig */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-gray-200 transition">
                Datenschutzerklärung
              </Link>
              <span className="text-gray-600">|</span>
              <Link href="/terms" className="hover:text-gray-200 transition">
                AGB
              </Link>
              <span className="text-gray-600">|</span>
              <Link href="/impressum" className="hover:text-gray-200 transition">
                Impressum
              </Link>
            </div>
            {/* Copyright rechtsbündig */}
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} FinClue
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}