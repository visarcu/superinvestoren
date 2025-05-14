// src/app/investor/[slug]/subscribe/page.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import InvestorSubscribeForm from '@/components/InvestorSubscribeForm'

export default function InvestorSubscribePage({
  params,
}: {
  params: { slug: string }
}) {
  const router = useRouter()
  const investorName =
    params.slug.charAt(0).toUpperCase() + params.slug.slice(1)

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* — Link zurück + Kopftext — */}
        <div className="flex flex-col justify-center space-y-6">
          <button
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-300 flex items-center gap-2"
          >
            ← Zurück
          </button>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Updates von {investorName} erhalten
          </h1>
          <p className="text-gray-400 text-lg">
            Trage deine E-Mail ein, wir benachrichtigen dich per E-Mail, sobald ein neues Filing
            von {investorName} vorliegt.
          </p>
        </div>

        {/* — Formular-Karte — */}
        <div className="bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-2xl p-8 space-y-6">
          <InvestorSubscribeForm
            investorId={params.slug}
            onSuccess={() => router.push(`/investor/${params.slug}`)}
          />

          <hr className="border-gray-700" />

          <ul className="space-y-4">
            {[
              'Notifications on big Trades',
              'Be the first to learn about new trades',
              "Investment ideas from the world's best",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-green-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}