'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useCookieConsent, type CookiePreferences } from '@/lib/useCookieConsent'

export function CookieConsent() {
  const { consentGiven, save } = useCookieConsent()
  const [isOpen, setIsOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false, // DSGVO: opt-in default
  })

  useEffect(() => {
    if (!consentGiven) {
      const timer = setTimeout(() => setIsOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [consentGiven])

  // Allow re-opening from outside (footer link)
  useEffect(() => {
    const handler = () => {
      setIsOpen(true)
      setShowDetails(true)
    }
    window.addEventListener('open-cookie-settings', handler)
    return () => window.removeEventListener('open-cookie-settings', handler)
  }, [])

  const handleAcceptAll = () => {
    save({ essential: true, analytics: true })
    setIsOpen(false)
  }

  const handleRejectAll = () => {
    save({ essential: true, analytics: false })
    setIsOpen(false)
  }

  const handleSavePreferences = () => {
    save({ ...preferences, essential: true })
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, type: 'spring', damping: 25 }}
          className="fixed bottom-4 right-4 z-[9999] max-w-md w-full p-4"
        >
          <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="p-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-brand/10 rounded-xl text-brand shrink-0">
                  <Cookie className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <h3 className="font-semibold text-white text-base">
                    Wir schätzen Ihre Privatsphäre
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Wir nutzen Cookies, um Ihr Erlebnis zu verbessern und Traffic zu analysieren. Essenzielle Cookies sind für die Grundfunktion erforderlich.
                  </p>
                </div>
              </div>

              {/* Details toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showDetails ? 'Weniger anzeigen' : 'Details anzeigen'}
              </button>

              {/* Cookie category toggles */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 space-y-2 overflow-hidden"
                  >
                    <CookieOption
                      label="Essenziell"
                      description="Notwendig für Auth, Sicherheit und Grundfunktionen."
                      checked={true}
                      disabled={true}
                      onChange={() => {}}
                    />
                    <CookieOption
                      label="Analyse"
                      description="Helfen uns zu verstehen, wie Sie Finclue nutzen (Vercel Analytics)."
                      checked={preferences.analytics}
                      onChange={(c) => setPreferences(prev => ({ ...prev, analytics: c }))}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex flex-col gap-2">
              {!showDetails ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAcceptAll}
                    className="py-2.5 px-4 bg-brand hover:bg-brand-hover text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Alles akzeptieren
                  </button>
                  <button
                    onClick={handleRejectAll}
                    className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    Ablehnen
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSavePreferences}
                    className="w-full py-2.5 px-4 bg-brand hover:bg-brand-hover text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    Auswahl speichern
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleAcceptAll}
                      className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs transition-colors"
                    >
                      Alle akzeptieren
                    </button>
                    <button
                      onClick={handleRejectAll}
                      className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs transition-colors"
                    >
                      Alle ablehnen
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CookieOption({
  label,
  description,
  checked,
  disabled = false,
  onChange
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm">{label}</div>
        <div className="text-xs text-neutral-500 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors flex items-center shrink-0 ${
          checked ? 'bg-brand' : 'bg-neutral-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ width: 40, height: 22 }}
        aria-label={`${label} ${checked ? 'aktiviert' : 'deaktiviert'}`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
