// src/app/page.tsx
'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SearchTickerInput from '@/components/SearchTickerInput'
import NewsletterSignup from '@/components/NewsletterSignup'
import Logo from '@/components/Logo'
import { investors } from '@/data/investors'
import Hero from '@/components/Hero'

export default function HomePage() {
  const router = useRouter()

 const wantedSlugs = ['buffett', 'ackman', 'marks', 'smith'] 
 const highlightInvestors = investors.filter(inv =>
   wantedSlugs.includes(inv.slug)
 )

  return (
    <main className="max-w-9xl mx-auto px-6 py-16 space-y-24">
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
              Live-Quote, Charts &amp; Kennzahlen in Sekundenschnelle.
            </p>
          </div>
          <span className="inline-block mt-4 px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-100 transition">
            Jetzt starten →
          </span>
        </Link>

        <Link
          href="/superinvestor"
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
              Entdecke Portfolios &amp; Strategien der Top-Investoren.
            </p>
          </div>
          <span className="inline-block mt-4 px-4 py-2 bg-accent text-black rounded-full text-sm font-medium hover:bg-accent/90 transition">
            Portfolio ansehen →
          </span>
        </Link>
      </section>

      {/* ─── Top Investoren (bestehender Code) ─── */}
      <section className="flex flex-col md:flex-row items-start md:items-center gap-16">
        {/* Links: Großer Textblock */}
        <div className="md:w-1/2">
          <h2 className="text-5xl font-bold text-white mb-6">
            Guck in die Depots der besten Investoren der Welt
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-prose">
            Erfahre, welche Aktien und Strategien die erfolgreichsten Investoren einsetzen.
            Wir haben die Portfolios von Legenden wie Warren Buffett, Bill Ackman,
            Michael Burry und weiteren Top-Investoren gesammelt. Klicke auf eine Karte,
            um Details zu sehen und dich inspirieren zu lassen.
          </p>
        </div>

        {/* Rechts: 2×2 Grid mit Highlight-Cards */}
        <div className="md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-8">
          {highlightInvestors.map((inv) => (
            <Link
              key={inv.slug}
              href={`/investor/${inv.slug}`}
              className="
                flex flex-col items-center text-center
                bg-gray-900
                rounded-2xl
                p-6
                hover:shadow-xl hover:bg-gray-800 transition
              "
            >
              <div className="relative w-24 h-24 mb-4 rounded-full ring-2 ring-accent overflow-hidden">
                <Image
                  src={inv.imageUrl!}
                  alt={inv.name}
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-white">
                {inv.name.split('–')[0].trim()}
              </h3>
            </Link>
          ))}
        </div>
      </section>

           {/* ─── Neuer Abschnitt: Kennzahlen & Charts (mirror layout) ─── */}
      <section className="flex flex-col-reverse md:flex-row items-center gap-16">
        {/* Links: Screenshot-Preview */}
        <div className="md:w-1/2 flex justify-center">
          <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-lg">
            {/* Den Screenshot als Datei in /public legen, z.B. /public/chart-preview.png */}
            <Image
              src="/chart-preview.png"
              alt="Vorschau: Kennzahlen & Charts"
              width={800}
              height={500}
              className="object-cover"
            />
          </div>
        </div>

        {/* Rechts: Textblock */}
        <div className="md:w-1/2">
          <h2 className="text-5xl font-bold text-white mb-6">
            Kennzahlen &amp; Charts klar im Blick
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-prose">
            Sieh auf einen Blick historisches Wachstum, Margen und wichtige Kennzahlen im ansprechenden Chart-Format. 
            Wähle Zeitraum und Datenpunkte selbst aus, um deine Analysen schnell und effizient durchzuführen.
          </p>
        </div>
      </section>

     {/* ─── Newsletter‐Anmeldung (clean und zentriert) ─── */}
<section className="flex justify-center">
  <div className="w-full max-w-4xl bg-gray-900 rounded-2xl p-8 md:p-12">
    {/* Titel */}
    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center md:text-left">
      Nie wieder ein Quartals-Update verpassen
    </h3>
    {/* Beschreibung */}
    <p className="text-gray-400 text-base mb-6 text-center md:text-left">
      Trag dich in unseren Quartals-Newsletter ein und bleib immer auf dem Laufenden
      über neue 13F-Filings, marktbewegende Ereignisse und Insights unserer Top-Investor-Analysen.
    </p>
    {/* Formular */}
    <form className="flex flex-col sm:flex-row items-center gap-4">
      {/* Input */}
      <input
        type="email"
        placeholder="Deine E-Mail"
        className="
          w-full sm:flex-1
          px-5 py-3
          bg-white text-gray-900
          placeholder-gray-500
          rounded-2xl sm:rounded-l-2xl sm:rounded-r-none
          focus:outline-none focus:ring-2 focus:ring-accent
          transition
        "
      />
      {/* Button */}
      <button
        type="submit"
        className="
          w-full sm:w-auto
          px-6 py-3
          bg-accent text-black font-medium
          rounded-2xl sm:rounded-r-2xl sm:rounded-l-none
          hover:bg-accent/90 transition
        "
      >
        Abonnieren
      </button>
    </form>
  </div>
</section>
    </main>
  )
}