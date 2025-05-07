'use client'
import { useEffect, useState } from 'react'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'

interface Quote {
  symbol: string
  price: number
  changesPercentage: number
}

export default function TickerBar() {
  const [quotes, setQuotes] = useState<Quote[]>([])

  useEffect(() => {
    fetch(
      '/api/quotes?symbols=BTC-USD,AAPL,MSFT,EURUSD,^GDAXI'
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setQuotes(data)
      })
  }, [])

  if (quotes.length === 0) return null

  return (
    <div className="bg-black text-white font-mono text-lg">
      <div className="max-w-screen-xl mx-auto flex overflow-x-auto divide-x divide-gray-700 py-2">
        {quotes.map((q) => {
          const up = q.changesPercentage >= 0
          return (
            <div
              key={q.symbol}
              className="flex items-baseline px-4 whitespace-nowrap"
            >
              <span className="font-bold mr-2">{q.symbol}</span>
              <span className="mr-2">{q.price.toFixed(2)}</span>
              <span className={up ? 'text-green-400' : 'text-red-400'}>
                {up ? <ArrowUpIcon className="inline w-4 h-4" /> : <ArrowDownIcon className="inline w-4 h-4" />}
                {Math.abs(q.changesPercentage).toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}