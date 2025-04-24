// src/app/investor/[slug]/page.tsx
import { notFound } from 'next/navigation'
import Image from 'next/image'
import fs from 'fs/promises'
import path from 'path'

interface Position {
  name: string
  cusip: string
  shares: number
  value: number
}

interface HoldingsFile {
  date: string
  positions: Position[]
}

export default async function InvestorPage({
  params,
}: {
  params: { slug: string }
}) {
  const slug = params.slug
  const basePath = path.resolve('src/data/holdings')
  const currentPath = path.join(basePath, `${slug}.json`)
  const prevPath = path.join(basePath, `${slug}-previous.json`)

  // 1) lade aktuelle Daten
  let current: HoldingsFile
  try {
    current = JSON.parse(await fs.readFile(currentPath, 'utf-8'))
  } catch {
    return notFound()
  }

  // 2) versuche, Vorperiode zu laden (wenn vorhanden)
  let previous: HoldingsFile | null = null
  try {
    previous = JSON.parse(await fs.readFile(prevPath, 'utf-8'))
  } catch {
    // kein Fehler, wenn's fehlt
  }

  const { date, positions } = current
  const totalValue = positions.reduce((sum, p) => sum + p.value, 0)

  // 3) formater
  const fmtShares = new Intl.NumberFormat('de-DE')
  const fmtValue = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const fmtPercent = new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // 4) Map der Vorperiode: cusip → shares
  const prevMap = new Map<string, number>()
  if (previous) {
    for (const p of previous.positions) {
      prevMap.set(p.cusip, p.shares)
    }
  }

  // 5) Sortiere nach Wert absteigend
  const sorted = [...positions].sort((a, b) => b.value - a.value)

  return (
    <main className="max-w-4xl mx-auto p-4">
      <div className="flex items-center mb-6">
        <div className="w-20 h-20 relative">
          <Image
            src={`/images/${slug}.png`}
            alt={slug}
            fill
            className="rounded-full object-cover"
          />
        </div>
        <div className="ml-4">
          <h1 className="text-3xl font-bold capitalize">{slug}</h1>
          <p className="text-gray-600">
            Aktualisiert am{' '}
            {new Date(date).toLocaleDateString('de-DE')}
          </p>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead className="bg-gray-200">
          <tr>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-right px-4 py-2">Shares</th>
            <th className="text-right px-4 py-2">Wert (USD)</th>
            <th className="text-right px-4 py-2">Anteil</th>
            <th className="text-right px-4 py-2">Letzte Änderung</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const prevShares = prevMap.get(p.cusip) ?? 0
            let changeLabel = '—'
            if (previous) {
              if (!prevMap.has(p.cusip)) {
                changeLabel = 'Gekauft'
              } else if (p.shares > prevShares) {
                const pct = (p.shares - prevShares) / prevShares
                changeLabel = `Hinzugefügt ${fmtPercent.format(pct)}`
              } else if (p.shares < prevShares) {
                const pct = (prevShares - p.shares) / prevShares
                changeLabel = `Verkauft ${fmtPercent.format(pct)}`
              } else {
                changeLabel = 'Unverändert'
              }
            }

            return (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 text-right">
                  {fmtShares.format(p.shares)}
                </td>
                <td className="px-4 py-2 text-right">
                  {fmtValue.format(p.value)}
                </td>
                <td className="px-4 py-2 text-right">
                  {fmtPercent.format(p.value / totalValue)}
                </td>
                <td className="px-4 py-2 text-right">{changeLabel}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
