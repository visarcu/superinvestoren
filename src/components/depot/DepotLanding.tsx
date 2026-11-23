// Inhalt der Depot-Landingpage (Server), genutzt von finclue.de/depot und als
// Startseite von depot.finclue.de für Abgemeldete. Stellt den Portfolio-Tracker vor und zeigt eine
// echte Beispielanalyse am 13F-Portfolio von Warren Buffett, gerechnet mit
// denselben Funktionen wie im Depot (lib/depotShowcase). Gleiches Design wie
// die Startseite: warmes Fast-Schwarz, helle Abschnitte, echte Daten statt Bilder.

import Link from 'next/link'
import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import DepotCta from '@/components/depot/DepotCta'
import MonteCarloFanChart from '@/components/depot/MonteCarloFanChart'
import QuarterMark from '@/components/landing/QuarterMark'
import { DISPLAY, MONO, landingFontVars } from '@/components/landing/landingFonts'
import { WORKSPACE_PATH } from '@/lib/depotRoutes'
import { IMPORT_BROKERS } from '@/lib/importBrokerConfig'
import { PREMIUM_MONTHLY_EUR, PREMIUM_TRIAL_DAYS, PREMIUM_YEARLY_EUR } from '@/lib/pricing'
import { formatIsoDate, formatSignedPercent, joinGerman } from '@/lib/displayFormat'
import { buildDepotShowcase, SHOWCASE_START_VALUE, type DepotShowcase } from '@/lib/depotShowcase'

const SIGNUP_HREF = `/auth/signup?redirect=${encodeURIComponent(WORKSPACE_PATH)}`
const brokers = IMPORT_BROKERS.filter(b => b.id !== 'other').map(b => b.name)


// — Formatierung —

const pct = (value: number, digits = 1) => `${value.toLocaleString('de-DE', { maximumFractionDigits: digits })} %`
const usd = (value: number) => `${Math.round(value).toLocaleString('de-DE')} $`
const num = (value: number | null) => (value === null ? '–' : value.toLocaleString('de-DE', { maximumFractionDigits: 2 }))

// — Inhalte —

const BASICS = [
  {
    title: 'Import in Minuten',
    text: `Datei aus deinem Broker exportieren und hochladen. ${joinGerman(brokers)} werden direkt erkannt. Zugangsdaten zum Broker brauchst du nicht, Käufe und Verkäufe lassen sich auch von Hand erfassen.`,
  },
  {
    title: 'Ehrliche Rendite',
    text: 'Zeitgewichtete Rendite, die Ein- und Auszahlungen herausrechnet. Im Vergleich mit S&P 500 und FTSE All-World und aufgeschlüsselt, wie viel davon Kurs und wie viel Währungseffekt ist.',
  },
  {
    title: 'Durchblick',
    text: 'Deine ETFs in Einzelaktien zerlegt: Wo überschneiden sich deine Fonds, wie groß ist dein echtes Exposure zu Apple oder Nvidia, und welche Superinvestoren halten dieselben Aktien wie du?',
  },
  {
    title: 'Dividenden und Historie',
    text: 'Alle Dividendenzahlungen, die komplette Transaktions-Historie und eine KI-Analyse, die dir in Klartext erklärt, wie dein Depot aufgestellt ist.',
  },
]

const PRO = [
  {
    title: 'Risiko-Kennzahlen',
    text: 'Volatilität, Sharpe und Sortino Ratio, Max Drawdown samt Erholungsdauer und Beta. Direkt neben S&P 500 und FTSE All-World, damit die Zahlen eine Einordnung haben.',
  },
  {
    title: 'Monte-Carlo-Simulation',
    text: '1.000 mögliche Verläufe deines Depots über 10 Jahre, gezogen aus deinen eigenen historischen Tagesrenditen. Eine realistische Spanne statt einer Wunschzahl, und wie wahrscheinlich ein Verlust ist.',
  },
  {
    title: 'Stresstests',
    text: 'Wie hätte dein heutiges Depot die Finanzkrise 2008/09, den Corona-Crash 2020 und den Zinsschock 2022 überstanden? Gerechnet mit den echten Kursen deiner Positionen in diesen Phasen.',
  },
  {
    title: 'Korrelation und Faktoren',
    text: 'Welche Positionen sich gegenseitig absichern und welche im Gleichschritt fallen. Dazu die Fama-French-Faktoranalyse: Wie stark hängt dein Depot an Markt, Größe, Value und Qualität?',
  },
]

