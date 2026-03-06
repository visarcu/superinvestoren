// src/components/chart-builder/PresetModal.tsx
'use client'

import { useState, useMemo } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { ChartBuilderPreset, ChartBuilderAction } from './types'
import { BUILT_IN_PRESETS, getPresetsByCategory } from './presets'
import { getMetricDefinition } from './metricRegistry'

interface PresetModalProps {
  isOpen: boolean
  onClose: () => void
  dispatch: React.Dispatch<ChartBuilderAction>
  hasStocks: boolean
}

const PRESET_CATEGORIES = [
  { key: 'all', label: 'Alle' },
  { key: 'valuation', label: 'Bewertung' },
  { key: 'profitability', label: 'Profitabilität' },
  { key: 'financial', label: 'Finanzen' },
]

export default function PresetModal({ isOpen, onClose, dispatch, hasStocks }: PresetModalProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filteredPresets = useMemo(() => {
    let presets = activeCategory === 'all'
      ? BUILT_IN_PRESETS
      : getPresetsByCategory(activeCategory)

    if (search.trim()) {
      const q = search.toLowerCase()
      presets = presets.filter(
        p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      )
    }

    return presets
  }, [search, activeCategory])

  const applyPreset = (preset: ChartBuilderPreset) => {
    dispatch({ type: 'LOAD_PRESET', preset })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-theme-card border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-theme-primary">Vorlagen</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/[0.06] rounded-lg transition-colors">
            <XMarkIcon className="w-5 h-5 text-theme-muted" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Vorlage suchen..."
              className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-theme-primary placeholder-theme-muted focus:border-brand/50 focus:outline-none transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {PRESET_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeCategory === cat.key
                  ? 'bg-brand/20 text-brand-light'
                  : 'text-theme-muted hover:text-theme-secondary hover:bg-white/[0.04]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Preset List */}
        <div className="px-5 py-4 max-h-80 overflow-y-auto space-y-2">
          {filteredPresets.length === 0 ? (
            <p className="text-xs text-theme-muted text-center py-8">Keine Vorlagen gefunden</p>
          ) : (
            filteredPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                disabled={!hasStocks}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  hasStocks
                    ? 'border-white/[0.06] hover:border-brand/30 hover:bg-white/[0.03]'
                    : 'border-white/[0.04] opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-theme-primary">{preset.name}</h3>
                    <p className="text-[11px] text-theme-muted mt-0.5">{preset.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {preset.metrics.map(metricKey => {
                        const def = getMetricDefinition(metricKey)
                        return (
                          <span
                            key={metricKey}
                            className="text-[9px] px-1.5 py-0.5 bg-white/[0.06] text-theme-secondary rounded"
                          >
                            {def?.label || metricKey}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        {!hasStocks && (
          <div className="px-5 pb-4">
            <p className="text-[10px] text-theme-muted text-center">
              Füge zuerst eine Aktie hinzu, um eine Vorlage anzuwenden.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
