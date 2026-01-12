// src/app/(terminal)/analyse/portfolio/page.tsx
// VEREINFACHT: Leitet zum Dashboard weiter - Portfolio wird dort automatisch erstellt
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PortfolioPage() {
  const router = useRouter()

  useEffect(() => {
    // Portfolio wird automatisch im Dashboard erstellt
    router.replace('/analyse/portfolio/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-neutral-500">Weiterleitung zum Portfolio...</div>
    </div>
  )
}