const FREE_FEATURES = [
  'Depots anlegen und per Datei oder von Hand füllen',
  'Überblick über Wert, Gewinn und Verlust und Aufteilung',
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
    a: `Ja. Depots anlegen, importieren und den Überblick über Wert und Aufteilung nutzen kannst du kostenlos. Die Profi-Analysen (Risiko-Kennzahlen, Monte Carlo, Stresstests, Faktoranalyse und der vollständige Durchblick) gehören zu Premium für ${PREMIUM_MONTHLY_EUR} € im Monat oder ${PREMIUM_YEARLY_EUR} € im Jahr, ${PREMIUM_TRIAL_DAYS} Tage kostenlos testbar.`,
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
    a: 'Sie zieht viele zufällige Verläufe aus den bisherigen Tagesrenditen deines Depots und zeigt, in welcher Spanne der Wert in einigen Jahren liegen könnte, samt Verlustwahrscheinlichkeit. Das ist keine Prognose, sondern eine Einordnung: So stark schwankt ein Depot mit deiner bisherigen Rendite- und Risikostruktur.',
  },
  {
    q: 'Was ist der Unterschied zu anderen Depot-Trackern?',
    a: 'Neben Performance und Dividenden bekommst du Analysen, die sonst eher Vermögensverwalter nutzen: Stresstests mit echten Krisenkursen, Faktoranalyse und Monte Carlo. Dazu den Abgleich mit den Portfolios von über 100 Superinvestoren.',
  },
]

const card = 'rounded-2xl bg-[#161814] text-[#ECEDE8] shadow-[0_24px_48px_-24px_rgba(17,18,16,0.45)]'

// — Bausteine —

function SectionHead({ mark, label, title, text, light = false }: { mark: number; label: string; title: string; text?: string; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      <div className={`flex items-center gap-3 text-[15px] ${light ? 'text-[#4B4D46]' : 'text-[#9A9C94]'}`}>
        <QuarterMark filled={mark} size={22} light={light} />
        {label}
      </div>
      <h2
        className={`mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] ${light ? 'text-[#111210]' : 'text-[#ECEDE8]'}`}
        style={DISPLAY}
      >
        {title}
      </h2>
      {text && <p className={`mt-4 text-lg leading-relaxed ${light ? 'text-[#4B4D46]' : 'text-[#B4B6AE]'}`}>{text}</p>}
    </div>
  )
}

function FeatureGrid({ items, light = false }: { items: { title: string; text: string }[]; light?: boolean }) {
  return (
    <div
      className={`mt-12 grid grid-cols-1 md:grid-cols-2 gap-px rounded-2xl overflow-hidden border ${
        light ? 'bg-[#D9DBD2] border-[#D9DBD2]' : 'bg-[#1F211D] border-[#1F211D]'
      }`}
    >
      {items.map(item => (
        <div key={item.title} className={`p-6 md:p-8 ${light ? 'bg-[#F6F7F2]' : 'bg-[#0D0E0C]'}`}>
          <h3 className={`text-lg font-semibold ${light ? 'text-[#111210]' : 'text-[#ECEDE8]'}`} style={DISPLAY}>
            {item.title}
          </h3>
          <p className={`mt-2 text-[15px] leading-relaxed ${light ? 'text-[#3A3C36]' : 'text-[#B4B6AE]'}`}>{item.text}</p>
        </div>
      ))}
    </div>
  )
}

