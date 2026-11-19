// Startseite — Server Component, damit Inhalte im HTML stehen (SEO / KI-Suchen).
// Erzählt Finclue als Ablauf: Idee finden (Superinvestoren) → selbst prüfen
// (Aktienanalyse) → im Blick behalten (Depot).

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRightIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BuildingLibraryIcon,
  CheckIcon,
  EyeIcon,
  PresentationChartLineIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import NewsletterSignup from '@/components/NewsletterSignup'
import LandingFeatureShowcase from '@/components/landing/LandingFeatureShowcase'
import HeroSearch from '@/components/landing/HeroSearch'
import Logo from '@/components/Logo'
import highlights from '@/data/homepageHighlights.json'
import { investors } from '@/data/investors'
import { IMPORT_BROKERS } from '@/lib/importBrokerConfig'
import type { SearchResult } from '@/lib/searchSuggestions'
import { formatIsoDate, formatUsdCompact, shortCompanyName } from '@/lib/displayFormat'
import { PLAN_FEATURES, PREMIUM_MONTHLY_EUR, PREMIUM_TRIAL_DAYS, PREMIUM_YEARLY_EUR } from '@/lib/pricing'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

// — Daten (alle aus echten Quellen) —

const brokers = IMPORT_BROKERS.filter(b => b.id !== 'other')
const brokerNames = brokers.map(b => b.shortName ?? b.name)
const freeFeatures = PLAN_FEATURES.free.filter(f => f.included)
const premiumHighlights = PLAN_FEATURES.premium.filter(
  f => f.highlight || f.name.startsWith('Superinvestor-Abgleich')
)
const yearlyPerMonth = (PREMIUM_YEARLY_EUR / 12).toLocaleString('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const filingDate = formatIsoDate(highlights.latestFilingDate)
const reportQuarter = highlights.reportQuarter ?? 'dem letzten Quartal'

// Einheitlich quadratische Icons: lokales PNG (vom Highlights-Skript geprüft),
// sonst logo.dev. Die lokalen SVGs der Logo-Komponente sind teils Schriftzüge.
const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
function logoSrc(item: { ticker: string; logo: string | null }): string | undefined {
  if (item.logo) return item.logo
  return LOGO_DEV_TOKEN ? `https://img.logo.dev/ticker/${item.ticker}?token=${LOGO_DEV_TOKEN}` : undefined
}

// Vorschläge im leeren Suchfeld: zwei bekannte Investoren + die zwei
// meistgekauften Aktien der aktuellen 13F-Saison
const quickPicks: SearchResult[] = [
  ...['buffett', 'ackman'].flatMap(slug => {
    const inv = investors.find(i => i.slug === slug)
    if (!inv) return []
    const [name, firm] = inv.name.split(/\s*–\s*|\s+-\s+/)
    return [{ type: 'investor' as const, id: slug, title: name.trim(), subtitle: firm?.trim() ?? 'Investor Portfolio', href: `/superinvestor/${slug}` }]
  }),
  ...highlights.mostBought.slice(0, 2).map(s => ({
    type: 'stock' as const,
    id: s.ticker,
    title: s.ticker,
    subtitle: `${shortCompanyName(s.name)} · von ${s.investorCount} Superinvestoren gekauft`,
    href: `/analyse/stocks/${s.ticker}`,
  })),
]

const pillars = [
  { href: '/superinvestor', title: 'Superinvestoren folgen' },
  { href: '/analyse', title: 'Aktien analysieren' },
  { href: '/analyse/portfolio', title: 'Depot tracken' },
]

const moreFeatures = [
  {
    href: '/features#quartalszahlen',
    icon: SparklesIcon,
    title: 'Quartalszahlen + KI',
    text: 'Aus 100 Seiten werden 10 Zeilen. Reports und Transcripts auf den Punkt gebracht.',
  },
  {
    href: '/politiker',
    icon: BuildingLibraryIcon,
    title: 'Kongress-Trades',
    text: 'Sieh, was US-Politiker kaufen und verkaufen — aus den offiziellen Offenlegungen.',
  },
  {
    href: '/superinvestor/insider',
    icon: EyeIcon,
    title: 'Insider-Signale',
    text: 'Wann CEOs und Direktoren kaufen oder verkaufen — direkt aus SEC-Filings.',
  },
  {
    href: '/features#chart-builder',
    icon: PresentationChartLineIcon,
    title: 'Chart Builder',
    text: 'Aktien, Kennzahlen und Jahre vergleichen — alles in einem Chart.',
  },
]

const faqs = [
  {
    q: 'Was ist Finclue?',
    a: `Finclue ist eine deutschsprachige Plattform für Privatanleger. Du siehst, was ${highlights.trackedInvestors} bekannte Investoren wie Warren Buffett oder Bill Ackman kaufen und verkaufen, analysierst Aktien mit Kennzahlen, Bilanzen und Quartalszahlen und verfolgst dein eigenes Depot — alles an einem Ort.`,
  },
  {
    q: 'Was kostet Finclue?',
    a: `Die Basisversion ist dauerhaft kostenlos. Premium kostet ${PREMIUM_MONTHLY_EUR} € im Monat mit ${PREMIUM_TRIAL_DAYS} Tagen kostenlosem Test oder ${PREMIUM_YEARLY_EUR} € im Jahr (${yearlyPerMonth} € pro Monat).`,
  },
  {
    q: 'Woher kommen die Superinvestor-Daten?',
    a: 'Aus den 13F-Meldungen bei der US-Börsenaufsicht SEC. Institutionelle Investoren mit mehr als 100 Mio. US-Dollar in US-Aktien müssen ihre Positionen jedes Quartal offenlegen, spätestens 45 Tage nach Quartalsende. Finclue wertet jede Meldung aus, sobald sie eingereicht ist.',
  },
  {
    q: 'Welche Broker kann ich importieren?',
    a: `${brokerNames.slice(0, -1).join(', ')} und ${brokerNames[brokerNames.length - 1]} — per CSV-, PDF- oder Excel-Export deines Brokers. Dateien anderer Broker erkennt Finclue automatisch, soweit das Format unterstützt wird.`,
  },
  {
    q: 'Ist Finclue eine Anlageberatung?',
    a: 'Nein. Finclue liefert Daten und Werkzeuge für deine eigene Recherche. Kein Inhalt auf Finclue ist eine Empfehlung, Wertpapiere zu kaufen oder zu verkaufen.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

// — Bausteine —

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">{children}</div>
}

type RankedStock = (typeof highlights.mostBought)[number]

function MoveList({ title, items, tone }: { title: string; items: RankedStock[]; tone: 'buy' | 'sell' }) {
  const Icon = tone === 'buy' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
  return (
    <div>
      <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
        <Icon className={`w-4 h-4 ${tone === 'buy' ? 'text-emerald-400' : 'text-red-400'}`} />
        <h3 className="text-sm font-medium text-white">{title}</h3>
      </div>
      <ol className="divide-y divide-neutral-900">
        {items.map(s => (
          <li key={s.ticker}>
            <Link
              href={`/analyse/stocks/${s.ticker}`}
              className="group flex items-center gap-3 py-3.5"
            >
              <Logo ticker={s.ticker} src={logoSrc(s)} alt={s.name} className="w-8 h-8 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white truncate group-hover:underline underline-offset-4 decoration-neutral-600">
                  {shortCompanyName(s.name)}
                </span>
                <span className="block text-xs text-neutral-500">{s.ticker}</span>
              </span>
              <span className="text-sm text-neutral-400 tabular-nums whitespace-nowrap">{s.investorCount} Investoren</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

// — Seite —

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero — bewusst nur: Hinweis, Headline, ein Satz, Suche, drei Wege */}
      <section className="pt-20 lg:pt-28">
        <div className="text-center px-4 sm:px-6 max-w-5xl mx-auto">
          {highlights.reportQuarter && (
            <a
              href="#superinvestoren-live"
              className="inline-flex items-center gap-2 mb-8 text-sm text-neutral-500 hover:text-white transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {highlights.reportedInvestors} neue 13F-Meldungen für {highlights.reportQuarter}
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </a>
          )}

          <h1 className="text-[2.6rem] sm:text-6xl lg:text-7xl font-medium text-white leading-[1.05] tracking-[-0.02em]">
            Sieh, was die Profis kaufen.
            <br />
            <span className="text-neutral-500">Entscheide selbst.</span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed mt-6 text-balance">
            Superinvestoren, Aktienanalyse und dein Depot — an einem Ort.
          </p>

          <div className="mt-10">
            <HeroSearch quickPicks={quickPicks} />
          </div>

          {/* Drei Wege rein — klar benannt statt "Terminal öffnen" */}
          <nav aria-label="Bereiche" className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm">
            {pillars.map(p => (
              <Link
                key={p.href}
                href={p.href}
                className="group inline-flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
              >
                {p.title}
                <ArrowRightIcon className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="relative mt-10 lg:mt-12">
          <Image
            src="/images/hero-terminal.png"
            alt="Aktienanalyse in Finclue am Beispiel Apple"
            width={1920}
            height={1080}
            className="w-full max-w-6xl mx-auto"
            style={{
              maskImage: 'radial-gradient(ellipse 82% 88% at center, black 40%, transparent 92%)',
              WebkitMaskImage: 'radial-gradient(ellipse 82% 88% at center, black 40%, transparent 92%)',
            }}
            priority
          />
        </div>
      </section>

      {/* Live aus der aktuellen 13F-Saison */}
      {highlights.mostBought.length > 0 && (
        <section id="superinvestoren-live" className="scroll-mt-20 py-24 md:py-32 border-t border-neutral-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <Eyebrow>Aktuelle 13F-Saison</Eyebrow>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.05]">
                Was die Superinvestoren in {reportQuarter} gekauft haben.
              </h2>
              <p className="mt-5 text-lg text-neutral-400 leading-relaxed">
                Aus {highlights.reportedInvestors} eingereichten 13F-Meldungen{filingDate ? ` · Stand ${filingDate}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12 mt-14">
              <MoveList title="Am häufigsten gekauft" items={highlights.mostBought.slice(0, 5)} tone="buy" />
              <MoveList title="Am häufigsten verkauft" items={highlights.mostSold.slice(0, 5)} tone="sell" />
              {highlights.biggestNewPositions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                    <SparklesIcon className="w-4 h-4 text-neutral-400" />
                    <h3 className="text-sm font-medium text-white">Größte neue Positionen</h3>
                  </div>
                  <ol className="divide-y divide-neutral-900">
                    {highlights.biggestNewPositions.slice(0, 5).map(p => (
                      <li key={`${p.investor.slug}-${p.ticker}`}>
                        <Link href={`/superinvestor/${p.investor.slug}`} className="group flex items-center gap-3 py-3.5">
                          <Logo ticker={p.ticker} src={logoSrc(p)} alt={p.name} className="w-8 h-8 rounded-lg" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-white truncate group-hover:underline underline-offset-4 decoration-neutral-600">
                              {shortCompanyName(p.name)}
                            </span>
                            <span className="block text-xs text-neutral-500 truncate">{p.investor.name}</span>
                          </span>
                          <span className="text-sm text-neutral-400 tabular-nums whitespace-nowrap">{formatUsdCompact(p.value)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="mt-12">
              <Link
                href="/superinvestor/activity"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-neutral-300 transition-colors"
              >
                Alle Käufe und Verkäufe ansehen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* So funktioniert Finclue */}
      <section className="pt-24 md:pt-32 border-t border-neutral-900">
        <div className="text-center max-w-3xl mx-auto px-4 sm:px-6">
          <Eyebrow>So funktioniert Finclue</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.05]">
            Von der Idee bis ins Depot.
          </h2>
          <p className="mt-5 text-lg md:text-xl text-neutral-400">
            Drei Schritte, ein Werkzeug — statt fünf Tabs, drei Apps und einer Excel-Tabelle.
          </p>
        </div>
      </section>
      <LandingFeatureShowcase
        image="/features/superinvestoren.png"
        alt="Superinvestor-Portfolios in Finclue"
        eyebrow="01 · Idee finden"
        headline="Lass dich von den Besten inspirieren."
        subline={`Buffett, Ackman, Burry und ${highlights.trackedInvestors - 3} weitere Investoren — jede Portfolio-Änderung aus den offiziellen SEC-Meldungen, verständlich auf Deutsch.`}
        linkHref="/superinvestor"
        linkLabel="Superinvestoren entdecken"
        layout="left"
      />
      <LandingFeatureShowcase
        image="/features/kennzahlen.png"
        alt="Kennzahlen-Dashboard in Finclue"
        eyebrow="02 · Selbst prüfen"
        headline="Prüf jede Idee, bevor du kaufst."
        subline="Über 20 Jahre Bilanzen, 60+ Kennzahlen und Quartalszahlen mit KI-Zusammenfassung — klar visualisiert statt Tabellenchaos."
        linkHref="/analyse"
        linkLabel="Aktienanalyse öffnen"
        layout="right"
      />
      <LandingFeatureShowcase
        image="/features/hero-portfolio.png"
        alt="Depot-Übersicht in Finclue"
        eyebrow="03 · Im Blick behalten"
        headline="Dein Depot, endlich mit Klarheit."
        subline={`Importiere dein Depot von ${brokerNames.slice(0, 3).join(', ')} & Co. — mit echter Performance, Dividenden und dem Abgleich, welche Superinvestoren deine Aktien halten.`}
        linkHref="/analyse/portfolio"
        linkLabel="Depot anlegen"
        layout="left"
      />

      {/* Weitere Features */}
      <section className="py-24 md:py-32 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Eyebrow>Noch mehr Signale</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.05]">
              Und das ist erst der Anfang.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {moreFeatures.map(f => (
              <Link
                key={f.title}
                href={f.href}
                className="group bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-neutral-300" />
                </div>
                <h3 className="flex items-center gap-1 text-white font-semibold mb-2">
                  {f.title}
                  <ArrowRightIcon className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white transition-colors" />
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.text}</p>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg transition-all hover:bg-neutral-100 text-base"
            >
              Alle Features im Detail
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Preise */}
      <section className="py-24 md:py-32 border-t border-neutral-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <Eyebrow>Preise</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.05]">
              Kostenlos starten.
              <br />
              <span className="text-neutral-400">Upgraden, wenn du mehr willst.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-white">Free</h3>
              <p className="text-sm text-neutral-500 mt-1">Für immer kostenlos</p>
              <div className="mt-6 text-4xl font-semibold text-white">0 €</div>
              <ul className="mt-8 space-y-3 flex-1">
                {freeFeatures.map(f => (
                  <li key={f.name} className="flex items-start gap-3 text-sm text-neutral-300">
                    <CheckIcon className="w-4 h-4 mt-0.5 text-neutral-500 shrink-0" />
                    {f.name}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="mt-8 w-full text-center py-3 rounded-xl bg-white text-black font-medium hover:bg-neutral-100 transition-colors"
              >
                Kostenlos registrieren
              </Link>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-700 rounded-2xl p-6 sm:p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-white">Premium</h3>
              <p className="text-sm text-neutral-500 mt-1">Alles aus Free, plus:</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-white">{yearlyPerMonth} €</span>
                <span className="text-neutral-500">/ Monat</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                bei {PREMIUM_YEARLY_EUR} € im Jahr · oder {PREMIUM_MONTHLY_EUR} € monatlich
              </p>
              <ul className="mt-8 space-y-3 flex-1">
                {premiumHighlights.map(f => (
                  <li key={f.name} className="flex items-start gap-3 text-sm text-neutral-300">
                    <CheckIcon className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                    {f.name}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-8 w-full text-center py-3 rounded-xl border border-neutral-700 text-white font-medium hover:bg-neutral-800 transition-colors"
              >
                {PREMIUM_TRIAL_DAYS} Tage kostenlos testen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 md:py-32 border-t border-neutral-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Eyebrow>Häufige Fragen</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.05]">
              Gut zu wissen.
            </h2>
          </div>
          <div className="divide-y divide-neutral-800 border-y border-neutral-800">
            {faqs.map(f => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-white font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-neutral-500 text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-neutral-400 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            <div className="lg:col-span-3">
              <Eyebrow>Newsletter</Eyebrow>
              <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
                Was die Profis kaufen
                <span className="block text-neutral-400">direkt in dein Postfach.</span>
              </h2>
              <p className="text-lg text-neutral-400 leading-relaxed mb-8">
                Zu jeder 13F-Saison: die wichtigsten Käufe und Verkäufe der Superinvestoren, eingeordnet auf Deutsch —
                plus neue Funktionen von Finclue.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {['13F-Updates jedes Quartal', 'Kein Spam, jederzeit abbestellbar', 'Marktanalysen', 'Neue Funktionen zuerst'].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckIcon className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="text-neutral-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 sm:p-8">
                <NewsletterSignup />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
