'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import FeatureSection from '@/components/features/FeatureSection'
import FeaturesSideNav from '@/components/features/FeaturesSideNav'

const sideNavItems = [
  { id: 'hero', label: 'Übersicht' },
  { id: 'kennzahlen', label: 'Kennzahlen' },
  { id: 'quartalszahlen', label: 'Quartalszahlen' },
  { id: 'superinvestoren', label: 'Superinvestoren' },
  { id: 'kongress', label: 'Kongress-Trades' },
  { id: 'insider', label: 'Insider' },
  { id: 'chart-builder', label: 'Chart Builder' },
]

const fadeInViewport = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.6, ease: 'easeOut' as const },
}

export default function FeaturesClient() {
  return (
    <div className="bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-16">
          <aside className="hidden lg:block pt-32">
            <FeaturesSideNav items={sideNavItems} />
          </aside>

          <main>
            <FeatureSection
              id="hero"
              image="/features/hero-portfolio.png"
              imageAlt="Finclue Portfolio-Übersicht mit Löwen-Skulptur"
              headline="Dein Portfolio, endlich mit Klarheit."
              subline="Die Analyse-Plattform für Investoren, die's ernst meinen."
              imagePosition="center"
              priority
            />

            <section className="py-24 text-center max-w-3xl mx-auto">
              <motion.div {...fadeInViewport}>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Von Profis inspiriert. Für dich gebaut.
                </h3>
                <p className="mt-4 text-base md:text-lg text-neutral-400 leading-relaxed">
                  Jedes Feature durchdacht, um dich schneller zu besseren Entscheidungen zu bringen.
                </p>
              </motion.div>
            </section>

            <FeatureSection
              id="kennzahlen"
              image="/features/kennzahlen.png"
              imageAlt="Finclue Kennzahlen-Dashboard"
              headline="Komplexe Daten, klar verständlich."
              subline="Finclue verwandelt Geschäftsberichte und Finanzdaten in klare Insights."
              imagePosition="center"
            />

            <FeatureSection
              id="quartalszahlen"
              image="/features/quartalszahlen.png"
              imageAlt="Quartalszahlen und AI-Zusammenfassungen bei Finclue"
              headline="Aus 100 Seiten werden 10 Zeilen."
              subline="Quartalszahlen, Transcripts und Reports — von KI auf den Punkt gebracht."
              imagePosition="center"
            />

            <FeatureSection
              id="superinvestoren"
              image="/features/superinvestoren.png"
              imageAlt="Superinvestoren-Portfolios bei Finclue"
              headline="Folge den Besten."
              subline="Die Top-Investoren der Welt. Alle in einem Feed."
              imagePosition="center"
            />

            <FeatureSection
              id="kongress"
              image="/features/kongress.png"
              imageAlt="Kongress-Trades bei Finclue"
              headline="Sieh, was der Kongress kauft."
              subline="Politische Insider-Trades öffentlich gemacht. Exklusiv bei Finclue."
              imagePosition="center"
            />

            <FeatureSection
              id="insider"
              image="/features/insider.png"
              imageAlt="Insider-Transaktionen bei Finclue"
              headline="Signale aus erster Hand."
              subline="Was Insider kaufen, bevor es die Welt erfährt."
              imagePosition="center"
            />

            <FeatureSection
              id="chart-builder"
              image="/features/chart-builder.png"
              imageAlt="Finclue Chart Builder"
              headline="Vergleiche. Entscheide. Investiere."
              subline="Aktien, Kennzahlen und Jahre — alles in einem Chart."
              imagePosition="center"
            />

            <section className="relative py-32 text-center overflow-hidden">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.08)_0%,transparent_60%)]" />
              <motion.div {...fadeInViewport} className="max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                  Bereit für professionelle Analyse?
                </h2>
                <p className="mt-5 text-lg md:text-xl text-neutral-400">
                  Starte kostenlos. Keine Kreditkarte nötig.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/auth/signup"
                    className="px-6 py-3 bg-white text-black font-medium rounded-lg transition-all hover:bg-neutral-100 text-base"
                  >
                    7 Tage kostenlos testen
                  </Link>
                  <Link
                    href="/pricing"
                    className="px-6 py-3 border border-neutral-800 text-neutral-300 font-medium rounded-lg transition-all hover:text-white hover:border-neutral-700 text-base"
                  >
                    Preise ansehen
                  </Link>
                </div>
              </motion.div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
