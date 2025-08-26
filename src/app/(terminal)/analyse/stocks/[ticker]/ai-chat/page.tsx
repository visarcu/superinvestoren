// src/app/analyse/[ticker]/ai-chat/page.tsx - REDIRECT zu Unified AI
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface TickerAIChatRedirectProps {
  params: {
    ticker: string
  }
}

export default function TickerAIChatRedirect({ params }: TickerAIChatRedirectProps) {
  const router = useRouter()
  const ticker = params.ticker.toUpperCase()

  useEffect(() => {
    // ✅ Redirect to global FinClue AI (no ticker parameter)
    const globalAiUrl = `/analyse/finclue-ai`
    console.log(`🔄 Redirecting ${ticker} AI chat to global FinClue AI: ${globalAiUrl}`)
    router.replace(globalAiUrl)
  }, [router, ticker])

  // Show loading state during redirect
  return (
    <div className="min-h-screen bg-theme-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <SparklesIcon className="w-8 h-8 text-purple-400 animate-pulse" />
        </div>
        <h2 className="text-xl font-semibold text-theme-primary mb-3">
          Wechsle zu Global FinClue AI
        </h2>
        <p className="text-theme-secondary mb-6">
          Leite weiter zur globalen FinClue AI...
        </p>
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
}