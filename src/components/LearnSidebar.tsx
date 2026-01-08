// components/LearnSidebar.tsx - FIXED CLICK ISSUE
'use client'

import React, { useState, useEffect } from 'react'
import { AcademicCapIcon, XMarkIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { useLearnMode } from '@/lib/LearnModeContext'
import { LEARN_DEFINITIONS, getKeyFromGermanTerm } from '@/data/learnDefinitions'

interface LearnSidebarProps {
  currentTerm?: string
}

// ✅ GREEN LEARN TOOLTIP BUTTON
export function LearnTooltipButton({ 
  term, 
  className = "" 
}: { 
  term: string; 
  className?: string 
}) {
  const { isLearnMode } = useLearnMode()
  
  if (!isLearnMode) return null

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // ✅ Verhindert Event Bubbling
    
    window.dispatchEvent(new CustomEvent('openLearnSidebar', { 
      detail: { term } 
    }))
  }

  return (
    <button
      onClick={handleClick}
      className={`group relative p-1.5 text-brand-light/60 hover:text-brand-light transition-all duration-200 ${className}`}
      aria-label={`Erklärung: ${term}`}
    >
      {/* Green background on hover */}
      <div className="absolute inset-0 bg-brand/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      
      {/* Academic Cap Icon */}
      <AcademicCapIcon className="relative w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
      
      {/* Green indicator dot */}
      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full opacity-60"></div>
    </button>
  )
}

// ✅ MAIN SIDEBAR - GREEN DESIGN WITH FIXED CLICK HANDLING
export default function LearnSidebar({ currentTerm }: LearnSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTerm, setActiveTerm] = useState<string | null>(currentTerm || null)
  const { isLearnMode } = useLearnMode()

  // Listen for sidebar open events with German mapping
  useEffect(() => {
    const handleOpenSidebar = (event: CustomEvent) => {
      const originalTerm = event.detail.term
      const englishKey = getKeyFromGermanTerm(originalTerm)
      
      if (englishKey) {
        setActiveTerm(englishKey)
        setIsOpen(true)
      } else {
        setActiveTerm(originalTerm)
        setIsOpen(true)
      }
    }

    window.addEventListener('openLearnSidebar', handleOpenSidebar as EventListener)
    return () => {
      window.removeEventListener('openLearnSidebar', handleOpenSidebar as EventListener)
    }
  }, [])

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  // ✅ FIXED: Close sidebar handler
  const closeSidebar = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(false)
  }

  // ✅ FIXED: Prevent sidebar content clicks from closing
  const handleSidebarClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Verhindert dass Clicks in der Sidebar sie schließen
  }

  if (!isLearnMode) return null

  const termData = activeTerm && activeTerm in LEARN_DEFINITIONS 
    ? LEARN_DEFINITIONS[activeTerm as keyof typeof LEARN_DEFINITIONS] 
    : null

  return (
    <>
      {/* ✅ FIXED: Overlay mit korrektem Event Handling */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={closeSidebar} // ✅ Dedicated close handler
        />
      )}

      {/* ✅ FIXED: Sidebar mit Event Stopping */}
      <div 
        className={`
          fixed top-0 right-0 h-full w-96 bg-theme-card border-l border-theme shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          max-w-[calc(100vw-2rem)]
        `}
        onClick={handleSidebarClick} // ✅ Verhindert Close beim Klick in Sidebar
      >
        
        {/* Header - GREEN */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <div className="flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-brand-light" />
            <h3 className="text-lg font-semibold text-theme-primary">Finanz-Lexikon</h3>
          </div>
          <button
            onClick={closeSidebar} // ✅ Dedicated close handler
            className="p-1 text-theme-muted hover:text-theme-primary transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-full pb-20">
          {termData ? (
            <div className="space-y-6">
              {/* Current Term */}
              <div>
                <h4 className="text-xl font-bold text-theme-primary mb-3">{termData.term}</h4>
                <p className="text-sm text-theme-secondary leading-relaxed mb-4">
                  {termData.definition}
                </p>
                
                {termData.calculation && (
                  <div className="bg-theme-secondary/30 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
                      🔢 Berechnung:
                    </h5>
                    <p className="text-sm text-theme-secondary font-mono bg-theme-tertiary/30 rounded p-2">
                      {termData.calculation}
                    </p>
                  </div>
                )}
                
                {termData.example && (
                  <div className="bg-brand/10 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-semibold text-brand-light mb-2 flex items-center gap-2">
                      💡 Beispiel:
                    </h5>
                    <p className="text-sm text-theme-secondary">{termData.example}</p>
                  </div>
                )}
              </div>

              {/* Related Terms */}
              <div>
                <h5 className="text-lg font-semibold text-theme-primary mb-3">Verwandte Begriffe</h5>
                <div className="space-y-2">
                  {Object.entries(LEARN_DEFINITIONS)
                    .filter(([key]) => key !== activeTerm)
                    .slice(0, 6)
                    .map(([key, data]) => (
                      <button
                        key={key}
                        onClick={(e) => {
                          e.stopPropagation() // ✅ Event Stopping
                          setActiveTerm(key)
                        }}
                        className="w-full text-left p-3 bg-theme-secondary/20 hover:bg-theme-secondary/40 rounded-lg transition-colors"
                      >
                        <div className="font-medium text-theme-primary text-sm">{data.term}</div>
                        <div className="text-xs text-theme-muted mt-1">
                          {data.definition.slice(0, 80)}...
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* All Terms */}
              <div>
                <h5 className="text-lg font-semibold text-theme-primary mb-3">Alle Begriffe</h5>
                <div className="grid grid-cols-1 gap-1">
                  {Object.entries(LEARN_DEFINITIONS).map(([key, data]) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation() // ✅ Event Stopping
                        setActiveTerm(key)
                      }}
                      className={`text-left p-2 rounded text-sm transition-colors ${
                        activeTerm === key 
                          ? 'bg-brand/20 text-brand-light font-medium'
                          : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/30'
                      }`}
                    >
                      {data.term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpenIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-theme-primary mb-2">Willkommen im Finanz-Lexikon</h4>
              <p className="text-sm text-theme-muted mb-6">
                Klicke auf ein 🎓 Icon neben einer Kennzahl um mehr zu erfahren.
              </p>
              
              {/* Quick Start */}
              <div className="space-y-2">
                <p className="text-xs text-theme-muted font-medium">Beliebte Begriffe:</p>
                {Object.entries(LEARN_DEFINITIONS).slice(0, 4).map(([key, data]) => (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation() // ✅ Event Stopping
                      setActiveTerm(key)
                    }}
                    className="block w-full p-2 bg-theme-secondary/20 hover:bg-theme-secondary/40 rounded text-sm text-theme-primary transition-colors"
                  >
                    {data.term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}