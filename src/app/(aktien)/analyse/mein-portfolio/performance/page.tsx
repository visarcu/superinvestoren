// /analyse/mein-portfolio/performance – Performance-Detail (Server Component)
import type { Metadata } from 'next'
import PerformanceDetailClient from './_components/PerformanceDetailClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Performance',
  description: 'Performance-Analyse deines Portfolios mit TWR, XIRR und Benchmark-Vergleich.',
}

export default function PerformancePage() {
  return <PerformanceDetailClient />
}
