// Depot-Landingpage (Server): stellt den Portfolio-Tracker vor und zeigt eine
// echte Beispielanalyse am 13F-Portfolio von Warren Buffett – gerechnet mit
// denselben Funktionen wie im Depot (lib/depotShowcase).

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import MonteCarloFanChart from '@/components/depot/MonteCarloFanChart'
import { IMPORT_BROKERS } from '@/lib/importBrokerConfig'
import { PREMIUM_MONTHLY_EUR, PREMIUM_TRIAL_DAYS, PREMIUM_YEARLY_EUR } from '@/lib/pricing'
import { formatIsoDate, joinGerman } from '@/lib/displayFormat'
import { buildDepotShowcase, SHOWCASE_START_VALUE, type DepotShowcase } from '@/lib/depotShowcase'

export const revalidate = 86400

const DEPOT_HREF = '/analyse/portfolio'
const brokers = IMPORT_BROKERS.filter(b => b.id !== 'other').map(b => b.name)

const TITLE = 'Depot-Tracker mit Risikoanalyse: Monte Carlo, Stresstest & Faktoren'
const DESCRIPTION = `Importiere dein Depot von ${brokers.slice(0, 3).join(', ')} & Co. und analysiere es wie ein Profi: echte Rendite, ETF-Durchblick, Sharpe Ratio, Max Drawdown, Monte-Carlo-Simulation und Stresstests.`

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/depot' },
  openGraph: {
    type: 'website',
    siteName: 'Finclue',
    locale: 'de_DE',
    url: '/depot',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/features/hero-portfolio.png', width: 1920, height: 1200, alt: 'Depot-Übersicht in Finclue' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

// — Formatierung —

const pct = (value: number, digits = 1) => `${value.toLocaleString('de-DE', { maximumFractionDigits: digits })} %`
const signedPct = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${pct(Math.abs(value))}`
const usd = (value: number) => `${Math.round(value).toLocaleString('de-DE')} $`
const num = (value: number | null) => (value === null ? '–' : value.toLocaleString('de-DE', { maximumFractionDigits: 2 }))

// — Inhalte —

const BASICS = [
  {
    title: 'Import in Minuten',
    text: `Datei aus deinem Broker exportieren und hochladen – ${joinGerman(brokers)} werden direkt erkannt. Zugangsdaten zum Broker brauchst du nicht. Käufe und Verkäufe lassen sich auch von Hand erfassen.`,
  },
  {
    title: 'Ehrliche Rendite',
    text: 'Zeitgewichtete Rendite, die Ein- und Auszahlungen herausrechnet, im Vergleich mit S&P 500 und FTSE All-World – inklusive Aufschlüsselung, wie viel davon Kurs und wie viel Währungseffekt ist.',
  },
  {
    title: 'Durchblick',
    text: 'Deine ETFs in Einzelaktien zerlegt: Wo überschneiden sich deine Fonds, wie groß ist dein echtes Exposure zu Apple, Nvidia & Co. – und welche Superinvestoren halten dieselben Aktien wie du?',
  },
  {
    title: 'Dividenden & Historie',
    text: 'Alle Dividendenzahlungen, die komplette Transaktions-Historie und eine KI-Analyse, die dir in Klartext erklärt, wie dein Depot aufgestellt ist.',
  },
]

const PRO = [
  {
    title: 'Risiko-Kennzahlen',
    text: 'Volatilität, Sharpe und Sortino Ratio, Max Drawdown samt Erholungsdauer und Beta – direkt neben S&P 500 und FTSE All-World, damit die Zahlen eine Einordnung haben.',
  },
  {
    title: 'Monte-Carlo-Simulation',
    text: '1.000 mögliche Verläufe deines Depots über 10 Jahre, gezogen aus deinen eigenen historischen Tagesrenditen. Ergebnis: eine realistische Spanne statt einer Wunschzahl – und wie wahrscheinlich ein Verlust ist.',
  },
  {
    title: 'Stresstests',
    text: 'Wie hätte dein heutiges Depot die Finanzkrise 2008/09, den Corona-Crash 2020 und den Zinsschock 2022 überstanden? Gerechnet mit den echten Kursen deiner Positionen in diesen Phasen.',
  },
  {
    title: 'Korrelation & Faktoren',
    text: 'Eine Korrelationsmatrix zeigt, welche Positionen sich gegenseitig absichern und welche im Gleichschritt fallen. Die Fama-French-Faktoranalyse zeigt, wie stark dein Depot an Markt, Größe, Value und Qualität hängt.',
  },
]

const FREE_FEATURES = [
  'Depots anlegen und per Datei oder von Hand füllen',
  'Überblick über Wert, Gewinn/Verlust und Aufteilung',
  'Kurzhinweise aus dem Durchblick',
]

const PREMIUM_FEATURES = [
  'Durchblick: ETF-Zerlegung, Überschneidungen, echtes Exposure',
  'Risiko-Kennzahlen: Sharpe, Sortino, Max Drawdown, Beta',
  'Monte Carlo, Stresstests, Korrelation und Faktoranalyse',
  'Superinvestor-Abgleich mit deinem Depot',
  'Dividenden-Übersicht und Transaktions-Historie',
  'KI-Portfolio-Analyse',
]

const FAQ = [
  {
    q: 'Ist der Depot-Tracker kostenlos?',
    a: `Ja, Depots anlegen, importieren und den Überblick über Wert und Aufteilung nutzen kannst du kostenlos. Die Profi-Analysen – Risiko-Kennzahlen, Monte Carlo, Stresstests, Faktoranalyse und der vollständige Durchblick – gehören zu Premium für ${PREMIUM_MONTHLY_EUR} € im Monat oder ${PREMIUM_YEARLY_EUR} € im Jahr, ${PREMIUM_TRIAL_DAYS} Tage kostenlos testbar.`,
  },
  {
    q: 'Welche Broker kann ich importieren?',
    a: `${joinGerman(brokers)}. Du exportierst eine Datei (je nach Broker CSV, PDF oder Excel) und lädst sie hoch. Für andere Broker gibt es einen allgemeinen Import, außerdem kannst du Transaktionen von Hand erfassen.`,
  },
  {
    q: 'Brauche ich meine Zugangsdaten zum Broker?',
    a: 'Nein. Der Import läuft über Dateien, die du selbst aus deinem Broker exportierst. Finclue bekommt keinen Zugriff auf dein Konto und kann nichts handeln.',
  },
  {
    q: 'Was sagt eine Monte-Carlo-Simulation aus?',
    a: 'Sie zieht viele zufällige Verläufe aus den bisherigen Tagesrenditen deines Depots und zeigt, in welcher Spanne der Wert in einigen Jahren liegen könnte – samt Verlustwahrscheinlichkeit. Das ist keine Prognose, sondern eine Einordnung: So stark schwankt ein Depot mit deiner bisherigen Rendite- und Risikostruktur.',
  },
  {
    q: 'Was ist der Unterschied zu anderen Depot-Trackern?',
    a: 'Neben Performance und Dividenden bekommst du Analysen, die sonst eher Vermögensverwalter nutzen – Stresstests mit echten Krisenkursen, Faktoranalyse und Monte Carlo – und den Abgleich mit den Portfolios von über 100 Superinvestoren.',
  },
]

// — Bausteine —

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-neutral-500">{eyebrow}</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-white text-balance">{title}</h2>
      {text && <p className="mt-4 text-neutral-400 leading-relaxed">{text}</p>}
    </div>
  )
}

function FeatureGrid({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-900 border border-neutral-900 rounded-2xl overflow-hidden">
      {items.map(item => (
        <div key={item.title} className="bg-neutral-950 p-6 md:p-8">
          <h3 className="text-base font-medium text-white">{item.title}</h3>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{item.text}</p>
        </div>
      ))}
    </div>
  )
}

function Kpi({ label, value, compare }: { label: string; value: string; compare?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-white tabular-nums">{value}</dd>
      {compare && <dd className="text-xs text-neutral-500 tabular-nums">{compare}</dd>}
    </div>
  )
}

function Showcase({ s }: { s: DepotShowcase }) {
  const r = s.risk
  const b = s.benchmarkRisk
  const mc = s.monteCarlo
  const last = mc?.bands[mc.bands.length - 1]
  const from = formatIsoDate(s.windowFrom)
  const to = formatIsoDate(s.windowTo)

  return (
    <section id="beispiel" className="py-24 md:py-32 border-t border-neutral-900 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader
          eyebrow="Live-Beispiel"
          title={`So sieht die Analyse aus – am Portfolio von ${s.investorName}.`}
          text={`Als Musterdepot dienen die zehn größten Positionen aus dem 13F-Filing für ${s.periodLabel} (${pct(s.coveragePct, 0)} des gemeldeten Portfolios). Alle Zahlen sind mit denselben Funktionen gerechnet wie dein eigenes Depot in Finclue.`}
        />

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Musterdepot */}
          <div className="rounded-2xl border border-neutral-900 p-6">
            <h3 className="text-sm font-medium text-white">Musterdepot</h3>
            <ul className="mt-4 space-y-2.5">
              {s.holdings.map(h => (
                <li key={h.ticker} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/aktie/${h.ticker.toLowerCase()}`} className="min-w-0 truncate text-neutral-300 hover:text-white">
                      {h.name} <span className="text-neutral-600">{h.ticker}</span>
                    </Link>
                    <span className="tabular-nums text-neutral-400">{pct(h.weightPct)}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-neutral-900">
                    <div className="h-1 rounded-full bg-emerald-400/60" style={{ width: `${Math.min(100, h.weightPct * 2.5)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/superinvestor/buffett" className="mt-5 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-white">
              Komplettes Portfolio ansehen <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {/* Risiko-Kennzahlen */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-900 p-6">
            <h3 className="text-sm font-medium text-white">Risiko-Kennzahlen</h3>
            <p className="mt-1 text-xs text-neutral-500">
              {from} – {to}, in Klammern der S&P 500 im selben Zeitraum
            </p>
            {r ? (
              <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6">
                <Kpi label="Rendite p. a." value={pct(r.annualizedReturnPct)} compare={b ? `(${pct(b.annualizedReturnPct)})` : undefined} />
                <Kpi label="Volatilität p. a." value={pct(r.volatilityPct)} compare={b ? `(${pct(b.volatilityPct)})` : undefined} />
                <Kpi label="Sharpe Ratio" value={num(r.sharpe)} compare={b ? `(${num(b.sharpe)})` : undefined} />
                <Kpi label="Sortino Ratio" value={num(r.sortino)} compare={b ? `(${num(b.sortino)})` : undefined} />
                <Kpi
                  label="Max Drawdown"
                  value={signedPct(r.maxDrawdownPct)}
                  compare={b ? `(${signedPct(b.maxDrawdownPct)})` : undefined}
                />
                <Kpi label="Beta zum S&P 500" value={num(r.beta)} />
              </dl>
            ) : (
              <p className="mt-6 text-sm text-neutral-500">Für diesen Zeitraum liegen zu wenige Kursdaten vor.</p>
            )}
          </div>

          {/* Monte Carlo */}
          {mc && last && (
            <div className="lg:col-span-2 rounded-2xl border border-neutral-900 p-6">
              <h3 className="text-sm font-medium text-white">Monte-Carlo-Projektion über 10 Jahre</h3>
              <p className="mt-1 text-xs text-neutral-500">
                {mc.paths.toLocaleString('de-DE')} Verläufe aus {mc.basedOnDays.toLocaleString('de-DE')} historischen Handelstagen, Start
                mit {usd(SHOWCASE_START_VALUE)}. Dunkles Band: mittlere 50 %, helles Band: 90 % der Verläufe.
              </p>
              <div className="mt-4">
                <MonteCarloFanChart bands={mc.bands} startValue={SHOWCASE_START_VALUE} />
              </div>
            </div>
          )}
          {mc && last && (
            <div className="rounded-2xl border border-neutral-900 p-6">
              <h3 className="text-sm font-medium text-white">Nach 10 Jahren</h3>
              <dl className="mt-4 space-y-4">
                <Kpi label="Ungünstig (5 % der Verläufe darunter)" value={usd(last.p5)} />
                <Kpi label="Mittlerer Verlauf" value={usd(last.p50)} />
                <Kpi label="Günstig (5 % der Verläufe darüber)" value={usd(last.p95)} />
              </dl>
              <h4 className="mt-6 text-xs text-neutral-500">Wahrscheinlichkeit, unter dem Startwert zu liegen</h4>
              <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ['1 J.', mc.lossProbabilityPct.y1],
                    ['3 J.', mc.lossProbabilityPct.y3],
                    ['5 J.', mc.lossProbabilityPct.y5],
                    ['10 J.', mc.lossProbabilityPct.y10],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-neutral-900/60 py-2">
                    <dt className="text-[11px] text-neutral-500">{label}</dt>
                    <dd className="text-sm font-medium text-white tabular-nums">{pct(value, 0)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Stresstests */}
          {s.stressTests.length > 0 && (
            <div className="lg:col-span-3 rounded-2xl border border-neutral-900 p-6">
              <h3 className="text-sm font-medium text-white">Stresstests: das heutige Musterdepot in vergangenen Krisen</h3>
              <div className="mt-4 -mx-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500 border-b border-neutral-900">
                      <th scope="col" className="px-2 py-2 font-normal">Szenario</th>
                      <th scope="col" className="px-2 py-2 font-normal text-right whitespace-nowrap">S&P 500</th>
                      <th scope="col" className="px-2 py-2 font-normal text-right whitespace-nowrap">Musterdepot</th>
                      <th scope="col" className="px-2 py-2 font-normal text-right whitespace-nowrap hidden sm:table-cell">
                        Bei {usd(SHOWCASE_START_VALUE)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {s.stressTests.map(t => (
                      <tr key={t.key}>
                        <td className="px-2 py-3">
                          <span className="block text-white">{t.label}</span>
                          <span className="block text-xs text-neutral-500">{t.description}</span>
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap text-neutral-400">{signedPct(t.marketReturnPct)}</td>
                        <td
                          className={`px-2 py-3 text-right tabular-nums whitespace-nowrap font-medium ${
                            t.portfolioReturnPct < t.marketReturnPct ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {signedPct(t.portfolioReturnPct)}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap text-neutral-400 hidden sm:table-cell">
                          {t.portfolioImpactEur > 0 ? '+' : '−'}
                          {usd(Math.abs(t.portfolioImpactEur))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-neutral-600 max-w-3xl leading-relaxed">
          Methodik: Gewichte aus dem 13F-Filing vom {formatIsoDate(s.filingDate)}, täglich konstant gehalten; Schlusskurse in USD ohne
          Dividenden; Sharpe Ratio mit kurzlaufenden US-Staatsanleihen als risikofreiem Zins. Stresstests rechnen die heutige
          Zusammensetzung mit den echten Kursen der jeweiligen Krisenphase. Vergangene Entwicklungen sind kein verlässlicher Indikator
          für die Zukunft – keine Anlageberatung.
        </p>
      </div>
    </section>
  )
}

// — Seite —

export default async function DepotLandingPage() {
  const showcase = await buildDepotShowcase()

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div className="bg-neutral-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <section className="pt-16 md:pt-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-neutral-500">Finclue Depot</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight text-balance">
            Dein Depot.
            <span className="block text-neutral-500">Analysiert wie von Profis.</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed mt-6 text-balance">
            Importiere dein Depot und sieh, was wirklich drinsteckt – mit echter Rendite, ETF-Durchblick und Risiko-Analysen, die
            sonst Vermögensverwalter nutzen: Monte Carlo, Stresstests und Faktoranalyse.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={DEPOT_HREF}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg transition-colors hover:bg-neutral-100"
            >
              Depot kostenlos anlegen
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            {showcase && (
              <a href="#beispiel" className="px-6 py-3 text-neutral-300 hover:text-white transition-colors">
                Beispielanalyse ansehen
              </a>
            )}
          </div>
          <p className="mt-6 text-sm text-neutral-500">Import von {joinGerman(brokers)}</p>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-12 lg:mt-16">
          <Image
            src="/features/hero-portfolio.png"
            alt="Depot-Übersicht in Finclue"
            width={1920}
            height={1200}
            priority
            className="w-full h-auto"
            style={{
              maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            }}
          />
        </div>
      </section>

      {/* Grundlagen */}
      <section className="py-24 md:py-32 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            eyebrow="Das Fundament"
            title="Alles, was ein guter Depot-Tracker können muss."
            text="Ein Ort für alle Depots – mit Zahlen, denen du trauen kannst."
          />
          <FeatureGrid items={BASICS} />
        </div>
      </section>

      {/* Profi-Analysen */}
      <section className="py-24 md:py-32 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader
            eyebrow="Profi-Analysen"
            title="Nicht nur wie viel du verdienst – sondern wie viel Risiko du dafür trägst."
            text="Die meisten Depot-Apps zeigen dir die Rendite. Finclue zeigt dir zusätzlich, wie robust dein Depot ist und was in der nächsten Krise passieren könnte."
          />
          <FeatureGrid items={PRO} />
        </div>
      </section>

      {showcase && <Showcase s={showcase} />}

      {/* Free vs. Premium */}
      <section className="py-24 md:py-32 border-t border-neutral-900">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader eyebrow="Preise" title="Kostenlos starten, Profi-Analysen mit Premium." />
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-neutral-900 p-6 md:p-8">
              <h3 className="text-lg font-medium">Free</h3>
              <p className="mt-1 text-sm text-neutral-500">0 €</p>
              <ul className="mt-6 space-y-3">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex gap-3 text-sm text-neutral-300">
                    <CheckIcon className="w-4 h-4 mt-0.5 shrink-0 text-neutral-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-neutral-700 p-6 md:p-8">
              <h3 className="text-lg font-medium">Premium</h3>
              <p className="mt-1 text-sm text-neutral-500">
                {PREMIUM_MONTHLY_EUR} € / Monat oder {PREMIUM_YEARLY_EUR} € / Jahr · {PREMIUM_TRIAL_DAYS} Tage kostenlos testen
              </p>
              <ul className="mt-6 space-y-3">
                {PREMIUM_FEATURES.map(f => (
                  <li key={f} className="flex gap-3 text-sm text-neutral-300">
                    <CheckIcon className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="mt-6 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white">
                Alle Premium-Funktionen <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 md:py-32 border-t border-neutral-900">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Häufige Fragen</h2>
          <div className="mt-10 divide-y divide-neutral-900 border-y border-neutral-900">
            {FAQ.map(f => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-white">
                  {f.q}
                  <span className="text-neutral-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Abschluss */}
      <section className="py-24 md:py-32 border-t border-neutral-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">Wie robust ist dein Depot?</h2>
          <p className="mt-4 text-neutral-400">Leg dein Depot an und finde es heraus – der Start ist kostenlos.</p>
          <Link
            href={DEPOT_HREF}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg transition-colors hover:bg-neutral-100"
          >
            Depot kostenlos anlegen
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
