// Öffentliche Aktienseite (Server): /aktie/[ticker]
// Für Suchmaschinen und Besucher ohne Konto – Kurs, Kennzahlen, Kurzprofil und
// welche Superinvestoren die Aktie laut 13F halten. Die volle Analyse bleibt
// im Terminal (/analyse/stocks/…, mit Login).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import { stocks } from '@/data/stocks'
import {
  formatCompactAmount,
  formatIsoDate,
  formatMoney,
  formatSignedPercent,
  formatUsdCompact,
  joinGerman,
  shortCompanyName,
} from '@/lib/displayFormat'
import { getPublicStockData, type PublicStockData } from '@/lib/publicStockData'
import { affectsPe, cleanPeFor, describeEarnings, earningsQuality, type EarningsQuality } from '@/lib/earningsQuality'
import {
  getStockSuperinvestors,
  type StockHolder,
  type StockSuperinvestorData,
} from '@/lib/stockSuperinvestors'
import { translateSector } from '@/utils/sectorUtils'

export const revalidate = 3600

type Props = { params: { ticker: string } }

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9.\-]{0,14}$/
const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN

const KIND = {
  Aktie: { nominative: 'die Aktie', accusative: 'die Aktie' },
  ETF: { nominative: 'der ETF', accusative: 'den ETF' },
  Fonds: { nominative: 'der Fonds', accusative: 'den Fonds' },
} as const

type Kind = keyof typeof KIND

interface LoadedStock {
  ticker: string
  slug: string
  name: string
  /** "Apple Aktie", aber "SPDR S&P 500 ETF" statt "… ETF ETF" */
  heading: string
  fullName: string
  kind: Kind
  market: PublicStockData
  investors: StockSuperinvestorData
  /** Sondereinfluss im Gewinn der letzten zwölf Monate */
  quality: EarningsQuality | null
}

