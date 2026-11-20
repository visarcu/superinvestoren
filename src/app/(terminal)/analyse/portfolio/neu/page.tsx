// src/app/(terminal)/analyse/portfolio/neu/page.tsx
// VEREINFACHT: Leitet zum Workspace weiter - Portfolio wird dort automatisch erstellt
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WORKSPACE_PATH, currentHostPath } from '@/lib/siteHosts'

export default function NewPortfolioPage() {
  const router = useRouter()

  useEffect(() => {
    // Portfolio wird automatisch im Workspace erstellt
    router.replace(currentHostPath(WORKSPACE_PATH))
  }, [router])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-neutral-500">Weiterleitung...</div>
    </div>
  )
}
