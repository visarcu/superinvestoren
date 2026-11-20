'use client'
// Frühere Adresse /analyse/portfolio/workspace?depot=…&view=…
// Normalerweise leitet schon die Middleware um; das hier greift nur, falls
// sie nicht gelaufen ist.

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { legacyWorkspaceTarget } from '@/lib/depotRoutes'
import { currentHostPath } from '@/lib/siteHosts'

export default function LegacyWorkspaceRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const target = legacyWorkspaceTarget(new URLSearchParams(searchParams.toString()))
    router.replace(currentHostPath(`${target.pathname}${target.search}`))
  }, [router, searchParams])

  return <div className="min-h-screen bg-theme-primary" />
}
