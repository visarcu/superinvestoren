'use client'

import React, { useEffect, useState } from 'react'
import type { Holding } from '@/hooks/usePortfolio'
import Logo from '@/components/Logo'
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface EditPositionModalProps {
  holding: Holding | null
  onClose: () => void
  onSave: (
    holdingId: string,
    updates: { quantity: number; purchase_price: number; purchase_date: string }
  ) => Promise<void>
}

export default function EditPositionModal({ holding, onClose, onSave }: EditPositionModalProps) {
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (holding) {
      setQuantity(holding.quantity.toString())
      setPrice((holding.purchase_price_display || holding.purchase_price).toString())
      setDate(holding.purchase_date)
    }
  }, [holding])

  if (!holding) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(holding.id, {
        quantity: parseFloat(quantity) || holding.quantity,
        purchase_price: parseFloat(price) || holding.purchase_price,
        purchase_date: date || holding.purchase_date,
      })
      onClose()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto"
      onClick={() => !saving && onClose()}
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="terminal-glass-strong rounded-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-theme">
            <div>
              <h2 className="text-[17px] font-semibold text-theme-primary tracking-tight">Position bearbeiten</h2>
              <p className="text-[12px] text-theme-muted mt-0.5">Menge, Einstandskurs oder Kaufdatum anpassen</p>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-hover transition-colors disabled:opacity-40"
              aria-label="Schließen"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Position */}
            <div className="flex items-center gap-3 rounded-xl border border-theme bg-theme-secondary px-4 py-3">
              <Logo ticker={holding.symbol} alt={holding.symbol} className="w-10 h-10 rounded-lg" padding="none" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-theme-primary truncate">{holding.symbol}</div>
                <div className="text-[12px] text-theme-muted truncate">{holding.name}</div>
              </div>
            </div>

            {/* Anzahl */}
            <div>
              <label className="block text-[12px] font-medium text-theme-secondary mb-2">Anzahl</label>
              <input
                type="number"
                step="0.00000001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3 bg-theme-input border border-theme rounded-xl text-theme-primary text-[15px] tabular-nums placeholder:text-theme-muted focus:outline-none focus:border-teal-400/50 transition-colors"
              />
            </div>

            {/* Einstandskurs */}
            <div>
              <label className="block text-[12px] font-medium text-theme-secondary mb-2">Einstandskurs (EUR)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 bg-theme-input border border-theme rounded-xl text-theme-primary text-[15px] tabular-nums placeholder:text-theme-muted focus:outline-none focus:border-teal-400/50 transition-colors"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-theme-muted">
                Bei Depotüberträgen nutzen wir automatisch den Schlusskurs am Übertragsdatum. Falls du den echten Original-Kaufkurs kennst (z.B. aus einem alten Kontoauszug), trag ihn hier ein — dann werden Rendite und Kursgewinn korrekt berechnet.
              </p>
            </div>

            {/* Kaufdatum */}
            <div>
              <label className="block text-[12px] font-medium text-theme-secondary mb-2">Kaufdatum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-theme-input border border-theme rounded-xl text-theme-primary text-[15px] tabular-nums placeholder:text-theme-muted focus:outline-none focus:border-teal-400/50 transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-theme flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 text-[13px] font-medium text-theme-secondary hover:text-theme-primary border border-theme hover:bg-theme-hover rounded-xl transition-colors disabled:opacity-40"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 text-[13px] font-medium bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 disabled:bg-theme-secondary disabled:text-theme-muted disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Speichert…
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
