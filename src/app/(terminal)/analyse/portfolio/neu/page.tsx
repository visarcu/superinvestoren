// src/app/(terminal)/analyse/portfolio/neu/page.tsx
// VEREINFACHT: Leitet zum Workspace weiter - Portfolio wird dort automatisch erstellt
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPortfolioPage() {
  const router = useRouter()

  useEffect(() => {
    // Portfolio wird automatisch im Workspace erstellt
    router.replace('/analyse/portfolio/workspace?depot=all')
  }, [router])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-neutral-500">Weiterleitung...</div>
    </div>
  )
}
