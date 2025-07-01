// src/app/auth/layout.tsx - OHNE Theme Toggle
'use client'

import '../globals.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Analytics } from "@vercel/analytics/next"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark"> {/* ✅ Fest auf dark */}
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
      <body className="min-h-screen bg-gray-950 text-white font-['Poppins',system-ui,sans-serif] antialiased">
        
        {/* ✅ Header - Fest dunkel */}
        <header className="absolute top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="flex items-end gap-0.5">
                  <div className="w-1.5 h-3 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
                </div>
                <span className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">
                  FinClue
                </span>
              </Link>

              {/* Navigation - OHNE Theme Toggle */}
              <div className="flex items-center gap-4">
                <Link 
                  href="/" 
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Startseite
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Preise
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ✅ Main Content Container - Fest dunkel */}
        <div className="min-h-screen bg-gray-950 noise-bg-subtle relative">
          
          {/* ✅ Content Area */}
          <main className="min-h-screen flex items-center justify-center px-4 py-16 relative z-20">
            <div className="w-full max-w-7xl flex items-center justify-between gap-16">
              
              {/* ✅ LINKS: Login Form */}
              <div className="w-full max-w-md">
                <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-lg p-8 shadow-xl">
                  
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="flex items-end gap-0.5">
                        <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
                        <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
                        <div className="w-1 h-4 bg-green-500 rounded-sm"></div>
                      </div>
                      <span className="text-lg font-bold text-white">FinClue</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                      Willkommen zurück
                    </h1>
                    <p className="text-gray-300">
                      Melde dich an, um fortzufahren
                    </p>
                  </div>

                  <div className="space-y-5">
                    {children}
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
                    <Link href="/privacy" className="hover:text-gray-300 transition-colors">
                      Datenschutz
                    </Link>
                    <span>•</span>
                    <Link href="/terms" className="hover:text-gray-300 transition-colors">
                      AGB
                    </Link>
                    <span>•</span>
                    <a href="mailto:team.finclue@gmail.com" className="hover:text-gray-300 transition-colors">
                      Support
                    </a>
                  </div>
                </div>
              </div>

              {/* ✅ RECHTS: Headline */}
              <div className="flex-1 relative hidden lg:block">
                <div className="text-center">
                  <h2 className="text-6xl font-bold text-white mb-6">
                    Sieh was andere übersehen.
                    <br />
                    <br></br>
                     {/*  <span className="text-green-400">Aktien analysieren wie die Profis</span> */}
                    <br></br>
                    <br></br>
                    <br></br>
                  </h2>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* ✅ LAPTOP LAYER - OPTIMALE POSITION */}
        <div 
          className="fixed bottom-0 left-30 right-0 hidden lg:block pointer-events-none z-10"
          style={{ 
            height: '70vh',
            overflow: 'hidden'
          }}
        >
          <div className="relative w-full h-full flex items-end justify-center pr-20">
            <div className="relative" style={{ marginBottom: '-8vh' }}>
              <img 
                src="/laptop-finclue-preview.png" 
                alt="FinClue Analytics Dashboard"
                className="pointer-events-auto hover:scale-105 transition-transform duration-500 drop-shadow-2xl"
                style={{ 
                  height: '65vh',
                  width: 'auto'
                }}
              />
              
              {/* Glowing Effect */}
              <div 
                className="absolute top-0 right-0 bg-gradient-to-l from-green-500/15 to-transparent rounded-lg blur-2xl -z-10"
                style={{
                  width: '50%',
                  height: '100%'
                }}
              ></div>
            </div>
          </div>
        </div>

        <Analytics />
      </body>
    </html>
  )
}