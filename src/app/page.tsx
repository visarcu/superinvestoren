// src/app/page.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SearchTickerInput from '@/components/SearchTickerInput'
import NewsletterSignup from '@/components/NewsletterSignup'
import Logo from '@/components/Logo'
import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import Hero from '@/components/Hero'

export default function HomePage() {
  const router = useRouter()

  // Für „Top Investoren“ und „Top Käufe“ kannst du deine bisherigen Logiken
  // hier importieren und wiederverwenden. Ich lasse die hier der Kürze halber weg.

  return (
    <main className="max-w-9xl mx-auto px-6 py-12 space-y-20">

      {/* ─── Hero ─── */}
      <Hero />

      {/* ─── Feature-Blöcke ─── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <Link
          href="/analyse"
          className="
            flex flex-col justify-between
            bg-gradient-to-br from-heroFrom to-heroTo
            rounded-2xl p-8 shadow-lg hover:scale-[1.02] transition
          "
        >
          <div>
            <h2 className="text-2xl font-orbitron text-white mb-2">
              Aktien analysieren
            </h2>
            <p className="text-gray-200">
              Live-Quote, Charts & Kennzahlen in Sekundenschnelle.
            </p>
          </div>
          <span className="inline-block mt-4 px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-100 transition">
            Jetzt starten →
          </span>
        </Link>

        <Link
          href="/superinvestoren"
          className="
            flex flex-col justify-between
            bg-gray-800/60 backdrop-blur-md
            rounded-2xl p-8 shadow-lg hover:shadow-2xl transition
          "
        >
          <div>
            <h2 className="text-2xl font-orbitron text-white mb-2">
              Super-Investoren
            </h2>
            <p className="text-gray-300">
              Entdecke Portfolios & Strategien der Top-Investoren.
            </p>
          </div>
          <span className="inline-block mt-4 px-4 py-2 bg-accent text-black rounded-full text-sm font-medium hover:bg-accent/90 transition">
            Portfolio ansehen →
          </span>
        </Link>
      </section>

      {/* ─── Top Investoren ─── */}
      <section className="space-y-4">
        <h2 className="text-3xl font-semibold text-white">Top Investoren</h2>
        <p className="text-gray-400 max-w-prose">
          Klick auf eine Karte für Depot-Details und Performance.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {investors
            .filter(i => ['buffett','ackman','burry'].includes(i.slug))
            .map(inv => (
              <Link
                key={inv.slug}
                href={`/investor/${inv.slug}`}
                className="
                  group flex flex-col items-center p-6
                  bg-gray-800/60 rounded-2xl hover:shadow-xl hover:scale-105 transition
                "
              >
                <div className="relative w-24 h-24 mb-4 rounded-full ring-2 ring-accent overflow-hidden">
                  <Image src={inv.imageUrl!} alt={inv.name} fill className="object-cover" />
                </div>
                <h3 className="text-xl text-white font-semibold">{inv.name}</h3>
              </Link>
            ))
          }
        </div>
      </section>

      {/* ─── Weitere Investoren (optional) ─── */}
      {/* … hier dein „Alle Investoren“ Abschnitt … */}

      {/* ─── Top Käufe / Top Holdings / Newsletter … ─── */}
      {/* Du kannst deine Sections 5 + 6 (Top Käufe, Newsletter) hier genauso anschließen */}
      <section className="grid md:grid-cols-2 gap-8">
        <div className="bg-gray-900 p-6 rounded-2xl">
          <h3 className="text-xl font-semibold text-white mb-3">Was sind 13F-Filings?</h3>
          <p className="text-gray-300">
            Quartalsberichte großer Investmentmanager an die US-SEC.
          </p>
        </div>
        <div className="bg-gray-900 p-6 rounded-2xl">
          <h3 className="text-xl font-semibold text-white mb-3">
            Nie wieder ein Quartals-Update verpassen
          </h3>
          <NewsletterSignup />
        </div>
      </section>
    </main>
  )
}