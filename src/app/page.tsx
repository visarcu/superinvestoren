// src/app/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { investors } from '../data/investors'
import { aggregateBuysByTicker } from '../lib/aggregations'
import { BuyDetails } from '../components/BuyDetails'

export default function Home() {
  const highlighted = ['buffett', 'ackman', 'burry', 'marks']
  const others      = investors.filter(inv => !highlighted.includes(inv.slug))
  const aggregated  = aggregateBuysByTicker(investors)

  return (
    <main className="flex-grow max-w-5xl mx-auto p-4 sm:p-8">
      {/* Titel & Tagline */}
      <h1 className="text-4xl font-bold mb-2 text-center">SUPERINVESTOR</h1>
      <p className="text-lg text-center text-gray-600 dark:text-gray-400 mb-8">
        Superinvestoren bewegen Märkte und beeinflussen Regierungen.  
        Verschaffe dir einen Vorsprung, indem du siehst, was sie kaufen –  
        und finde deine nächste Millionen-Aktie.
      </p>

      {/* Highlight-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {investors
          .filter(inv => highlighted.includes(inv.slug))
          .map(inv => (
            <Link
              key={inv.slug}
              href={`/investor/${inv.slug}`}
              className={`relative block bg-white dark:bg-surface-dark rounded-2xl shadow hover:shadow-lg transition p-6 flex flex-col items-center
                ${inv.slug === 'buffett' ? 'ring-4 ring-yellow-400' : ''}`}
            >
              {inv.slug === 'buffett' && (
                <span className="absolute top-3 right-3 text-yellow-400 text-2xl">
                  👑
                </span>
              )}
              {inv.imageUrl && (
                <div className="w-24 h-24 mb-4 relative">
                  <Image
                    src={inv.imageUrl}
                    alt={inv.name}
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
              )}
              <div className="text-2xl font-semibold text-center text-on-surface dark:text-white">
                {inv.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {inv.holdings.length} Position
                {investors.length !== 1 && 'en'}
              </div>
            </Link>
          ))}
      </div>

      {/* Zwei-Spalten: Liste links, Top-10 rechts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Links: Weitere Investoren */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Weitere Investoren</h2>
          <ul className="space-y-2 list-disc list-inside text-on-surface dark:text-white">
            {others.map(inv => (
              <li key={inv.slug}>
                <Link
                  href={`/investor/${inv.slug}`}
                  className="hover:underline text-lg text-gray-800 dark:text-gray-200"
                >
                  {inv.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Rechts: Top-10-Käufe & Drill-Down */}
        <section>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-semibold">
                Top 10 Käufe letztes Quartal
              </span>
              <div className="flex items-center space-x-1 text-sm text-green-600">
                <span>(Q1 2025)</span>
                <span className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  ℹ️
                </span>
              </div>
            </div>
            <ul className="space-y-1">
              {aggregated.slice(0, 10).map(item => (
                <li
                  key={item.ticker}
                  className="text-gray-800 dark:text-gray-200"
                >
                  <Link
                    href={`/aktie/${item.ticker.toLowerCase()}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {item.ticker}
                  </Link>{' '}
                  – {item.count} Superinvestoren
                </li>
              ))}
            </ul>
            {/* Collapse für alle Käufe */}
            <BuyDetails data={aggregated} />
          </div>
        </section>
      </div>
    </main>
  )
}
