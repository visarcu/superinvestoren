
'use client'

import Link from 'next/link'
import { superInvestorNews, NewsItem } from '@/data/news'

export default function NewsPage() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-4xl font-orbitron text-white">Superinvestor News</h1>
      <ul className="space-y-6">
        {superInvestorNews.map((item: NewsItem) => (
          <li
            key={item.date + item.title}
            className="bg-gray-800/60 p-6 rounded-2xl"
          >
            <div className="flex justify-between">
              <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
              <time className="text-gray-400">{item.date}</time>
            </div>
            <p className="mt-2 text-gray-300">{item.description}</p>
            {item.url && (
              <Link
                href={item.url}
                // bei externen URLs in neuem Tab öffnen
                target={item.url.startsWith('http') ? '_blank' : undefined}
                rel={
                  item.url.startsWith('http')
                    ? 'noopener noreferrer'
                    : undefined
                }
                className="mt-2 inline-block text-accent hover:underline"
              >
                Mehr erfahren →
                {item.source && (
                  <span className="ml-2 text-gray-500">({item.source})</span>
                )}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}