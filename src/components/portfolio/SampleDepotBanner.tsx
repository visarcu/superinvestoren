'use client'
// Hinweis im Beispieldepot: woher die Positionen kommen und wie es weitergeht
// (eigenes Depot anlegen oder Beispiel wieder löschen).

import React, { useState } from 'react'
import Link from 'next/link'
import { BeakerIcon } from '@heroicons/react/24/outline'
import { SAMPLE_DEPOT_START_VALUE_EUR } from '@/lib/sampleDepotShared'

function formatDate(iso: string | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

export default function SampleDepotBanner({
  depotName,
  purchaseDate,
  newDepotHref,
  onDelete,
  excluded,
}: {
  depotName: string
  purchaseDate?: string
  newDepotHref: string
  onDelete: () => Promise<void>
  /** Es gibt ein eigenes Depot, das Beispieldepot zählt daher nicht in "Alle Depots" */
  excluded: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  const date = formatDate(purchaseDate)
  const investor = depotName.replace(/^Beispieldepot:\s*/, '')

  async function handleDelete() {
    if (!window.confirm('Beispieldepot wirklich löschen? Deine eigenen Depots bleiben unverändert.')) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-theme bg-theme-card p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3 min-w-0">
        <BeakerIcon className="h-5 w-5 shrink-0 text-theme-muted mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-theme-primary">Das ist ein Beispieldepot</p>
          <p className="mt-1 text-[13px] leading-relaxed text-theme-muted">
            Die zehn größten Positionen aus {investor}s letztem 13F, so gekauft, als hätte man
            {date ? ` am ${date}` : ' vor drei Jahren'} {SAMPLE_DEPOT_START_VALUE_EUR.toLocaleString('de-DE')} € investiert. Kurse und
            seitdem gezahlte Dividenden (nach 15 % US-Quellensteuer) sind echt. Schau dir in Ruhe Rendite, Dividenden
            und Analyse an.{excluded && ' In „Alle Depots“ zählt es nicht mit.'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={newDepotHref}
          className="inline-flex items-center justify-center rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-black hover:bg-neutral-200"
        >
          Eigenes Depot anlegen
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center justify-center rounded-lg border border-theme px-3.5 py-2 text-sm text-theme-secondary hover:bg-theme-hover hover:text-theme-primary disabled:opacity-60"
        >
          {deleting ? 'Wird gelöscht …' : 'Beispieldepot löschen'}
        </button>
      </div>
    </section>
  )
}
