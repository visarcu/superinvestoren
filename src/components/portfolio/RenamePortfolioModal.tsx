'use client'

import React, { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface RenamePortfolioModalProps {
  open: boolean
  currentName: string
  onClose: () => void
  onSave: (name: string) => Promise<void>
}

export default function RenamePortfolioModal({ open, currentName, onClose, onSave }: RenamePortfolioModalProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName(currentName)
  }, [open, currentName])

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      await onSave(name)
      onClose()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="terminal-glass-strong rounded-xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-theme-primary">Portfolio umbenennen</h2>
          <button onClick={onClose} className="p-1 hover:bg-theme-hover rounded transition-colors">
            <XMarkIcon className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Portfolio-Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Hauptdepot, Sparplan, etc."
              maxLength={50}
              autoFocus
              className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!name.trim() || name.trim() === currentName}
              className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Speichern
            </button>
            <button onClick={onClose} className="flex-1 py-2 border border-theme hover:bg-theme-hover text-theme-primary rounded-lg transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
