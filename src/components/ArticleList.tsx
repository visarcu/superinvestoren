// src/components/ArticleList.tsx
'use client'

import React from 'react'
import Link from 'next/link'

export interface Article {
  date:  string  // ISO, z.B. "2025-04-04"
  title: string
  url:   string
}

export default function ArticleList({
  articles,
}: {
  articles: Article[]
}) {
  // sortiere nach Datum absteigend
  const sorted = [...articles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold mb-4">Articles &amp; Commentaries</h2>
      <ul className="divide-y">
        {sorted.map((a, i) => {
          const [y, m, d] = a.date.split('-')
          const formatted = `${d}.${m}.${y}`
          return (
            <li key={i} className="py-2">
              <span className="text-gray-600 mr-4">{formatted}</span>
              <Link
                href={a.url}
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                {a.title}
              </Link>
            </li>
          )
        })}
        {articles.length === 0 && (
          <li className="py-2 text-gray-500">No articles available.</li>
        )}
      </ul>
    </section>
  )
}