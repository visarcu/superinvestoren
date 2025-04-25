// src/app/activity/page.tsx
import { getRecentActivity, ActivityItem } from '@/lib/activity'
import Link from 'next/link'

export default async function ActivityPage() {
  const data: ActivityItem[] = await getRecentActivity()

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Letzte Quartals-Aktivität</h1>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2 text-left">Investor</th>
              <th className="px-4 py-2 text-left">Periode</th>
              <th className="px-4 py-2 text-left">Top 5 Hinzugefügt</th>
              <th className="px-4 py-2 text-left">Top 5 Verkauft</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ slug, name, period, topAdds, topRemovals }) => (
              <tr key={slug} className="odd:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/investor/${slug}`} className="text-blue-600 hover:underline">
                    {name}
                  </Link>
                </td>
                <td className="px-4 py-2">{period}</td>
                <td className="px-4 py-2">
                  {topAdds.length
                    ? topAdds.map(({ ticker, pct }) => (
                        <span key={ticker} className="mr-2">
                          <Link href={`/aktie/${ticker.toLowerCase()}`} className="text-green-700 hover:underline">
                            {ticker}
                          </Link>{' '}
                          {pct.toLocaleString('de-DE',{ style: 'percent', minimumFractionDigits: 2 })}
                        </span>
                      ))
                    : '–'}
                </td>
                <td className="px-4 py-2">
                  {topRemovals.length
                    ? topRemovals.map(({ ticker, pct }) => (
                        <span key={ticker} className="mr-2">
                          <Link href={`/aktie/${ticker.toLowerCase()}`} className="text-red-600 hover:underline">
                            {ticker}
                          </Link>{' '}
                          {pct.toLocaleString('de-DE',{ style: 'percent', minimumFractionDigits: 2 })}
                        </span>
                      ))
                    : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}