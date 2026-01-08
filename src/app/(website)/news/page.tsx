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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
      {/* Header */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium backdrop-blur-sm mb-4">
            <NewspaperIcon className="w-3 h-3" />
            Research & News
          </div>
          
          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4">
            Research & Analysen
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Professionelle Marktanalysen, Super-Investor Updates und fundierte Einblicke in die Welt der Finanzen
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <AcademicCapIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Professionelle Research</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {posts.length} ausführliche Analysen und Research-Berichte von Experten. 
                Von Super-Investor Updates bis zu fundierten Markteinblicken für bessere Investment-Entscheidungen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06] text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-brand/10 rounded-lg">
              <EnvelopeIcon className="w-5 h-5 text-brand-light" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mb-1">150+</div>
          <div className="text-gray-400 text-sm">Newsletter Abonnenten</div>
        </div>
        
        <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06] text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <AcademicCapIcon className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mb-1">{posts.length}</div>
          <div className="text-gray-400 text-sm">Analysen</div>
        </div>
        
        <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06] text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <ChartBarIcon className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mb-1">90+</div>
          <div className="text-gray-400 text-sm">Getrackte Investoren</div>
        </div>
        
        <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06] text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <NewspaperIcon className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <div className="text-xl font-bold text-white mb-1">24/7</div>
          <div className="text-gray-400 text-sm">Live Marktdaten</div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mb-16" id="artikel">
        <NewsPageClient posts={posts} />
      </main>

      {/* Newsletter Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {/* Newsletter */}
        <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand/10 rounded-lg">
              <EnvelopeIcon className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Research Updates</h3>
              <p className="text-gray-400 text-sm">Wöchentliche Marktanalysen</p>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Erhalte die wichtigsten Super-Investor Updates, Marktanalysen und Research-Insights 
            direkt in dein Postfach.
          </p>
          
          <NewsletterSignup />
          
          <div className="flex flex-wrap gap-4 text-brand-light text-xs mt-4">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3" />
              Kostenlos & Werbefrei
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3" />
              Jederzeit abmeldbar
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-3 h-3" />
              DSGVO-konform
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Bereit für die Praxis?</h3>
              <p className="text-gray-400 text-sm">Nutze Research mit echten Daten</p>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Nutze die Erkenntnisse aus unseren Analysen mit echten Börsendaten 
            in unserem professionellen Analyse-Terminal.
          </p>
          
          <div className="space-y-3">
            <Link
              href="/analyse"
              className="group flex items-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all"
            >
              <SparklesIcon className="w-4 h-4" />
              Terminal kostenlos testen
              <ArrowRightIcon className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all border border-white/10 hover:border-white/20"
            >
              Kostenloses Konto erstellen
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}