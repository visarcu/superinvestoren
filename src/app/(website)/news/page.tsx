// app/(website)/news/page.tsx - GRÜNES DESIGN & NEWSLETTER-FIX
import React from 'react'
import Link from 'next/link'
import NewsletterSignup from '@/components/NewsletterSignup'
import NewsPageClient from '@/components/NewsPageClient'
import { 
  ArrowRightIcon,
  SparklesIcon,
  EnvelopeIcon,
  CheckIcon,
  BookOpenIcon,
  ChartBarIcon,
  NewspaperIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'

// SERVER IMPORT
import { getAllPosts } from '@/lib/blog'

export default function NewsPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      
      {/* Hero Section - GRÜNES DESIGN (konsistent mit Lexikon) */}
      <div className="relative pt-24 pb-16 px-4">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0B0F]/50 to-[#0A0B0F]" />
        
        <div className="relative max-w-6xl mx-auto text-center">
          <br /><br />
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Research & Analysen
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Professionelle Marktanalysen, Super-Investor Updates und fundierte Einblicke 
            in die Welt der Finanzen. Von Experten für bessere Investment-Entscheidungen.
          </p>
          
          {/* CTA Buttons - GRÜNES DESIGN */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/analyse"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25"
            >
              <SparklesIcon className="w-5 h-5" />
              Jetzt Aktien analysieren
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#artikel"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              <BookOpenIcon className="w-5 h-5" />
              Artikel durchstöbern
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section - GRÜNES DESIGN */}
      <div className="py-16 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl mb-4 group-hover:bg-green-500/20 transition-colors">
                <EnvelopeIcon className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">150+</div>
              <div className="text-gray-400">Newsletter Abonnenten</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl mb-4 group-hover:bg-green-500/20 transition-colors">
                <AcademicCapIcon className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">{posts.length}</div>
              <div className="text-gray-400">Analysen</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl mb-4 group-hover:bg-green-500/20 transition-colors">
                <ChartBarIcon className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">90+</div>
              <div className="text-gray-400">Getrackte Investoren</div>
            </div>
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl mb-4 group-hover:bg-green-500/20 transition-colors">
                <NewspaperIcon className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-gray-400">Live Marktdaten</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-20" id="artikel">
        <NewsPageClient posts={posts} />
      </main>

      {/* Newsletter Section - GRÜNES DESIGN & NUR EINE BOX */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6">
              <EnvelopeIcon className="w-4 h-4" />
              Newsletter
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Research Updates erhalten
            </h3>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Erhalte wöchentlich die wichtigsten Super-Investor Updates, 
              Marktanalysen und Research-Insights direkt in dein Postfach.
            </p>
            
            <div className="mb-8">
              <NewsletterSignup />
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-green-400 text-sm">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Kostenlos & Werbefrei
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Jederzeit abmeldbar
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                DSGVO-konform
              </div>
            </div>
          </div>

          {/* CTA Section - GRÜNES DESIGN */}
          <div className="relative p-12 bg-gradient-to-r from-green-500/10 via-gray-500/10 to-gray-500/10 border border-green-500/20 rounded-3xl text-center overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-gray-500/5" />
            
            <div className="relative">
              <h3 className="text-3xl font-bold text-white mb-4">
                Bereit für die Praxis?
              </h3>
              <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Nutze die Erkenntnisse aus unseren Analysen mit echten Börsendaten 
                in unserem professionellen Analyse-Terminal.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/analyse"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-green-500/25"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Terminal kostenlos testen
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-200 border border-white/10 hover:border-white/20"
                >
                  Kostenloses Konto erstellen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}