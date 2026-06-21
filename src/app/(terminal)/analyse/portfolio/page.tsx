// src/app/(terminal)/analyse/portfolio/page.tsx
// Leitet zum Portfolio-Workspace weiter.
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PortfolioPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/analyse/portfolio/workspace?depot=all')
  }, [router])

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-neutral-500">Weiterleitung zum Portfolio...</div>
    </div>
  )
}
