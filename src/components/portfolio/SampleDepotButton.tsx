'use client'
// "Mit Beispieldepot ausprobieren": legt über /api/portfolio/sample das
// Beispieldepot an (Buffetts Top 10, vor drei Jahren für 10.000 € gekauft) und
// öffnet es. So sehen neue Nutzer Rendite, Durchblick und Risiko sofort mit
// echten Daten statt eines leeren Bildschirms.

import React, { useState } from 'react'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { workspacePath } from '@/lib/depotRoutes'
import { currentHostPath } from '@/lib/siteHosts'

export default function SampleDepotButton({ className = '', variant = 'secondary' }: { className?: string; variant?: 'primary' | 'secondary' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadSample() {
    setBusy(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Bitte melde dich erneut an.')
      const res = await fetch('/api/portfolio/sample', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = (await res.json().catch(() => ({}))) as { portfolioId?: string; error?: string }
      if (!res.ok || !data.portfolioId) throw new Error(data.error ?? 'Beispieldepot konnte nicht geladen werden.')
      // Vollständig neu laden, damit Depotliste und Werte frisch sind (auch auf depot.finclue.de)
      window.location.assign(currentHostPath(workspacePath(data.portfolioId)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beispieldepot konnte nicht geladen werden.')
      setBusy(false)
    }
  }

  const styles =
    variant === 'primary'
      ? 'bg-white text-black hover:bg-neutral-200'
      : 'border border-theme text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'

  return (
    <div className={className}>
      <button
        type="button"
        onClick={loadSample}
        disabled={busy}
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${styles}`}
      >
        <BeakerIcon className="h-4 w-4" />
        {busy ? 'Beispieldepot wird geladen …' : 'Mit Beispieldepot ausprobieren'}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
