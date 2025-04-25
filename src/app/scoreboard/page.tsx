// src/app/scoreboard/page.tsx
import Link from 'next/link'
import { getQuarterlyScores, ScoreItem } from '../../lib/scoreboard'

export const metadata = {
  title: 'Investor Scoreboard | SUPERINVESTOR',
}

export default async function ScoreboardPage() {
  // 1) die Scores holen
  const scores: ScoreItem[] = await getQuarterlyScores()

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-8">
      <h1 className="text-3xl font-bold mb-6">Investor Scoreboard</h1>

      {scores.length === 0 ? (
        <p>Keine Quartals-Daten verfügbar.</p>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2 text-left">Rang</th>
              <th className="px-4 py-2 text-left">Investor</th>
              <th className="px-4 py-2 text-left">Periode</th>
              <th className="px-4 py-2 text-right">Veränderung</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((item, i) => (
              <tr key={item.slug} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2">{i + 1}</td>
                <td className="px-4 py-2">
                  <Link
                    href={`/investor/${item.slug}`}
                    className="text-blue-600 hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{item.period}</td>
                <td className="px-4 py-2 text-right">
                  {(item.changePct * 100).toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}