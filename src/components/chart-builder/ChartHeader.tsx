// src/components/chart-builder/ChartHeader.tsx
'use client'

import { useState, useRef } from 'react'
import {
  BookmarkIcon,
  ArrowDownTrayIcon,
  FolderOpenIcon,
  SparklesIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { ChartBuilderState, ChartBuilderAction } from './types'
import html2canvas from 'html2canvas'

interface ChartHeaderProps {
  state: ChartBuilderState
  dispatch: React.Dispatch<ChartBuilderAction>
  onOpenPresets: () => void
  onOpenMyCharts: () => void
  isPremium: boolean
}

export default function ChartHeader({
  state,
  dispatch,
  onOpenPresets,
  onOpenMyCharts,
  isPremium,
}: ChartHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const handleTitleClick = () => {
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 50)
  }

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditingTitle(false)
    }
  }

  const downloadChart = async () => {
    const chartElement = document.getElementById('chart-builder-canvas')
    if (!chartElement) return

    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#0a0a0b',
        scale: 2,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `${state.title || 'chart'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Failed to download chart:', error)
    }
  }

  // Generate auto-title from stocks and metrics
  const autoTitle = () => {
    if (state.stocks.length === 0) return 'Aktien-Vergleich'
    const metricLabels = [...new Set(state.activeMetrics.map(m => {
      const parts = m.metricKey
      return parts
    }))]
    const stockStr = state.stocks.join(', ')
    return state.activeMetrics.length > 0
      ? `${stockStr} - ${state.activeMetrics.length} Metriken`
      : stockStr
  }

  const displayTitle = state.title || autoTitle()

  return (
    <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 pb-4 border-b border-white/[0.05]">
      {/* Left: Tagline + Title */}
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium mb-1.5">
          Tools · Aktien-Vergleich
        </p>
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={state.title}
            onChange={e => dispatch({ type: 'SET_TITLE', title: e.target.value })}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            placeholder="Chart-Titel..."
            className="text-[22px] font-semibold text-theme-primary bg-transparent border-b border-brand/50 outline-none w-full max-w-md tracking-tight"
          />
        ) : (
          <button
            onClick={handleTitleClick}
            className="group flex items-center gap-2 text-[22px] font-semibold text-theme-primary hover:text-brand-light transition-colors truncate tracking-tight"
          >
            <span className="truncate">{displayTitle}</span>
            <PencilIcon className="w-3.5 h-3.5 text-theme-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-white/60 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-all"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          Vorlagen
        </button>

        <button
          onClick={onOpenMyCharts}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-white/60 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-all"
        >
          <FolderOpenIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Meine Graphen</span>
        </button>

        <button
          onClick={downloadChart}
          disabled={state.activeMetrics.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-white/60 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          title="Als Bild herunterladen"
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download</span>
        </button>

        {!isPremium && (
          <a
            href="/pricing"
            className="flex items-center gap-1.5 ml-1 px-3 py-2 text-[12px] font-medium text-amber-300/95 bg-amber-400/[0.08] hover:bg-amber-400/[0.12] border border-amber-400/15 hover:border-amber-400/25 rounded-xl transition-all"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            Premium
          </a>
        )}
      </div>
    </div>
  )
}
