// src/app/auth/layout.tsx - FIXED FOR APP ROUTER
'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Analytics } from "@vercel/analytics/next"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-['Poppins',system-ui,sans-serif] antialiased">
        
        {/* Header */}
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

              {/* Navigation */}
              <div className="flex items-center gap-4">
                <Link 
                  href="/" 
                  className="text-theme-secondary hover:text-white transition-colors text-sm"
                >
                  Startseite
                </Link>
                <Link 
                  href="/pricing" 
                  className="text-theme-secondary hover:text-white transition-colors text-sm"
                >
                  Preise
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <div className="min-h-screen bg-gray-900 relative">
          
          {/* Content Area */}
          <main className="min-h-screen flex items-center justify-center px-4 py-16 relative z-20">
            <div className="w-full max-w-7xl flex items-center justify-between gap-16">
              
              {/* LINKS: Login Form */}
              <div className="w-full max-w-md">
                <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                     className="backdrop-blur-xl 
                      rounded-lg p-8 shadow-xl">
                  
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
                    <p className="text-theme-secondary">
                      Melde dich an, um fortzufahren
                    </p>
                  </div>

                  <div className="space-y-5">
                    {children}
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center gap-3 text-xs text-theme-secondary">
                    <Link href="/privacy" className="hover:text-white transition-colors">
                      Datenschutz
                    </Link>
                    <span>•</span>
                    <Link href="/terms" className="hover:text-white transition-colors">
                      AGB
                    </Link>
                    <span>•</span>
                    <a href="mailto:team@finclue.de" className="hover:text-white transition-colors">
                      Support
                    </a>
                  </div>
                </div>
              </div>

              {/* RECHTS: Headline */}
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

        {/* LAPTOP LAYER */}
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
    </div>
  )
}