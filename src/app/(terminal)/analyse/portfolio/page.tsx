// src/app/analyse/portfolio/page.tsx - CLEAN COMING SOON VERSION
'use client'

import React from 'react'
import Link from 'next/link'
import { 
  BriefcaseIcon, 
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export default function PortfolioComingSoonPage() {
  return (
    <div className="min-h-screen bg-theme-primary">
      {/* ✅ EINHEITLICHER HEADER */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          
          {/* Zurück-Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zum Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <BriefcaseIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                Portfolio Tracker
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-theme-muted">
                  Verwalten Sie Ihre Aktienpositionen
                </span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm text-yellow-400 font-medium">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT */}
      <main className="w-full px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* ✅ CLEAN HERO SECTION */}
          <div className="text-center">
            <div className="w-20 h-20 bg-theme-secondary border border-theme/20 rounded-2xl flex items-center justify-center mx-auto mb-8 relative">
              <BriefcaseIcon className="w-10 h-10 text-green-400" />
              
              {/* Coming Soon Badge */}
              <div className="absolute -top-2 -right-2 bg-yellow-500 text-black px-2 py-0.5 rounded-full text-xs font-bold">
                Soon
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-theme-primary mb-4">
              Portfolio Tracker
            </h2>
            <p className="text-xl text-theme-secondary max-w-2xl mx-auto leading-relaxed">
              Ein professioneller Portfolio-Tracker zur Verwaltung Ihrer Aktienpositionen, 
              automatischer Dividendenverfolgung und Performance-Analyse.
            </p>
          </div>

          {/* ✅ CLEAN FEATURE PREVIEW - nur grau/grün */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
              <div className="w-12 h-12 bg-theme-secondary border border-theme/20 rounded-xl flex items-center justify-center mb-4">
                <ChartBarIcon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                Portfolio Übersicht
              </h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Verfolgen Sie automatisch den Wert Ihrer Positionen, Gewinne/Verluste und Gesamtperformance in Echtzeit.
              </p>
            </div>

            <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
              <div className="w-12 h-12 bg-theme-secondary border border-theme/20 rounded-xl flex items-center justify-center mb-4">
                <CalendarIcon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                Dividenden Tracking
              </h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Automatische Berechnung erwarteter Dividenden, Ex-Dividend Daten und jährlicher Ausschüttungen.
              </p>
            </div>

            <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
              <div className="w-12 h-12 bg-theme-secondary border border-theme/20 rounded-xl flex items-center justify-center mb-4">
                <CurrencyDollarIcon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                Performance Analyse
              </h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Detaillierte Charts, Sektorverteilung und Vergleich mit Marktindizes für bessere Entscheidungen.
              </p>
            </div>

            <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
              <div className="w-12 h-12 bg-theme-secondary border border-theme/20 rounded-xl flex items-center justify-center mb-4">
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                Live Kurse
              </h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Echtzeitkurse für alle Ihre Positionen mit automatischer Aktualisierung während der Marktzeiten.
              </p>
            </div>

            <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
              <div className="w-12 h-12 bg-theme-secondary border border-theme/20 rounded-xl flex items-center justify-center mb-4">
                <SparklesIcon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                KI Insights
              </h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Intelligente Vorschläge zur Portfoliooptimierung und Risikomanagement mit KI-Unterstützung.
              </p>
            </div>

            <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
              <div className="w-12 h-12 bg-theme-secondary border border-theme/20 rounded-xl flex items-center justify-center mb-4">
                <ClockIcon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                Steuer-Export
              </h3>
              <p className="text-theme-secondary text-sm leading-relaxed">
                Automatischer Export aller Transaktionen für die Steuererklärung im deutschen Format.
              </p>
            </div>
          </div>

          {/* ✅ CLEAN TIMELINE */}
          <div className="bg-theme-card rounded-xl p-8 border border-theme/10">
            <h3 className="text-2xl font-bold text-theme-primary mb-6 text-center">
              Entwicklungs-Roadmap
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-theme-primary">Grundlegende Aktienanalyse</h4>
                  <p className="text-theme-secondary text-sm">Financial Statements, Wachstumsanalyse, DCF Calculator</p>
                  <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium mt-1">
                    ✅ Verfügbar
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-theme-primary">Portfolio Tracker (Phase 1)</h4>
                  <p className="text-theme-secondary text-sm">Grundlegende Position-Verwaltung und Performance-Tracking</p>
                  <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium mt-1">
                    🚧 Q1 2025
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-theme-secondary border border-theme/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-4 h-4 text-theme-muted" />
                </div>
                <div>
                  <h4 className="font-semibold text-theme-primary">Dividenden-Tracking (Phase 2)</h4>
                  <p className="text-theme-secondary text-sm">Automatische Dividendenverfolgung und Kalender</p>
                  <span className="inline-block px-2 py-1 bg-theme-secondary text-theme-muted rounded text-xs font-medium mt-1">
                    📅 Q2 2025
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-theme-secondary border border-theme/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-4 h-4 text-theme-muted" />
                </div>
                <div>
                  <h4 className="font-semibold text-theme-primary">KI-Features & Steuer-Export (Phase 3)</h4>
                  <p className="text-theme-secondary text-sm">Intelligente Insights und Steuerintegration</p>
                  <span className="inline-block px-2 py-1 bg-theme-secondary text-theme-muted rounded text-xs font-medium mt-1">
                    🎯 Q3 2025
                  </span>
                </div>
                </div>
            </div>
          </div>

          {/* ✅ CLEAN NOTIFY SECTION */}
          <div className="bg-theme-card border border-green-500/20 rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-theme-primary mb-4">
              Als Erster informiert werden
            </h3>
            <p className="text-theme-secondary mb-6 max-w-2xl mx-auto">
              Erhalten Sie eine Benachrichtigung, sobald der Portfolio Tracker verfügbar ist. 
              Premium-Nutzer erhalten frühen Zugang zur Beta-Version.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-white rounded-lg font-semibold transition-colors"
              >
                <SparklesIcon className="w-5 h-5" />
                Premium für Early Access
              </Link>
              
              <button
                onClick={() => window.location.href = 'mailto:team@finclue.de?subject=Portfolio Tracker - Benachrichtigung&body=Hallo, ich möchte benachrichtigt werden, sobald der Portfolio Tracker verfügbar ist.'}
                className="inline-flex items-center gap-2 px-6 py-3 border border-theme text-theme-primary hover:bg-theme-secondary/50 rounded-lg font-medium transition-colors"
              >
                Benachrichtigung anfordern
              </button>
            </div>
          </div>

          {/* ✅ CLEAN ALTERNATIVE FEATURES */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-theme-primary mb-4">
              In der Zwischenzeit verfügbar
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-secondary/50 border border-theme rounded-lg transition-colors"
              >
                <ChartBarIcon className="w-4 h-4 text-green-400" />
                <span className="text-theme-primary">Aktienanalyse</span>
              </Link>
              
              <Link
                href="/analyse/watchlist"
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-secondary/50 border border-theme rounded-lg transition-colors"
              >
                <BriefcaseIcon className="w-4 h-4 text-green-400" />
                <span className="text-theme-primary">Watchlist</span>
              </Link>
              
              <Link
                href="/analyse/dcf"
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-card hover:bg-theme-secondary/50 border border-theme rounded-lg transition-colors"
              >
                <CurrencyDollarIcon className="w-4 h-4 text-green-400" />
                <span className="text-theme-primary">DCF Calculator</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}