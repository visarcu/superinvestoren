// src/app/auth/layout.tsx - QUARTR STYLE CENTERED DESIGN
'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Analytics } from "@vercel/analytics/next"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white font-['Inter',system-ui,sans-serif] antialiased flex flex-col">

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">

          {/* Card Container */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">

            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex items-end gap-0.5">
                  <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
                  <div className="w-1.5 h-4 bg-emerald-400 rounded-full"></div>
                  <div className="w-1.5 h-5 bg-emerald-300 rounded-full"></div>
                </div>
                <span className="text-lg font-semibold text-white">
                  FinClue
                </span>
              </Link>
            </div>

            {/* Form Content */}
            <div>
              {children}
            </div>
          </div>

          {/* Footer Links - Outside Card */}
          <div className="mt-6 text-center">
            <p className="text-xs text-neutral-600">
              FinClue{' '}
              <Link href="/terms" className="hover:text-neutral-400 transition-colors underline">
                AGB
              </Link>
              {' '}und{' '}
              <Link href="/privacy" className="hover:text-neutral-400 transition-colors underline">
                Datenschutz
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Analytics />
    </div>
  )
}