function Kpi({ label, value, compare }: { label: string; value: string; compare?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[#9A9C94]">{label}</dt>
      <dd className="mt-1 text-xl tabular-nums" style={MONO}>
        {value}
      </dd>
      {compare && (
        <dd className="text-xs text-[#9A9C94] tabular-nums" style={MONO}>
          {compare}
        </dd>
      )}
    </div>
  )
}

function Showcase({ s, siteHref }: { s: DepotShowcase; siteHref: (path: string) => string }) {
  const r = s.risk
  const b = s.benchmarkRisk
  const mc = s.monteCarlo
  const last = mc?.bands[mc.bands.length - 1]

  return (
    <section id="beispiel" aria-labelledby="beispiel-titel" className="bg-[#EDEEE8] text-[#111210] scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-28">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 text-[15px] text-[#4B4D46]">
            <QuarterMark filled={3} size={22} light />
            Live-Beispiel
          </div>
          <h2 id="beispiel-titel" className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] text-[#111210]" style={DISPLAY}>
            So sieht die Analyse aus, am Portfolio von {s.investorName}.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#4B4D46]">
            Als Musterdepot dienen die zehn größten Positionen aus dem 13F-Filing für {s.periodLabel} ({pct(s.coveragePct, 0)} des gemeldeten
            Portfolios). Alle Zahlen sind mit denselben Funktionen gerechnet wie dein eigenes Depot in Finclue.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className={`${card} p-6`}>
            <h3 className="text-sm font-medium text-[#ECEDE8]">Musterdepot</h3>
            <ul className="mt-4 space-y-2.5">
              {s.holdings.map(h => (
                <li key={h.ticker} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={siteHref(`/aktie/${h.ticker.toLowerCase()}`)} className="min-w-0 truncate text-[#C9CBC3] hover:text-white">
                      {h.name}{' '}
                      <span className="text-[#6E7168]" style={MONO}>
                        {h.ticker}
                      </span>
                    </Link>
                    <span className="tabular-nums text-[#9A9C94]" style={MONO}>
                      {pct(h.weightPct)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-[#23261F]">
                    <div className="h-1 rounded-full bg-[#ECEDE8]" style={{ width: `${Math.min(100, h.weightPct * 2.5)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <Link href={siteHref('/superinvestor/buffett')} className="mt-5 inline-flex items-center gap-1 text-xs text-[#9A9C94] hover:text-white">
              Komplettes Portfolio ansehen <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          <div className={`${card} p-6 lg:col-span-2`}>
            <h3 className="text-sm font-medium text-[#ECEDE8]">Risiko-Kennzahlen</h3>
            <p className="mt-1 text-xs text-[#9A9C94]">
              {formatIsoDate(s.windowFrom)} bis {formatIsoDate(s.windowTo)}, in Klammern der S&amp;P 500 im selben Zeitraum
            </p>
            {r ? (
              <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6">
                <Kpi label="Rendite p. a." value={pct(r.annualizedReturnPct)} compare={b ? `(${pct(b.annualizedReturnPct)})` : undefined} />
                <Kpi label="Volatilität p. a." value={pct(r.volatilityPct)} compare={b ? `(${pct(b.volatilityPct)})` : undefined} />
                <Kpi label="Sharpe Ratio" value={num(r.sharpe)} compare={b ? `(${num(b.sharpe)})` : undefined} />
                <Kpi label="Sortino Ratio" value={num(r.sortino)} compare={b ? `(${num(b.sortino)})` : undefined} />
                <Kpi label="Max Drawdown" value={formatSignedPercent(r.maxDrawdownPct)} compare={b ? `(${formatSignedPercent(b.maxDrawdownPct)})` : undefined} />
                <Kpi label="Beta zum S&P 500" value={num(r.beta)} />
              </dl>
            ) : (
              <p className="mt-6 text-sm text-[#9A9C94]">Für diesen Zeitraum liegen zu wenige Kursdaten vor.</p>
            )}
          </div>

          {mc && last && (
            <div className={`${card} p-6 lg:col-span-2`}>
              <h3 className="text-sm font-medium text-[#ECEDE8]">Monte-Carlo-Projektion über 10 Jahre</h3>
              <p className="mt-1 text-xs text-[#9A9C94]">
                {mc.paths.toLocaleString('de-DE')} Verläufe aus {mc.basedOnDays.toLocaleString('de-DE')} historischen Handelstagen, Start mit{' '}
                {usd(SHOWCASE_START_VALUE)}. Dunkles Band: mittlere 50 %, helles Band: 90 % der Verläufe.
              </p>
              <div className="mt-4">
                <MonteCarloFanChart bands={mc.bands} startValue={SHOWCASE_START_VALUE} />
              </div>
            </div>
          )}
          {mc && last && (
            <div className={`${card} p-6`}>
              <h3 className="text-sm font-medium text-[#ECEDE8]">Nach 10 Jahren</h3>
              <dl className="mt-4 space-y-4">
                <Kpi label="Ungünstig (5 % der Verläufe darunter)" value={usd(last.p5)} />
                <Kpi label="Mittlerer Verlauf" value={usd(last.p50)} />
                <Kpi label="Günstig (5 % der Verläufe darüber)" value={usd(last.p95)} />
              </dl>
              <h4 className="mt-6 text-xs text-[#9A9C94]">Wahrscheinlichkeit, unter dem Startwert zu liegen</h4>
              <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ['1 J.', mc.lossProbabilityPct.y1],
                    ['3 J.', mc.lossProbabilityPct.y3],
                    ['5 J.', mc.lossProbabilityPct.y5],
                    ['10 J.', mc.lossProbabilityPct.y10],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-[#23261F] py-2">
                    <dt className="text-[11px] text-[#9A9C94]">{label}</dt>
                    <dd className="text-sm tabular-nums" style={MONO}>
                      {pct(value, 0)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {s.stressTests.length > 0 && (
            <div className={`${card} p-6 lg:col-span-3`}>
              <h3 className="text-sm font-medium text-[#ECEDE8]">Stresstests: das heutige Musterdepot in vergangenen Krisen</h3>
              <div className="mt-4 -mx-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[#9A9C94] border-b border-[#23261F]">
                      <th scope="col" className="px-2 py-2 font-normal">
                        Szenario
                      </th>
                      <th scope="col" className="px-2 py-2 font-normal text-right whitespace-nowrap">
                        S&amp;P 500
                      </th>
                      <th scope="col" className="px-2 py-2 font-normal text-right whitespace-nowrap">
                        Musterdepot
                      </th>
                      <th scope="col" className="px-2 py-2 font-normal text-right whitespace-nowrap hidden sm:table-cell">
                        Bei {usd(SHOWCASE_START_VALUE)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23261F]">
                    {s.stressTests.map(t => (
                      <tr key={t.key}>
                        <td className="px-2 py-3">
                          <span className="block text-[#ECEDE8]">{t.label}</span>
                          <span className="block text-xs text-[#9A9C94]">{t.description}</span>
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap text-[#9A9C94]" style={MONO}>
                          {formatSignedPercent(t.marketReturnPct)}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap text-[#ECEDE8]" style={MONO}>
                          {formatSignedPercent(t.portfolioReturnPct)}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums whitespace-nowrap text-[#9A9C94] hidden sm:table-cell" style={MONO}>
                          {t.portfolioImpactEur >= 0 ? '+' : '−'}
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

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-[#5A5C55]">
          Methodik: Gewichte aus dem 13F-Filing vom {formatIsoDate(s.filingDate)}, täglich konstant gehalten. Schlusskurse in USD ohne
          Dividenden. Sharpe Ratio mit kurzlaufenden US-Staatsanleihen als risikofreiem Zins. Stresstests rechnen die heutige Zusammensetzung
          mit den echten Kursen der jeweiligen Krisenphase. Vergangene Entwicklungen sind kein verlässlicher Indikator für die Zukunft, keine
          Anlageberatung.
        </p>
      </div>
    </section>
  )
}

// — Seite —

/**
 * signupHref: Registrierung hinter "Depot kostenlos anlegen" (auf der Subdomain absolut)
 * siteHref: macht Pfade der Hauptseite auf der Subdomain absolut
 */
export default async function DepotLanding({
  signupHref = SIGNUP_HREF,
  siteHref = path => path,
}: {
  signupHref?: string
  siteHref?: (path: string) => string
}) {
  const showcase = await buildDepotShowcase()
  const mc = showcase?.monteCarlo
  const lastBand = mc?.bands[mc.bands.length - 1]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div className={`${landingFontVars} min-h-screen bg-[#0D0E0C] text-[#ECEDE8]`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero: Text links, echte Monte-Carlo-Projektion rechts */}
      <section className="pt-16 lg:pt-24 pb-24 md:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2.5 text-[15px] text-[#9A9C94]">
              <QuarterMark filled={3} />
              Finclue Depot
            </div>
            <h1 className="mt-7 text-[2.8rem] sm:text-6xl lg:text-[72px] font-semibold leading-[1.02] tracking-[-0.035em] text-[#ECEDE8]" style={DISPLAY}>
              Dein Depot.
              <span className="block text-[#7C7F76]">Analysiert wie von Profis.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg md:text-xl leading-relaxed text-[#B4B6AE]">
              Importiere dein Depot und sieh, was wirklich drinsteckt. Mit echter Rendite, ETF-Durchblick und Risiko-Analysen, die sonst
              Vermögensverwalter nutzen: Monte Carlo, Stresstests und Faktoranalyse.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <DepotCta
                signupHref={signupHref}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ECEDE8] text-[#0D0E0C] font-medium hover:bg-white transition-colors"
              />
              {showcase && (
                <a href="#beispiel" className="px-6 py-3 rounded-xl border border-[#3A3D36] text-[#ECEDE8] hover:bg-[#1A1C18] transition-colors">
                  Beispielanalyse ansehen
                </a>
              )}
            </div>
            <p className="mt-7 text-sm text-[#9A9C94]">Import von {joinGerman(brokers)}</p>
          </div>

          {showcase && mc && lastBand && (
            <figure className={`${card} lg:col-span-5 p-6 m-0`}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">Monte Carlo, 10 Jahre</span>
                <span className="text-xs text-[#9A9C94]">Musterdepot {showcase.investorName}</span>
              </div>
              <div className="mt-4">
                <MonteCarloFanChart bands={mc.bands} startValue={SHOWCASE_START_VALUE} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-[#23261F] pt-4">
                <Kpi label="Ungünstig" value={usd(lastBand.p5)} />
                <Kpi label="Mittel" value={usd(lastBand.p50)} />
                <Kpi label="Günstig" value={usd(lastBand.p95)} />
              </dl>
              <figcaption className="mt-3 text-xs text-[#9A9C94]">Start mit {usd(SHOWCASE_START_VALUE)}, aus echten Kursen. Keine Prognose.</figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* Das Fundament (hell) */}
      <section className="bg-[#EDEEE8] text-[#111210]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-28">
          <SectionHead
            mark={1}
            label="Das Fundament"
            title="Alles, was ein guter Depot-Tracker können muss."
            text="Ein Ort für alle Depots, mit Zahlen, denen du trauen kannst."
            light
          />
          <FeatureGrid items={BASICS} light />
        </div>
      </section>

      {/* Profi-Analysen (dunkel) */}
      <section>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-28">
          <SectionHead
            mark={2}
            label="Profi-Analysen"
            title="Nicht nur wie viel du verdienst. Sondern wie viel Risiko du dafür trägst."
            text="Die meisten Depot-Apps zeigen dir die Rendite. Finclue zeigt dir zusätzlich, wie robust dein Depot ist und was in der nächsten Krise passieren könnte."
          />
          <FeatureGrid items={PRO} />
        </div>
      </section>

      {showcase && <Showcase s={showcase} siteHref={siteHref} />}

      {/* Free vs. Premium */}
      <section className="py-24 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] text-[#ECEDE8]" style={DISPLAY}>
            Kostenlos starten. <span className="text-[#7C7F76]">Profi-Analysen mit Premium.</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#121410] border border-[#262923] rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[#ECEDE8]">Free</h3>
              <p className="mt-1 text-sm text-[#9A9C94]">0 €</p>
              <ul className="mt-6 space-y-3">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="flex gap-3 text-sm text-[#C9CBC3]">
                    <CheckIcon className="w-4 h-4 mt-0.5 shrink-0 text-[#5A5D55]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#121410] border border-[#3A3D36] rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-semibold text-[#ECEDE8]">Premium</h3>
              <p className="mt-1 text-sm text-[#9A9C94]">
                {PREMIUM_MONTHLY_EUR} € im Monat oder {PREMIUM_YEARLY_EUR} € im Jahr, {PREMIUM_TRIAL_DAYS} Tage kostenlos testen
              </p>
              <ul className="mt-6 space-y-3">
                {PREMIUM_FEATURES.map(f => (
                  <li key={f} className="flex gap-3 text-sm text-[#C9CBC3]">
                    <CheckIcon className="w-4 h-4 mt-0.5 shrink-0 text-[#ECEDE8]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={siteHref('/pricing')} className="mt-6 inline-flex items-center gap-1 text-sm text-[#C9CBC3] hover:text-white">
                Alle Premium-Funktionen <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 md:py-28 border-t border-[#1F211D]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-[#ECEDE8]" style={DISPLAY}>
            Häufige Fragen
          </h2>
          <div className="mt-10 divide-y divide-[#262923] border-y border-[#262923]">
            {FAQ.map(f => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[#ECEDE8] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-[#9A9C94] text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] text-[#B4B6AE] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Abschluss */}
      <section className="py-24 md:py-28 border-t border-[#1F211D]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-[#ECEDE8]" style={DISPLAY}>
            Wie robust ist dein Depot?
          </h2>
          <p className="mt-4 text-[#B4B6AE]">Leg dein Depot an und finde es heraus. Der Start ist kostenlos.</p>
          <DepotCta
            signupHref={signupHref}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ECEDE8] text-[#0D0E0C] font-medium hover:bg-white transition-colors"
          />
        </div>
      </section>
    </div>
  )
}
