// src/app/layout.tsx

import './globals.css'
import Script from 'next/script'
import type { ReactNode } from 'react'
import Providers from './providers'
import Navbar from '@/components/Navbar'

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
          rel="preconnect" href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Orbitron:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-black text-gray-100">
        <Providers>
          <Navbar />
          <main className="flex-grow max-w-screen-xl mx-auto px-6">
            {children}
          </main>
          <footer className="bg-white dark:bg-surface-dark border-t text-center p-4 text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} SUPERINVESTOR
          </footer>
        </Providers>
      </body>
    </html>
  )
}