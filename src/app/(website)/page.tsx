// Startseite (Server Component), damit alle Inhalte im HTML stehen.
// Erzählt Finclue als Ablauf: Idee finden (Superinvestoren) → selbst prüfen
// (Aktienanalyse) → im Blick behalten (Depot). Statt gerenderter Bilder zeigen
// die drei Schritte echte, aktuelle Daten-Bausteine aus dem Produkt.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRightIcon, BuildingLibraryIcon, CheckIcon, EyeIcon, PresentationChartLineIcon, SparklesIcon } from '@heroicons/react/24/outline'
import NewsletterSignup from '@/components/NewsletterSignup'
import HeroSearch from '@/components/landing/HeroSearch'
import FinancialBars from '@/components/landing/FinancialBars'
import QuarterMark from '@/components/landing/QuarterMark'
import { DISPLAY, MONO, landingFontVars } from '@/components/landing/landingFonts'
import Logo from '@/components/Logo'
import InvestorQuarterSummary from '@/components/superinvestor/InvestorQuarterSummary'
import holdingsHistory, { type Snapshot } from '@/data/holdings'
import highlights from '@/data/homepageHighlights.json'
import { investorNames, splitInvestorName } from '@/data/investorNames'
import { investors } from '@/data/investors'
import { IMPORT_BROKERS } from '@/lib/importBrokerConfig'
import type { SearchResult } from '@/lib/searchSuggestions'
import { brandName, formatCompactAmount, formatIsoDate, formatMoney, formatSignedPercent, formatUsdCompact, shortCompanyName } from '@/lib/displayFormat'
import { buildDepotShowcase, type DepotShowcase } from '@/lib/depotShowcase'
import { buildInvestorQuarterSummary } from '@/lib/investorQuarterSummary'
import { getFinancialHistory, getPublicStockData, type FinancialYear, type PublicStockData } from '@/lib/publicStockData'
import { PLAN_FEATURES, PREMIUM_TRIAL_DAYS, formatEur, getPricing } from '@/lib/pricing'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

// Kurse und Kennzahlen der Beispiele stündlich auffrischen
export const revalidate = 3600


// — Daten (alle aus echten Quellen) —

const brokers = IMPORT_BROKERS.filter(b => b.id !== 'other')
const brokerNames = brokers.map(b => b.shortName ?? b.name)
const freeFeatures = PLAN_FEATURES.free.filter(f => f.included)
const premiumHighlights = PLAN_FEATURES.premium.filter(f => f.highlight || f.name.startsWith('Superinvestor-Abgleich'))
// Reguläre Preise für Neukunden (die Black-Friday-Aktion steht nur auf /pricing).
// Auf Modulebene berechnet: nach der Preisumstellung am 1.1.2027 einmal neu deployen.
const regularPricing = getPricing()
const monthlyEur = formatEur(regularPricing.monthly)
const yearlyEur = formatEur(regularPricing.yearlyRegular)
const yearlyPerMonth = formatEur(regularPricing.yearlyRegular / 12)
const filingDate = formatIsoDate(highlights.latestFilingDate)
const reportQuarter = highlights.reportQuarter ?? 'dem letzten Quartal'
const quarterIndex = Number(highlights.reportQuarter?.match(/^Q([1-4])/)?.[1] ?? 0)

/** Schritt 1 zeigt den Quartals-Überblick dieses Investors */
const SHOWCASE_INVESTOR = 'buffett'

// Einheitlich quadratische Icons: lokales PNG (vom Highlights-Skript geprüft),
// sonst logo.dev. Die lokalen SVGs der Logo-Komponente sind teils Schriftzüge.
const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
function logoSrc(item: { ticker: string; logo: string | null }): string | undefined {
  if (item.logo) return item.logo
  return LOGO_DEV_TOKEN ? `https://img.logo.dev/ticker/${item.ticker}?token=${LOGO_DEV_TOKEN}` : undefined
}

// Vorschläge im leeren Suchfeld: zwei bekannte Investoren und die zwei
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
    subtitle: `${shortCompanyName(s.name)}, von ${s.investorCount} Superinvestoren gekauft`,
    href: `/aktie/${s.ticker.toLowerCase()}`,
  })),
]

const pillars = [
  { href: '/superinvestor', title: 'Superinvestoren folgen', n: 1 },
  { href: '/analyse', title: 'Aktien analysieren', n: 2 },
  { href: '/depot', title: 'Depot tracken', n: 3 },
]

