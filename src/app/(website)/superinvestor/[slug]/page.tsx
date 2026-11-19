// Investor-Seite (Server): eigene Metadaten pro Investor, serverseitige
// Quartals-Zusammenfassung und nur die Daten DIESES Investors für den Client.
// Die interaktive Seite selbst liegt in InvestorPageClient.tsx.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import holdingsHistory from '@/data/holdings'
import { investorNames, splitInvestorName } from '@/data/investorNames'
import { formatIsoDate, formatUsdCompact } from '@/lib/displayFormat'
import { buildInvestorQuarterSummary } from '@/lib/investorQuarterSummary'
import InvestorQuarterSummary from '@/components/superinvestor/InvestorQuarterSummary'
import InvestorPageClient from './InvestorPageClient'

type Props = { params: { slug: string } }

function investorDisplay(slug: string) {
  return splitInvestorName(investorNames[slug] ?? slug)
}

export function generateMetadata({ params }: Props): Metadata {
  const snapshots = holdingsHistory[params.slug]
  if (!Array.isArray(snapshots) || snapshots.length === 0) return {}

  const { name, subtitle } = investorDisplay(params.slug)
  const s = buildInvestorQuarterSummary(params.slug, snapshots)
  const canonical = `/superinvestor/${params.slug}`
  if (!s) return { title: `${name} Portfolio`, alternates: { canonical } }

  const title = `${name} Portfolio ${s.periodLabel}: Käufe & Verkäufe`
  const who = subtitle ? `${name} (${subtitle})` : name
  const filed = formatIsoDate(s.filingDate)
  const description =
    `Was hat ${who} im ${s.periodLong} gekauft und verkauft? ` +
    `${s.positionCount} Positionen im Wert von ${formatUsdCompact(s.totalValue)}` +
    (filed ? ` laut 13F-Filing vom ${filed}` : '') +
    (s.top3.length ? `. Größte Positionen: ${s.top3.map(t => t.name).join(', ')}.` : '.')

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      siteName: 'Finclue',
      locale: 'de_DE',
      url: canonical,
      title,
      description,
      images: [{ url: '/laptop-finclue-preview.png', width: 1200, height: 630, alt: `${name} Portfolio auf Finclue` }],
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function InvestorPage({ params }: Props) {
  const snapshots = holdingsHistory[params.slug]
  if (!Array.isArray(snapshots) || snapshots.length === 0) notFound()

  const { name } = investorDisplay(params.slug)
  const summary = buildInvestorQuarterSummary(params.slug, snapshots)

  return (
    <InvestorPageClient
      params={params}
      snapshots={snapshots}
      summary={summary ? <InvestorQuarterSummary name={name} summary={summary} /> : null}
    />
  )
}
