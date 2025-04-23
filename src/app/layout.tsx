// src/app/layout.tsx
import './globals.css'
import Link from 'next/link'
import Script from 'next/script'
import type { ReactNode } from 'react'

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
        {/* Google Font Oswald */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap"
          rel="stylesheet"
        />

        {/* Tailwind‑CDN */}
        <Script
          src="https://cdn.tailwindcss.com"
          strategy="beforeInteractive"
        />
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
      </head>
      <body className="min-h-screen flex flex-col bg-surface dark:bg-surface-dark text-on-surface dark:text-white">
        <header className="bg-surface dark:bg-surface-dark shadow-sm sticky top-0 z-10">
          <nav className="max-w-4xl mx-auto p-4 flex items-center justify-between">
            {/* Titel/Logo */}
            <Link
              href="/"
              className="uppercase text-3xl sm:text-4xl font-bold text-primary"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              SUPERINVESTOR
            </Link>

            {/* Desktop‑Menü */}
            <ul className="hidden md:flex space-x-6 text-gray-700 dark:text-gray-300">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/activity">Activity</Link></li>
              <li><Link href="/insider">Insider</Link></li>
            </ul>

            {/* Mobile‑Menu Placeholder */}
            <div className="md:hidden text-2xl">☰</div>
          </nav>
        </header>

        <main className="flex-grow max-w-4xl mx-auto w-full p-4 sm:p-8">
          {children}
        </main>

        <footer className="bg-surface dark:bg-surface-dark border-t text-center p-4 text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} SUPERINVESTOR
        </footer>
      </body>
    </html>
  )
}
