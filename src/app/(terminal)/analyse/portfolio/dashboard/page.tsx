// src/app/analyse/portfolio/dashboard/page.tsx
// Das klassische Dashboard ist vollständig im Workspace aufgegangen.
// Alte Links und Bookmarks (inkl. ?tab=) werden auf die Workspace-Views abgebildet.
'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { legacyWorkspaceTarget } from '@/lib/depotRoutes'
import { currentHostPath } from '@/lib/siteHosts'

const TAB_TO_VIEW: Record<string, string> = {
  positions: 'positions',
  analysis: 'analysis',
  dividends: 'dividends',
  'ai-analyse': 'ai',
  transactions: 'transactions',
}

export default function DashboardRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const tab = params.get('tab')
    params.delete('tab')
    const view = tab ? TAB_TO_VIEW[tab] : undefined
    if (view) params.set('view', view)
    const target = legacyWorkspaceTarget(params)
    router.replace(currentHostPath(`${target.pathname}${target.search}`))
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-neutral-500">Weiterleitung zum Portfolio...</div>
    </div>
  )
}
