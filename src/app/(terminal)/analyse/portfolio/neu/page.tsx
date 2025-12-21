// src/app/(terminal)/analyse/portfolio/neu/page.tsx
// VEREINFACHT: Leitet zum Dashboard weiter - Portfolio wird dort automatisch erstellt
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPortfolioPage() {
  const router = useRouter()

  useEffect(() => {
    // Portfolio wird automatisch im Dashboard erstellt
    router.replace('/analyse/portfolio/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-theme-primary flex items-center justify-center">
      <div className="text-theme-muted">Weiterleitung...</div>
    </div>
  )
}
