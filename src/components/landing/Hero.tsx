'use client'

import React from 'react'
import Link from 'next/link'
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export default function Hero() {
    return (
        <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-brand/5 rounded-full blur-3xl -z-10 opacity-30 pointer-events-none"></div>
            <div className="absolute top-20 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 opacity-20 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">

                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm mb-8 animate-fade-in-up">
                    <span className="w-2 h-2 rounded-full bg-brand-light animate-pulse"></span>
                    <span className="text-xs font-medium text-brand-light tracking-wide uppercase">Neu: AI Portfolio Audit</span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6 leading-tight max-w-4xl mx-auto">
                    Investieren mit <br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light via-white to-blue-200">
                        Superintelligenz.
                    </span>
                </h1>

                {/* Subline */}
                <p className="text-lg sm:text-xl text-theme-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
                    Nutze die gleichen Daten wie Warren Buffett. Analysiert von modernster AI.
                    Erhalte brutales Feedback zu deinem Portfolio und entdecke neue Chancen.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/analyse/portfolio-check"
                        className="w-full sm:w-auto px-8 py-4 bg-brand hover:bg-green-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2 group"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        AI Audit starten
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                        href="/analyse"
                        className="w-full sm:w-auto px-8 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-white font-medium rounded-xl border border-white/[0.08] transition-all backdrop-blur-sm"
                    >
                        Dashboard ansehen
                    </Link>
                </div>

                {/* Trust/Social Proof Small */}
                <div className="mt-12 pt-8 border-t border-white/[0.04] max-w-lg mx-auto">
                    <p className="text-theme-muted text-xs uppercase tracking-widest mb-4">Powered by</p>
                    <div className="flex justify-center items-center gap-8 grayscale opacity-50">
                        {/* Simplified Text Logos for now */}
                        <span className="font-bold text-white/40">SEC EDGAR</span>
                        <span className="font-bold text-white/40">OPENAI</span>
                        <span className="font-bold text-white/40">NASDAQ</span>
                    </div>
                </div>

            </div>
        </section>
    )
}
