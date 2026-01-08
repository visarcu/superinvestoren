// src/app/superinvestor/fear-greed-index/page.tsx - COMING SOON
'use client'

import React from 'react'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  EyeIcon,
  ChartBarIcon,
  CalendarIcon,
  InformationCircleIcon,
  BoltIcon,
  SignalIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function FearGreedIndexComingSoon() {
  return (
    <div className="min-h-screen bg-theme-bg">
      
      {/* Header */}
      <section className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-6">
            <Link
              href="/superinvestor"
              className="inline-flex items-center gap-2 text-theme-secondary hover:text-white transition-colors text-sm group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück zur Übersicht
            </Link>
          </div>

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 text-brand-light rounded-full text-sm font-medium mb-6">
              <EyeIcon className="w-4 h-4" />
              Weltweit Erster
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Super-Investor
              <span className="block bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                Fear & Greed Index
              </span>
            </h1>
            
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto mb-8">
              Der erste psychologische Marktindikator basierend auf echten Portfolio-Bewegungen 
              der weltbesten Investoren statt Social Media Sentiment.
            </p>

            {/* Coming Soon Badge */}
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-lg font-semibold mb-8">
              <ClockIcon className="w-5 h-5" />
              Coming Soon
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-theme-secondary">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Live aus 13F-Filings
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                80+ Super-Investoren
              </span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                7 Psychologie-Metriken
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Preview Features */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-sm font-medium mb-6">
            <SparklesIcon className="w-4 h-4" />
            Was dich erwartet
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-12">
            Der erste Fear & Greed Index basierend auf echten Investoren-Daten
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature Cards */}
            {[
              {
                icon: ChartBarIcon,
                title: 'Live Sentiment Score',
                description: 'Echtzeitanalyse der Marktpsychologie basierend auf tatsächlichen Portfolio-Bewegungen der Super-Investoren.',
                color: 'text-brand-light',
                bgColor: 'bg-brand/10'
              },
              {
                icon: SignalIcon,
                title: '7 Psychologie-Metriken',
                description: 'Sentiment, Liquidität, Diversifikation, Momentum, Volatilität, Risikobereitschaft und Marktbreite.',
                color: 'text-blue-400',
                bgColor: 'bg-blue-500/10'
              },
              {
                icon: CalendarIcon,
                title: 'Historische Trends',
                description: 'Interaktive Charts mit 12+ Jahren historischer Daten für langfristige Marktanalysen.',
                color: 'text-purple-400',
                bgColor: 'bg-purple-500/10'
              },
              {
                icon: BoltIcon,
                title: 'SEC 13F Integration',
                description: 'Automatische Analyse aller vierteljährlichen 13F-Filings der größten Investmentfonds weltweit.',
                color: 'text-orange-400',
                bgColor: 'bg-orange-500/10'
              },
              {
                icon: BuildingOfficeIcon,
                title: 'Sektor-Analyse',
                description: 'Aufschlüsselung nach Wirtschaftssektoren und deren Einfluss auf das Gesamtsentiment.',
                color: 'text-indigo-400',
                bgColor: 'bg-indigo-500/10'
              },
              {
                icon: ArrowTrendingUpIcon,
                title: 'Trading Signale',
                description: 'Präzise Ein- und Ausstiegssignale basierend auf dem kollektiven Verhalten der Profis.',
                color: 'text-emerald-400',
                bgColor: 'bg-emerald-500/10'
              }
            ].map((feature, index) => (
              <div key={index} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                   className="border rounded-xl p-6 hover:bg-theme-hover transition-all duration-300">
                
                <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-theme-secondary text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Why Different */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
             className="border rounded-xl p-8 mb-16">
          
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Warum unser Index anders ist
            </h3>
            <p className="text-theme-secondary">
              Echte Daten statt Social Media Sentiment
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Traditional vs Our Approach */}
            <div>
              <h4 className="text-lg font-semibold text-red-400 mb-4">❌ Traditionelle Fear & Greed Indizes</h4>
              <div className="space-y-3 text-theme-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  <span>Social Media Sentiment (unzuverlässig)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  <span>Volatilitäts-basierte Indikatoren</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  <span>Umfragen und Stimmungsbarometer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  <span>Kurzfristige Marktschwankungen</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-brand-light mb-4">✅ Unser Super-Investor Index</h4>
              <div className="space-y-3 text-theme-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Echte Portfolio-Bewegungen von Profis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>SEC-regulierte 13F-Filings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>$2.5+ Billionen verwaltetes Vermögen</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Langfristige Trends statt Noise</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
             className="border rounded-xl p-8">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-4">
              <CalendarIcon className="w-4 h-4" />
              Entwicklungsfortschritt
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4">
              Aktueller Stand
            </h3>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="space-y-6">
              
              {/* Timeline Items */}
              {[
                {
                  phase: 'Phase 1',
                  title: 'Datensammlung & -bereinigung',
                  status: 'completed',
                  description: '80+ Super-Investor Portfolios, 12+ Jahre historische 13F-Daten'
                },
                {
                  phase: 'Phase 2', 
                  title: 'Algorithmus-Entwicklung',
                  status: 'completed',
                  description: '7 Psychologie-Metriken definiert und validiert'
                },
                {
                  phase: 'Phase 3',
                  title: 'Backend-Integration',
                  status: 'in-progress',
                  description: 'Performance-Optimierung und Echtzeit-Updates'
                },
                {
                  phase: 'Phase 4',
                  title: 'Frontend & Launch',
                  status: 'upcoming',
                  description: 'Interaktive Charts, Mobile Optimierung, Public Beta'
                }
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    item.status === 'completed' ? 'bg-brand text-black' :
                    item.status === 'in-progress' ? 'bg-blue-500 text-white animate-pulse' :
                    'bg-gray-600 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-white font-semibold">{item.phase}: {item.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.status === 'completed' ? 'bg-brand/20 text-brand-light' :
                        item.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.status === 'completed' ? 'Abgeschlossen' :
                         item.status === 'in-progress' ? 'In Arbeit' :
                         'Geplant'}
                      </span>
                    </div>
                    <p className="text-theme-secondary text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ETA */}
            <div className="mt-8 text-center p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="text-blue-400 font-semibold mb-2">Erwarteter Launch</h4>
              <p className="text-white text-xl font-bold mb-1">Q1 2025</p>
              <p className="text-blue-300 text-sm">
                Beta-Version mit den wichtigsten Features verfügbar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}