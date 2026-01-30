import React from 'react'
import { Metadata } from 'next'
import Hero from '@/components/landing/Hero'
import BentoGrid from '@/components/landing/BentoGrid'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'FinClue AI - Superinvestor Intelligenz',
    description: 'Analysiere dein Portfolio mit AI. Folge den Besten. Werde besser.',
}

export default function AILandingPage() {
    return (
        <div className="min-h-screen bg-[#0A0B0F] selection:bg-brand selection:text-black">
            {/* Top Navigation Overlay */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto pointer-events-none">
                <Link href="/" className="pointer-events-auto">
                    {/* Simple Logo Placeholder */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-black text-sm">
                            FC
                        </div>
                        <span className="text-white font-bold tracking-tight">FinClue</span>
                    </div>
                </Link>

                <div className="pointer-events-auto">
                    <Link
                        href="/auth/signin"
                        className="text-sm font-medium text-theme-secondary hover:text-white transition-colors px-4 py-2 hover:bg-white/[0.05] rounded-lg"
                    >
                        Login
                    </Link>
                </div>
            </nav>

            <main>
                <Hero />
                <BentoGrid />
            </main>

            {/* Footer Minimal */}
            <footer className="py-12 border-t border-white/[0.06] bg-[#0A0B0F]">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-theme-muted text-sm">
                        &copy; {new Date().getFullYear()} FinClue Research.
                        <span className="mx-2 text-white/[0.1]">•</span>
                        Daten basieren auf SEC 13F Filings.
                        <span className="mx-2 text-white/[0.1]">•</span>
                        Keine Anlageberatung.
                    </p>
                </div>
            </footer>
        </div>
    )
}
