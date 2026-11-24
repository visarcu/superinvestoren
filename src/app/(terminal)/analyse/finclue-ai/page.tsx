// src/app/analyse/finclue-ai/page.tsx - Finclue AI
'use client'

import { useEffect, useState } from 'react'
import FinclueAI from '@/components/ai/FinclueAI'
import FinclueAiPage from '@/components/finclue-ai/FinclueAiPage'
import { aiFetch } from '@/components/finclue-ai/useFinclueAi'
import type { AiQuota, AiThreadSummary } from '@/lib/ai/types'

interface Setup {
  zugang: boolean
  premium: boolean
  eingerichtet: boolean
  threads: AiThreadSummary[]
  quota: AiQuota
  hatDepot?: boolean
}

export default function Page() {
  const [setup, setSetup] = useState<Setup | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    aiFetch('/api/ai/threads')
      .then(async res => {
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (active) setSetup(data)
      })
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [])

  if (failed) {
    return <p className="p-8 text-sm text-theme-muted">Finclue AI ist gerade nicht erreichbar. Bitte lade die Seite neu.</p>
  }
  if (!setup) return <div className="h-full" aria-busy="true" />

  // Außerhalb der Beta bleibt die bisherige KI, bis die neue für alle offen ist
  if (!setup.zugang) {
    return (
      <div className="h-full">
        <FinclueAI ticker={null} isPremium={setup.premium} />
      </div>
    )
  }
  return <FinclueAiPage setup={setup} />
}
