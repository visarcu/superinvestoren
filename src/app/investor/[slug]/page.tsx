// src/app/investor/[slug]/page.tsx
import { investors, Investor } from '../../../data/investors'
import { notFound }            from 'next/navigation'
import Link                    from 'next/link'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return investors.map(inv => ({ slug: inv.slug }))
}

export default async function InvestorPage({ params }: PageProps) {
  const { slug } = await params
  const inv = investors.find(i => i.slug === slug) ?? notFound()

  // Nach Gewichtung sortieren
  const sorted = [...inv.holdings].sort((a, b) => b.weight - a.weight)

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-8">
      <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Zurück
      </Link>

      <h1 className="text-4xl font-bold mb-2">{inv.name}</h1>
      <p className="text-gray-500 mb-6">
        Letzte Aktualisierung: {sorted[0]?.lastUpdated}
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                Symbol / Name
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                Gewichtung
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                Wert
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                Letzte Aktion
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                Datum
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sorted.map((h, i) => (
              <tr
                key={h.ticker}
                className={`hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  i % 2 === 0
                    ? 'bg-white dark:bg-gray-900'
                    : 'bg-gray-50 dark:bg-gray-850'
                }`}
              >
                <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                  <Link
                    href={`/aktie/${h.ticker.toLowerCase()}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {h.ticker}
                  </Link>
                  <span className="ml-2 text-gray-600 dark:text-gray-400 text-xs">
                    {h.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-gray-200">
                  {h.weight.toFixed(2)} %
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-gray-200">
                  {h.marketValue.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </td>
                <td className="px-4 py-3 text-sm text-center space-y-1">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      h.action === 'buy'
                        ? 'bg-green-100 text-green-800'
                        : h.action === 'sell'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {h.action === 'buy'
                      ? 'Gekauft'
                      : h.action === 'sell'
                      ? 'Verkauft'
                      : 'Unverändert'}
                  </span>
                  {typeof h.changePercent === 'number' && (
                    <span
                      className={`block text-xs font-medium ${
                        h.changePercent > 0
                          ? 'text-green-600'
                          : h.changePercent < 0
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {h.changePercent > 0 ? '+' : ''}
                      {h.changePercent.toFixed(1)} %
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                  {h.lastUpdated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