const moreFeatures = [
  { href: '/features#quartalszahlen', icon: SparklesIcon, title: 'Quartalszahlen mit KI', text: 'Aus 100 Seiten Bericht werden 10 Zeilen. Reports und Transcripts auf den Punkt gebracht.' },
  { href: '/politiker', icon: BuildingLibraryIcon, title: 'Kongress-Trades', text: 'Was US-Politiker kaufen und verkaufen, aus den offiziellen Offenlegungen.' },
  { href: '/superinvestor/insider', icon: EyeIcon, title: 'Insider-Signale', text: 'Wann Vorstände und Direktoren eigene Aktien kaufen oder verkaufen. Direkt aus den SEC-Meldungen.' },
  { href: '/features#chart-builder', icon: PresentationChartLineIcon, title: 'Chart Builder', text: 'Aktien, Kennzahlen und Jahre in einem einzigen Chart vergleichen.' },
]

const faqs = [
  {
    q: 'Was ist Finclue?',
    a: `Finclue ist eine deutschsprachige Plattform für Privatanleger. Du siehst, was ${highlights.trackedInvestors} bekannte Investoren wie Warren Buffett oder Bill Ackman kaufen und verkaufen, analysierst Aktien mit Kennzahlen, Bilanzen und Quartalszahlen und verfolgst dein eigenes Depot. Alles an einem Ort.`,
  },
  {
    q: 'Was kostet Finclue?',
    a: `Die Basisversion ist dauerhaft kostenlos. Premium kostet ${monthlyEur} € im Monat mit ${PREMIUM_TRIAL_DAYS} Tagen kostenlosem Test oder ${yearlyEur} € im Jahr (${yearlyPerMonth} € pro Monat).`,
  },
  {
    q: 'Woher kommen die Superinvestor-Daten?',
    a: 'Aus den 13F-Meldungen bei der US-Börsenaufsicht SEC. Institutionelle Investoren mit mehr als 100 Mio. US-Dollar in US-Aktien müssen ihre Positionen jedes Quartal offenlegen, spätestens 45 Tage nach Quartalsende. Finclue wertet jede Meldung aus, sobald sie eingereicht ist.',
  },
  {
    q: 'Welche Broker kann ich importieren?',
    a: `${brokerNames.slice(0, -1).join(', ')} und ${brokerNames[brokerNames.length - 1]}, per CSV-, PDF- oder Excel-Export deines Brokers. Dateien anderer Broker erkennt Finclue automatisch, soweit das Format unterstützt wird.`,
  },
  {
    q: 'Ist Finclue eine Anlageberatung?',
    a: 'Nein. Finclue liefert Daten und Werkzeuge für deine eigene Recherche. Kein Inhalt auf Finclue ist eine Empfehlung, Wertpapiere zu kaufen oder zu verkaufen.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

// — Bausteine —

function SectionTitle({ children, light = false, className = '' }: { children: React.ReactNode; light?: boolean; className?: string }) {
  return (
    <h2
      className={`text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] ${light ? 'text-[#111210]' : 'text-[#ECEDE8]'} ${className}`}
      style={DISPLAY}
    >
      {children}
    </h2>
  )
}

type RankedStock = (typeof highlights.mostBought)[number]

function MoveList({ title, items }: { title: string; items: RankedStock[] }) {
  return (
    <div className="border-t border-[#3A3D36] pt-4">
      <h3 className="text-sm font-medium text-[#ECEDE8]">{title}</h3>
      <ol className="mt-2 divide-y divide-[#1F211D]">
        {items.map(s => (
          <li key={s.ticker}>
            <Link href={`/aktie/${s.ticker.toLowerCase()}`} className="group flex items-center gap-3 py-3">
              <Logo ticker={s.ticker} src={logoSrc(s)} alt={s.name} className="w-8 h-8 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-[#ECEDE8] truncate group-hover:underline underline-offset-4">{shortCompanyName(s.name)}</span>
                <span className="block text-xs text-[#9A9C94]" style={MONO}>
                  {s.ticker}
                </span>
              </span>
              <span className="text-sm text-[#9A9C94] tabular-nums whitespace-nowrap">{s.investorCount} Investoren</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Step({
  n,
  label,
  title,
  text,
  href,
  linkLabel,
  visual,
  reverse = false,
}: {
  n: number
  label: string
  title: string
  text: string
  href: string
  linkLabel: string
  visual: React.ReactNode
  reverse?: boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-center">
      <div className={`lg:col-span-2 ${reverse ? 'lg:order-2' : ''}`}>
        <div className="flex items-center gap-3 text-[15px] text-[#4B4D46]">
          <QuarterMark filled={n} size={22} light />
          {label}
        </div>
        <h3 className="mt-4 text-3xl md:text-4xl font-semibold tracking-[-0.02em] leading-[1.08] text-[#111210]" style={DISPLAY}>
          {title}
        </h3>
        <p className="mt-4 text-[17px] leading-relaxed text-[#3A3C36]">{text}</p>
        <Link href={href} className="mt-6 inline-flex items-center gap-1.5 font-medium text-[#111210] hover:underline underline-offset-4">
          {linkLabel}
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
      <div className={`lg:col-span-3 min-w-0 ${reverse ? 'lg:order-1' : ''}`}>{visual}</div>
    </div>
  )
}

const card = 'rounded-2xl bg-[#161814] text-[#ECEDE8] shadow-[0_24px_48px_-24px_rgba(17,18,16,0.45)]'
const pct = (v: number, digits = 1) => `${v.toLocaleString('de-DE', { maximumFractionDigits: digits })} %`

/** Schritt 2: echter Kurz-Steckbrief einer Aktie mit 10 Jahren Umsatz und Gewinn */
function StockPanel({ stock, market, financials }: { stock: RankedStock; market: PublicStockData; financials: FinancialYear[] }) {
  const { profile: p, quote: q } = market
  const currency = p?.currency ?? 'USD'
  const name = brandName(stock.name)
  const last = financials[financials.length - 1]
  const fiveBack = financials.length >= 6 ? financials[financials.length - 6] : null
  const growth = last && fiveBack && fiveBack.revenue > 0 ? ((last.revenue / fiveBack.revenue) ** (1 / 5) - 1) * 100 : null
  const facts = [
    q?.marketCap ? { label: 'Börsenwert', value: formatCompactAmount(q.marketCap, currency) } : null,
    q?.pe && q.pe > 0 ? { label: 'KGV', value: q.pe.toLocaleString('de-DE', { maximumFractionDigits: 1 }) } : null,
    last ? { label: 'Nettomarge', value: pct((last.netIncome / last.revenue) * 100) } : null,
    growth !== null ? { label: 'Umsatz p. a. (5 J.)', value: formatSignedPercent(growth) } : null,
  ].filter((f): f is { label: string; value: string } => !!f)

  return (
    <div className={`${card} p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Logo ticker={stock.ticker} src={logoSrc(stock)} alt={stock.name} className="w-10 h-10 rounded-xl bg-white" />
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">{name}</div>
            <div className="text-xs text-[#9A9C94]" style={MONO}>
              {stock.ticker}
            </div>
          </div>
        </div>
        {q && (
          <div className="text-right shrink-0">
            <div className="text-lg tabular-nums" style={MONO}>
              {formatMoney(q.price, currency)}
            </div>
            <div className={`text-xs tabular-nums ${q.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`} style={MONO}>
              {formatSignedPercent(q.changePercent)}
            </div>
          </div>
        )}
      </div>
      {facts.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {facts.map(f => (
            <div key={f.label} className="min-w-0">
              <dt className="text-xs text-[#9A9C94]">{f.label}</dt>
              <dd className="mt-1 text-base tabular-nums" style={MONO}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {financials.length >= 3 && (
        <div className="mt-6 border-t border-[#23261F] pt-5">
          <FinancialBars years={financials} />
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#23261F] pt-4 text-sm">
        <span className="text-[#9A9C94]">
          {stock.investorCount} Superinvestoren haben im {reportQuarter} gekauft
        </span>
        <Link href={`/aktie/${stock.ticker.toLowerCase()}`} className="inline-flex items-center gap-1 text-[#ECEDE8] hover:underline underline-offset-4">
          Zur {name}-Analyse <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

/** Schritt 3: die echte Beispielanalyse der Depot-Seite in Kurzform */
function DepotPanel({ s }: { s: DepotShowcase }) {
  const r = s.risk
  const b = s.benchmarkRisk
  const tiles = r
    ? [
        { label: 'Rendite p. a.', value: pct(r.annualizedReturnPct), market: b ? pct(b.annualizedReturnPct) : null },
        { label: 'Sharpe Ratio', value: r.sharpe?.toLocaleString('de-DE', { maximumFractionDigits: 2 }) ?? '–', market: b?.sharpe?.toLocaleString('de-DE', { maximumFractionDigits: 2 }) ?? null },
        { label: 'Max Drawdown', value: formatSignedPercent(r.maxDrawdownPct), market: b ? formatSignedPercent(b.maxDrawdownPct) : null },
      ]
    : []
  const width = (v: number) => `${Math.min(100, Math.round((Math.abs(v) / 55) * 100))}%`

  return (
    <div className={`${card} p-6`}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-lg font-semibold">Musterdepot: {s.investorName}s Top 10</div>
        <span className="text-xs text-[#9A9C94]">in Klammern: S&amp;P 500</span>
      </div>
      {tiles.length > 0 && (
        <dl className="mt-5 grid grid-cols-3 gap-4">
          {tiles.map(t => (
            <div key={t.label}>
              <dt className="text-xs text-[#9A9C94]">{t.label}</dt>
              <dd className="mt-1 text-xl tabular-nums" style={MONO}>
                {t.value}
              </dd>
              {t.market && (
                <dd className="text-xs text-[#9A9C94] tabular-nums" style={MONO}>
                  ({t.market})
                </dd>
              )}
            </div>
          ))}
        </dl>
      )}
      {s.stressTests.length > 0 && (
        <div className="mt-6 border-t border-[#23261F] pt-5">
          <div className="text-sm text-[#C9CBC3]">Stresstest: das heutige Depot in vergangenen Krisen</div>
          {s.stressTests.map(t => (
            <div key={t.key} className="mt-4">
              <div className="flex justify-between gap-3 text-sm">
                <span>{t.label}</span>
                <span className="tabular-nums" style={MONO}>
                  {formatSignedPercent(t.portfolioReturnPct)} <span className="text-[#9A9C94]">({formatSignedPercent(t.marketReturnPct)})</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded bg-[#23261F]">
                <div className="h-1.5 rounded bg-[#ECEDE8]" style={{ width: width(t.portfolioReturnPct) }} />
              </div>
              <div className="mt-1 h-1.5 rounded bg-[#23261F]">
                <div className="h-1.5 rounded bg-[#5A5D55]" style={{ width: width(t.marketReturnPct) }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 border-t border-[#23261F] pt-4 text-sm">
        <Link href="/depot#beispiel" className="inline-flex items-center gap-1 text-[#ECEDE8] hover:underline underline-offset-4">
          Ganze Beispielanalyse mit Monte Carlo <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

// — Seite —

export default async function HomePage() {
  const featured = highlights.mostBought[0] ?? null
  const investorSnapshots = (holdingsHistory as Record<string, Snapshot[]>)[SHOWCASE_INVESTOR]
  const investorSummary = investorSnapshots ? buildInvestorQuarterSummary(SHOWCASE_INVESTOR, investorSnapshots) : null
  const investorName = splitInvestorName(investorNames[SHOWCASE_INVESTOR] ?? SHOWCASE_INVESTOR).name

  const [market, financials, depot] = await Promise.all([
    featured ? getPublicStockData(featured.ticker) : Promise.resolve(null),
    featured ? getFinancialHistory(featured.ticker, 10) : Promise.resolve([] as FinancialYear[]),
    buildDepotShowcase(),
  ])

  return (
    <div className={`${landingFontVars} min-h-screen bg-[#0D0E0C] text-[#ECEDE8]`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero: Hinweis, Headline, ein Satz, Suche, drei Wege */}
      <section className="pt-16 lg:pt-24 pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {highlights.reportQuarter && (
            <a href="#superinvestoren-live" className="inline-flex items-center gap-2.5 text-[15px] text-[#9A9C94] hover:text-white transition-colors">
              <QuarterMark only={quarterIndex} />
              {highlights.reportedInvestors} neue 13F-Meldungen für {highlights.reportQuarter}
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </a>
          )}
          <h1 className="mt-7 text-[2.8rem] sm:text-6xl lg:text-[80px] font-semibold leading-[1.02] tracking-[-0.035em] text-[#ECEDE8]" style={DISPLAY}>
            Sieh, was die Profis kaufen.
            <span className="block text-[#7C7F76]">Entscheide selbst.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl leading-relaxed text-[#B4B6AE]">Superinvestoren, Aktienanalyse und dein Depot. An einem Ort.</p>
          <div className="mt-10 max-w-xl [&>div]:mx-0">
            <HeroSearch quickPicks={quickPicks} />
          </div>
          <nav aria-label="Bereiche" className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm">
            {pillars.map(p => (
              <Link key={p.href} href={p.href} className="inline-flex items-center gap-2 text-[#C9CBC3] hover:text-white transition-colors">
                <QuarterMark filled={p.n} />
                {p.title}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Live aus der aktuellen 13F-Saison */}
      {highlights.mostBought.length > 0 && (
        <section id="superinvestoren-live" className="scroll-mt-20 pb-24 md:pb-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionTitle>Was die Superinvestoren im {reportQuarter} gekauft haben.</SectionTitle>
                <p className="mt-4 text-[#9A9C94]">
                  Aus {highlights.reportedInvestors} eingereichten 13F-Meldungen{filingDate ? `, Stand ${filingDate}` : ''}
                </p>
              </div>
              <Link href="/superinvestor/activity" className="inline-flex items-center gap-1 text-[15px] text-[#C9CBC3] hover:text-white">
                Alle Käufe und Verkäufe <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
              <MoveList title="Am häufigsten gekauft" items={highlights.mostBought.slice(0, 5)} />
              <MoveList title="Am häufigsten verkauft" items={highlights.mostSold.slice(0, 5)} />
              {highlights.biggestNewPositions.length > 0 && (
                <div className="border-t border-[#3A3D36] pt-4">
                  <h3 className="text-sm font-medium text-[#ECEDE8]">Größte neue Positionen</h3>
                  <ol className="mt-2 divide-y divide-[#1F211D]">
                    {highlights.biggestNewPositions.slice(0, 5).map(p => (
                      <li key={`${p.investor.slug}-${p.ticker}`}>
                        <Link href={`/superinvestor/${p.investor.slug}`} className="group flex items-center gap-3 py-3">
                          <Logo ticker={p.ticker} src={logoSrc(p)} alt={p.name} className="w-8 h-8 rounded-lg" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-[#ECEDE8] truncate group-hover:underline underline-offset-4">{shortCompanyName(p.name)}</span>
                            <span className="block text-xs text-[#9A9C94] truncate">{p.investor.name}</span>
                          </span>
                          <span className="text-sm text-[#9A9C94] tabular-nums whitespace-nowrap">{formatUsdCompact(p.value)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* So funktioniert Finclue: drei Schritte mit echten Daten */}
      <section aria-labelledby="so-funktionierts" className="bg-[#EDEEE8] text-[#111210]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-28">
          <p className="text-[15px] text-[#4B4D46]">So funktioniert Finclue</p>
          <h2 id="so-funktionierts" className="mt-2 text-3xl md:text-5xl font-semibold tracking-[-0.025em] leading-[1.05] text-[#111210]" style={DISPLAY}>
            Von der Idee bis ins Depot.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-[#4B4D46]">Drei Schritte, ein Werkzeug. Statt fünf Tabs, drei Apps und einer Excel-Tabelle.</p>

          <div className="mt-16 space-y-24">
            <Step
              n={1}
              label="Idee finden"
              title="Lass dich von den Besten inspirieren."
              text={`Buffett, Ackman, Burry und ${highlights.trackedInvestors - 3} weitere Investoren. Jede Portfolio-Änderung aus den offiziellen SEC-Meldungen, verständlich auf Deutsch.`}
              href="/superinvestor"
              linkLabel="Superinvestoren entdecken"
              visual={
                investorSummary ? (
                  <div className={`${card} p-2 [&>section]:mt-0`}>
                    <InvestorQuarterSummary name={investorName} summary={investorSummary} />
                  </div>
                ) : null
              }
            />
            {featured && market && (
              <Step
                n={2}
                label="Selbst prüfen"
                title="Prüf jede Idee, bevor du kaufst."
                text="Über 20 Jahre Bilanzen, 60+ Kennzahlen und Quartalszahlen mit KI-Zusammenfassung. Klar visualisiert statt Tabellenchaos."
                href="/analyse"
                linkLabel="Aktienanalyse öffnen"
                reverse
                visual={<StockPanel stock={featured} market={market} financials={financials} />}
              />
            )}
            <Step
              n={3}
              label="Im Blick behalten"
              title="Dein Depot, endlich mit Klarheit."
              text={`Importiere dein Depot von ${brokerNames.slice(0, 3).join(', ')} & Co. Mit echter Performance, Dividenden und Risikoanalyse bis zum Stresstest.`}
              href="/depot"
              linkLabel="Mehr zum Depot-Tracker"
              visual={depot ? <DepotPanel s={depot} /> : null}
            />
          </div>
        </div>
      </section>

      {/* Weitere Funktionen */}
      <section className="py-24 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle>Und das ist erst der Anfang.</SectionTitle>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#1F211D] border border-[#1F211D] rounded-2xl overflow-hidden">
            {moreFeatures.map(f => (
              <Link key={f.title} href={f.href} className="group bg-[#0D0E0C] p-6 hover:bg-[#121410] transition-colors">
                <f.icon className="w-5 h-5 text-[#9A9C94]" />
                <h3 className="mt-4 flex items-center gap-1 font-semibold text-[#ECEDE8]">
                  {f.title}
                  <ArrowRightIcon className="w-3.5 h-3.5 text-[#5A5D55] group-hover:text-white transition-colors" />
                </h3>
                <p className="mt-2 text-sm text-[#9A9C94] leading-relaxed">{f.text}</p>
              </Link>
            ))}
          </div>
          <Link href="/features" className="mt-8 inline-flex items-center gap-1.5 text-[15px] text-[#C9CBC3] hover:text-white">
            Alle Features im Detail <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Preise */}
      <section className="py-24 md:py-28 border-t border-[#1F211D]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle>
            Kostenlos starten. <span className="text-[#7C7F76]">Upgraden, wenn du mehr willst.</span>
          </SectionTitle>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#121410] border border-[#262923] rounded-2xl p-6 sm:p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-[#ECEDE8]">Free</h3>
              <p className="text-sm text-[#9A9C94] mt-1">Für immer kostenlos</p>
              <div className="mt-6 text-4xl" style={MONO}>
                0 €
              </div>
              <ul className="mt-8 space-y-3 flex-1">
                {freeFeatures.map(f => (
                  <li key={f.name} className="flex items-start gap-3 text-sm text-[#C9CBC3]">
                    <CheckIcon className="w-4 h-4 mt-0.5 text-[#5A5D55] shrink-0" />
                    {f.name}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="mt-8 w-full text-center py-3 rounded-xl bg-[#ECEDE8] text-[#0D0E0C] font-medium hover:bg-white transition-colors">
                Kostenlos registrieren
              </Link>
            </div>
            <div className="bg-[#121410] border border-[#3A3D36] rounded-2xl p-6 sm:p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-[#ECEDE8]">Premium</h3>
              <p className="text-sm text-[#9A9C94] mt-1">Alles aus Free, dazu:</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl" style={MONO}>
                  {yearlyPerMonth} €
                </span>
                <span className="text-[#9A9C94]">/ Monat</span>
              </div>
              <p className="text-xs text-[#9A9C94] mt-1">
                bei {yearlyEur} € im Jahr, oder {monthlyEur} € monatlich
              </p>
              <ul className="mt-8 space-y-3 flex-1">
                {premiumHighlights.map(f => (
                  <li key={f.name} className="flex items-start gap-3 text-sm text-[#C9CBC3]">
                    <CheckIcon className="w-4 h-4 mt-0.5 text-[#ECEDE8] shrink-0" />
                    {f.name}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="mt-8 w-full text-center py-3 rounded-xl border border-[#3A3D36] font-medium text-[#ECEDE8] hover:bg-[#1A1C18] transition-colors">
                {PREMIUM_TRIAL_DAYS} Tage kostenlos testen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 md:py-28 border-t border-[#1F211D]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionTitle>Gut zu wissen.</SectionTitle>
          <div className="mt-10 divide-y divide-[#262923] border-y border-[#262923]">
            {faqs.map(f => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[#ECEDE8] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-[#9A9C94] text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[#B4B6AE] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 md:py-28 border-t border-[#1F211D]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-3">
            <SectionTitle>
              Was die Profis kaufen. <span className="text-[#7C7F76]">Direkt in dein Postfach.</span>
            </SectionTitle>
            <p className="mt-6 text-lg text-[#B4B6AE] leading-relaxed">
              Zu jeder 13F-Saison die wichtigsten Käufe und Verkäufe der Superinvestoren, eingeordnet auf Deutsch. Dazu neue Funktionen von
              Finclue.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {['13F-Updates jedes Quartal', 'Kein Spam, jederzeit abbestellbar', 'Marktanalysen', 'Neue Funktionen zuerst'].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-[#5A5D55] shrink-0" />
                  <span className="text-[#B4B6AE]">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-[#121410] border border-[#262923] rounded-2xl p-6 sm:p-8">
              <NewsletterSignup />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
