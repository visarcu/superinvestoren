// src/components/portfolio/AllocationBarList.tsx
// Gemeinsamer Baustein für Verteilungs-Karten (Analyse-Tab, Durchblick):
// gestapelter Kompositionsbalken + sortierte Liste, mit Hover-Sync in beide
// Richtungen — Segment hovern highlightet die Zeile und umgekehrt. Ohne den
// Sync ist die Farbzuordnung ab ~8 Kategorien nicht mehr leistbar und der
// Balken wäre reine Deko.
'use client'

import React, { useState } from 'react'

// Zurückhaltende Terminal-Palette statt Regenbogen: Teal-Abstufungen als
// Basis, wenige Akzente (Blau/Violett/Amber), Rest neutral — die hinteren
// Ränge sind kleine Positionen und dürfen optisch zurücktreten. Reihenfolge
// so verzahnt, dass benachbarte Segmente im Balken kontrastieren.
export const ALLOCATION_PALETTE = [
  '#2dd4bf', // teal-400 — Primärakzent
  '#3b82f6', // blue-500
  '#0d9488', // teal-600
  '#a78bfa', // violet-400
  '#0f766e', // teal-700
  '#f59e0b', // amber-500
  '#38bdf8', // sky-400
  '#64748b', // slate-500
  '#94a3b8', // slate-400
  '#475569', // slate-600
]

export interface AllocationItem {
  label: string
  percent: number
  color: string
}

export default function AllocationBarList({ items }: { items: AllocationItem[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (items.length === 0) return null

  return (
    <>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.06] mb-4">
        {items.map((item, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="transition-opacity duration-100"
            style={{
              width: `${item.percent}%`,
              backgroundColor: item.color,
              opacity: hovered === null || hovered === i ? 1 : 0.3,
            }}
            title={`${item.label}: ${item.percent.toFixed(1)}%`}
          />
        ))}
      </div>

      <div className="space-y-0.5">
        {items.map((item, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center justify-between rounded-md px-1.5 -mx-1.5 py-1 transition-colors ${
              hovered === i ? 'bg-white/[0.06]' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[12px] text-neutral-200 truncate">{item.label}</span>
            </div>
            <span className="text-[12px] font-medium text-white tabular-nums flex-shrink-0 ml-3">
              {item.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
