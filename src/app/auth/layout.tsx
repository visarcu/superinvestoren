// src/app/auth/layout.tsx - QUARTR STYLE CENTERED DESIGN
'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Analytics } from "@vercel/analytics/next"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-['Inter',system-ui,sans-serif] antialiased flex flex-col">

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">

          {/* Logo - Above Card */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logos/logo-transparent-white.svg"
                alt="Finclue Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-semibold text-white">
                Finclue
              </span>
            </Link>
          </div>

          {/* Card Container - Subtle, no harsh borders */}
          <div className="bg-[#111113] rounded-2xl p-8 shadow-2xl shadow-black/50">
            {/* Form Content */}
            {children}
          </div>

          {/* Footer Links - Outside Card */}
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral-600">
              <Link href="/terms" className="hover:text-neutral-400 transition-colors">
                AGB
              </Link>
              {' · '}
              <Link href="/privacy" className="hover:text-neutral-400 transition-colors">
                Datenschutz
              </Link>
              {' · '}
              <Link href="/" className="hover:text-neutral-400 transition-colors">
                Finclue
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Analytics />
    </div>
  )
}
