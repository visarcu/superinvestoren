'use client'

import React from 'react'
import Link from 'next/link'
import { CheckIcon, LockClosedIcon } from '@heroicons/react/24/outline'

interface PremiumUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
}

export default function PremiumUpgradeModal({ isOpen, onClose, feature }: PremiumUpgradeModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="terminal-glass-strong rounded-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <LockClosedIcon className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-theme-primary mb-2">Premium Feature</h2>
          <p className="text-theme-secondary text-sm">{feature}</p>
        </div>
        <div className="space-y-3 mb-6">
          {['Dividenden-Tracking & Prognosen', 'KI-Portfolio-Analyse', 'Performance-Insights & Analysen', 'Superinvestor-Overlap'].map(t => (
            <div key={t} className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckIcon className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-theme-secondary">{t}</span>
            </div>
          ))}
        </div>
        <div className="text-center mb-6 p-4 bg-theme-secondary rounded-xl">
          <div className="text-2xl font-bold text-theme-primary">9€<span className="text-base font-normal text-theme-secondary">/Monat</span></div>
          <p className="text-xs text-theme-muted mt-1">Jederzeit kündbar</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 text-sm font-medium bg-theme-secondary text-theme-secondary rounded-xl hover:bg-theme-hover transition-colors">
            Später
          </button>
          <Link href="/pricing" className="flex-1 px-4 py-3 text-sm font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-colors text-center">
            Jetzt upgraden
          </Link>
        </div>
      </div>
    </div>
  )
}