function titleCase(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function decodeTicker(raw: string): string | null {
  try {
    const ticker = decodeURIComponent(raw).toUpperCase()
    return TICKER_PATTERN.test(ticker) ? ticker : null
  } catch {
    return null
  }
}

async function loadStock(rawTicker: string): Promise<LoadedStock | null> {
  const ticker = decodeTicker(rawTicker)
  if (!ticker) return null

  const investors = getStockSuperinvestors(ticker)
  const [market, quality] = await Promise.all([getPublicStockData(ticker), earningsQuality(ticker)])
  if (!market.profile && investors.holders.length === 0 && investors.soldOut.length === 0) return null

  const fullName =
    market.profile?.companyName ??
    stocks.find(s => s.ticker === ticker)?.name ??
    (investors.filingName ? titleCase(investors.filingName) : ticker)

  const name = shortCompanyName(fullName) || ticker
  const kind: Kind = market.profile?.isEtf ? 'ETF' : market.profile?.isFund ? 'Fonds' : 'Aktie'
  const heading = new RegExp(`\\b${kind}$`, 'i').test(name) ? name : `${name} ${kind}`

  return { ticker, slug: ticker.toLowerCase(), name, heading, fullName, kind, market, investors, quality }
}

// — Metadaten —

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await loadStock(params.ticker)
  if (!s) return {}

  const { holders } = s.investors
  const canonical = `/aktie/${s.slug}`
  const title = `${s.heading} (${s.ticker}): Kurs, Kennzahlen & Superinvestoren`
  const description = holders.length
    ? `${s.name} (${s.ticker}) im Überblick: Kurs, Kennzahlen und welche Superinvestoren ${KIND[s.kind].accusative} halten – laut 13F-Filings ${holders.length === 1 ? 'ein Investor' : `${holders.length} Investoren`}, darunter ${joinGerman(holders.slice(0, 3).map(h => h.name))}.`
    : `${s.name} (${s.ticker}) im Überblick: Kurs, Kennzahlen wie KGV und Marktkapitalisierung sowie das Unternehmensprofil.`

  return {
    title,
    description,
    alternates: { canonical },
    // Ohne Superinvestoren-Daten wäre die Seite nur ein weiterer Kurszettel.
    robots: holders.length ? undefined : { index: false, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Finclue',
      locale: 'de_DE',
      url: canonical,
      title,
      description,
      images: [{ url: '/laptop-finclue-preview.png', width: 1200, height: 630, alt: `${s.name} auf Finclue` }],
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// — Anzeige-Helfer —

function countryName(code: string | null): string | null {
  if (!code) return null
  try {
    return new Intl.DisplayNames(['de'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function formatShare(share: number): string {
  const pct = share * 100
  if (pct > 0 && pct < 0.1) return '< 0,1 %'
  return `${pct.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

function formatTimestamp(seconds: number | null): string | null {
  if (!seconds) return null
  return new Date(seconds * 1000).toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function logoSrc(s: LoadedStock): string | undefined {
  if (LOGO_DEV_TOKEN) return `https://img.logo.dev/ticker/${s.ticker}?token=${LOGO_DEV_TOKEN}`
  return s.market.profile?.image ?? undefined
}

function introSentences(s: LoadedStock): string[] {
  const { profile: p, quote: q } = s.market
  const { holders, trackedInvestors, totalValue } = s.investors
  const sentences: string[] = []

  if (p && s.kind === 'Aktie') {
    const where = [p.city ? titleCase(p.city) : null, countryName(p.country)].filter(Boolean).join(', ')
    let first = `${p.companyName} ist ein Unternehmen`
    if (p.sector) first += ` aus dem Sektor ${translateSector(p.sector)}`
    if (p.industry) first += ` (Branche: ${p.industry})`
    if (where) first += ` mit Sitz in ${where}`
    sentences.push(`${first}.`)
  } else if (p) {
    sentences.push(`${p.companyName} ist ein ${s.kind === 'ETF' ? 'börsengehandelter Indexfonds (ETF)' : 'Fonds'}.`)
  }

  if (p?.exchange) {
    let second = `Gehandelt wird ${KIND[s.kind].nominative} unter dem Kürzel ${s.ticker} an der ${p.exchange}`
    if (q?.marketCap && s.kind === 'Aktie') {
      second += `; der Börsenwert liegt bei rund ${formatCompactAmount(q.marketCap, p.currency)}`
    }
    sentences.push(`${second}.`)
  }

  if (holders.length > 0) {
    const who =
      holders.length === 1
        ? `hält einer der ${trackedInvestors} Superinvestoren auf Finclue`
        : `halten ${holders.length} der ${trackedInvestors} Superinvestoren auf Finclue`
    sentences.push(
      `Laut den aktuellen 13F-Filings ${who} ${KIND[s.kind].accusative}, zusammen im Wert von rund ${formatUsdCompact(totalValue)}.`,
    )
  }

  return sentences
}

function keyFacts(s: LoadedStock): { label: string; value: string }[] {
  const { profile: p, quote: q } = s.market
  const currency = p?.currency ?? 'USD'
  const cleanPe = cleanPeFor(s.quality, q?.pe)
  const facts: { label: string; value: string | null }[] = [
    { label: 'Marktkapitalisierung', value: q?.marketCap ? formatCompactAmount(q.marketCap, currency) : null },
    {
      label: 'KGV',
      value:
        q?.pe && q.pe > 0
          ? q.pe.toLocaleString('de-DE', { maximumFractionDigits: 1 })
          : q?.eps !== null && q?.eps !== undefined && q.eps < 0
            ? 'n. a. (Verlust)'
            : null,
    },
    {
      label: s.quality ? describeEarnings(s.quality).label : '',
      value: cleanPe !== null ? `rund ${cleanPe.toLocaleString('de-DE', { maximumFractionDigits: 0 })}` : null,
    },
    { label: 'Gewinn je Aktie', value: q?.eps !== null && q?.eps !== undefined ? formatMoney(q.eps, currency) : null },
    {
      label: 'Dividende je Aktie',
      value:
        p?.lastDividend && p.lastDividend > 0
          ? q?.price
            ? `${formatMoney(p.lastDividend, currency)} (${((p.lastDividend / q.price) * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 })} %)`
            : formatMoney(p.lastDividend, currency)
          : p && s.kind === 'Aktie'
            ? 'Keine'
            : null,
    },
    {
      label: '52-Wochen-Spanne',
      value: q?.yearLow && q?.yearHigh ? `${formatMoney(q.yearLow, currency)} – ${formatMoney(q.yearHigh, currency)}` : null,
    },
    { label: 'Beta', value: p?.beta !== null && p?.beta !== undefined ? p.beta.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : null },
    { label: 'Mitarbeiter', value: p?.employees ? p.employees.toLocaleString('de-DE') : null },
    { label: 'Börsengang', value: formatIsoDate(p?.ipoDate) },
    { label: 'CEO', value: p?.ceo ?? null },
    { label: 'ISIN', value: p?.isin ?? null },
  ]
  return facts.filter((f): f is { label: string; value: string } => !!f.value)
}

// — Bausteine —

function InvestorAvatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" width={32} height={32} loading="lazy" className="w-8 h-8 rounded-full object-cover shrink-0 bg-theme-secondary" />
  }
  const initials = name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
  return (
    <span aria-hidden className="w-8 h-8 rounded-full shrink-0 bg-theme-secondary text-theme-muted text-xs flex items-center justify-center">
      {initials}
    </span>
  )
}

function ChangeCell({ holder }: { holder: StockHolder }) {
  const label =
    holder.change === 'new'
      ? 'Neu'
      : holder.change === 'unchanged'
        ? 'Unverändert'
        : holder.pctChange !== null
          ? formatSignedPercent(holder.pctChange)
          : holder.change === 'increased'
            ? 'Aufgestockt'
            : 'Reduziert'
  const tone =
    holder.change === 'new' || holder.change === 'increased'
      ? 'text-emerald-400'
      : holder.change === 'reduced'
        ? 'text-red-400'
        : 'text-theme-muted'
  return (
    <>
      <span className={`block ${tone}`}>{label}</span>
      <span className="block text-xs text-theme-muted">{holder.periodLabel}</span>
    </>
  )
}

function SuperinvestorSection({ s }: { s: LoadedStock }) {
  const { holders, soldOut, trackedInvestors } = s.investors
  const counts = {
    new: holders.filter(h => h.change === 'new').length,
    increased: holders.filter(h => h.change === 'increased').length,
    reduced: holders.filter(h => h.change === 'reduced').length,
    sold: soldOut.length,
  }
  const activity = [
    { n: counts.new, label: 'neu eingestiegen', tone: 'text-emerald-400' },
    { n: counts.increased, label: 'aufgestockt', tone: 'text-emerald-400' },
    { n: counts.reduced, label: 'reduziert', tone: 'text-red-400' },
    { n: counts.sold, label: 'komplett verkauft', tone: 'text-red-400' },
  ].filter(a => a.n > 0)

  return (
    <section aria-labelledby="superinvestoren" className="bg-theme-card border border-theme-light rounded-xl p-6 lg:p-8">
      <h2 id="superinvestoren" className="text-lg font-semibold text-theme-primary">
        Welche Superinvestoren halten {s.name}?
      </h2>

      {holders.length === 0 ? (
        <p className="mt-2 text-sm text-theme-secondary">
          Aktuell hält keiner der {trackedInvestors} Superinvestoren mit aktuellem 13F-Filing {KIND[s.kind].accusative}.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-theme-secondary">
            Die größte Position hält {holders[0].name}
            {holders[0].portfolioShare >= 0.001 ? ` – sie macht ${formatShare(holders[0].portfolioShare)} des Portfolios aus` : ''}.
            {activity.length > 0 && ' Veränderungen im jeweils letzten gemeldeten Quartal:'}
          </p>

          {activity.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {activity.map(a => (
                <li key={a.label}>
                  <span className={`tabular-nums font-medium ${a.tone}`}>{a.n}</span>{' '}
                  <span className="text-theme-secondary">{a.label}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 -mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-light text-left text-xs uppercase tracking-wider text-theme-muted whitespace-nowrap">
                  <th scope="col" className="px-2 py-2 font-normal w-full">Investor</th>
                  <th scope="col" className="px-2 py-2 font-normal text-right">
                    Anteil<span className="hidden sm:inline"> am Portfolio</span>
                  </th>
                  <th scope="col" className="px-2 py-2 font-normal text-right hidden sm:table-cell">Wert</th>
                  <th scope="col" className="px-2 py-2 font-normal text-right">
                    <span className="hidden sm:inline">Letzte </span>Änderung
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {holders.map(h => (
                  <tr key={h.slug} className="whitespace-nowrap">
                    {/* max-w-0 + w-full: Namensspalte nimmt den Restplatz und kürzt statt zu überlaufen */}
                    <td className="px-2 py-3 max-w-0 w-full">
                      <Link href={`/superinvestor/${h.slug}`} className="group flex items-center gap-3 min-w-0">
                        <InvestorAvatar name={h.name} imageUrl={h.imageUrl} />
                        <span className="min-w-0">
                          <span className="block truncate text-theme-primary group-hover:underline underline-offset-4">{h.name}</span>
                          {h.firm && <span className="block truncate text-xs text-theme-muted">{h.firm}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-theme-primary">{formatShare(h.portfolioShare)}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-theme-secondary hidden sm:table-cell">≈ {formatUsdCompact(h.value)}</td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      <ChangeCell holder={h} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {soldOut.length > 0 && (
        <p className="mt-6 text-sm text-theme-secondary">
          <span className="text-theme-muted">Komplett verkauft: </span>
          {soldOut.map((seller, i) => (
            <span key={seller.slug}>
              {i > 0 && ', '}
              <Link href={`/superinvestor/${seller.slug}`} className="text-theme-primary hover:underline underline-offset-4">
                {seller.name}
              </Link>{' '}
              <span className="text-theme-muted">({seller.periodLabel})</span>
            </span>
          ))}
        </p>
      )}

      <p className="mt-6 text-xs text-theme-muted">
        Quelle: 13F-Filings bei der SEC, nur Aktienpositionen. Das Quartal steht jeweils für den Stand des letzten Filings
        dieses Investors.{' '}
        <Link href="/superinvestor" className="underline underline-offset-4 hover:text-theme-primary">
          Alle Superinvestoren ansehen
        </Link>
      </p>
    </section>
  )
}

// — Seite —

export default async function StockPage({ params }: Props) {
  if (params.ticker !== params.ticker.toLowerCase()) permanentRedirect(`/aktie/${params.ticker.toLowerCase()}`)

  const s = await loadStock(params.ticker)
  if (!s) notFound()

  const { profile: p, quote: q } = s.market
  const currency = p?.currency ?? 'USD'
  const facts = keyFacts(s)
  const intro = introSentences(s)
  const meta = [s.ticker, p?.exchange, p?.sector ? translateSector(p.sector) : null].filter(Boolean)
  const asOf = formatTimestamp(q?.timestamp ?? null)

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-4">
        {/* Kopf */}
        <section className="bg-theme-card border border-theme-light rounded-xl p-6 lg:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <Logo ticker={s.ticker} src={logoSrc(s)} alt={s.name} className="w-12 h-12 rounded-xl shrink-0 bg-white" />
              <div className="min-w-0">
                <h1 className="text-2xl lg:text-3xl font-semibold text-theme-primary">{s.heading}</h1>
                <p className="mt-1 text-sm text-theme-muted">{meta.join(' · ')}</p>
              </div>
            </div>

            {q && (
              <div className="sm:text-right">
                <div className="text-2xl lg:text-3xl font-semibold tabular-nums text-theme-primary">{formatMoney(q.price, currency)}</div>
                <div className={`text-sm tabular-nums ${q.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {q.change >= 0 ? '+' : '−'}
                  {formatMoney(Math.abs(q.change), currency)} ({formatSignedPercent(q.changePercent)})
                </div>
                {asOf && <div className="mt-1 text-xs text-theme-muted">Stand: {asOf} · verzögert</div>}
              </div>
            )}
          </div>

          {intro.length > 0 && <p className="mt-6 max-w-3xl text-sm leading-relaxed text-theme-secondary">{intro.join(' ')}</p>}

          <div className="mt-6">
            <Link
              href={`/analyse/stocks/${s.slug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-medium rounded-lg transition-colors hover:bg-neutral-100"
            >
              Vollständige Analyse öffnen
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Kennzahlen */}
        {facts.length > 0 && (
          <section aria-labelledby="kennzahlen" className="bg-theme-card border border-theme-light rounded-xl p-6 lg:p-8">
            <h2 id="kennzahlen" className="text-lg font-semibold text-theme-primary">
              Kennzahlen
            </h2>
            <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
              {facts.map(f => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-xs text-theme-muted">{f.label}</dt>
                  <dd className="mt-1 text-sm text-theme-primary tabular-nums break-words">{f.value}</dd>
                </div>
              ))}
            </dl>
            {s.quality && affectsPe(s.quality, q?.pe) && (
              <p className="mt-6 max-w-3xl text-xs leading-relaxed text-theme-muted">{describeEarnings(s.quality).long}</p>
            )}
          </section>
        )}

        <SuperinvestorSection s={s} />

        <p className="text-xs text-theme-muted">Keine Anlageberatung.</p>
      </div>
    </div>
  )
}
