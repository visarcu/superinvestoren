'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Aggregated } from '../lib/aggregations'

export function BuyDetails({ data }: { data: Aggregated[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-lg text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
      >
        {open ? '▲ Weniger anzeigen' : '▼ Alle Käufe anzeigen'}
      </button>

      {open && (
        <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto list-disc list-inside text-on-surface dark:text-white">
          {data.map(item => (
            <li key={item.ticker}>
              <Link
                href={`/analyse/stocks/${item.ticker.toLowerCase()}/super-investors`}
                className="font-medium text-blue-600 hover:underline"
              >
                {item.ticker}
              </Link>{' '}
              – {item.count} Superinvestoren
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}