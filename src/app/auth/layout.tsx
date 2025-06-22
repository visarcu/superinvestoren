// src/app/auth/layout.tsx - KOMPAKTES AUTH DESIGN
'use client'

import '../globals.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Analytics } from "@vercel/analytics/next"
import { useTheme } from '@/lib/useTheme'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <html lang="de" className={theme}>
      <head>
        <title>FinClue - Login & Registrierung</title>
        <meta name="description" content="Melde dich an oder registriere dich für FinClue" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect" href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-theme-primary text-theme-primary font-['Poppins',system-ui,sans-serif] antialiased">
        
        {/* ✅ KOMPAKTE Header */}
        <header className="absolute top-0 left-0 right-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="flex items-end gap-0.5">
                  <div className="w-1.5 h-3 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
                </div>
                <span className="text-lg font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                  FinClue
                </span>
              </Link>

              {/* Navigation */}
              <div className="flex items-center gap-4">
                <Link 
                  href="/" 
                  className="text-theme-secondary hover:text-theme-primary transition-colors text-sm"
                >
                  Startseite
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-theme-secondary hover:text-theme-primary transition-colors text-sm"
                >
                  Preise
                </Link>
                
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-secondary/50 rounded-md transition-colors"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <SunIcon className="w-4 h-4" />
                  ) : (
                    <MoonIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ✅ KOMPAKTER Background */}
        <div className="min-h-screen bg-theme-primary noise-bg-subtle">
          
          {/* ✅ KOMPAKTE Main Content */}
          <main className="min-h-screen flex items-center justify-center px-4 py-16">
            
            {/* ✅ VIEL KLEINERE Auth Card */}
            <div className="w-full max-w-sm">
              <div className="bg-theme-card/90 backdrop-blur-xl border border-theme rounded-lg p-6 shadow-xl">
                
                {/* ✅ KOMPAKTER Header */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="flex items-end gap-0.5">
                      <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
                      <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
                      <div className="w-1 h-4 bg-green-500 rounded-sm"></div>
                    </div>
                    <span className="text-base font-bold text-theme-primary">FinClue</span>
                  </div>
                  <h1 className="text-xl font-bold text-theme-primary mb-1">
                    Willkommen zurück
                  </h1>
                  <p className="text-theme-secondary text-sm">
                    Melde dich an, um fortzufahren
                  </p>
                </div>

                {/* ✅ Auth Content */}
                <div className="space-y-4">
                  {children}
                </div>
              </div>
              
              {/* ✅ KOMPAKTE Bottom Links */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center gap-3 text-xs text-theme-muted">
                  <Link href="/privacy" className="hover:text-theme-secondary transition-colors">
                    Datenschutz
                  </Link>
                  <span>•</span>
                  <Link href="/terms" className="hover:text-theme-secondary transition-colors">
                    AGB
                  </Link>
                  <span>•</span>
                  <a href="mailto:team.finclue@gmail.com" className="hover:text-theme-secondary transition-colors">
                    Support
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>

        <Analytics />
      </body>
    </html>
  )
}