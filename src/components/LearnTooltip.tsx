// components/LearnTooltip.tsx - SIMPLE aber EFFEKTIVE Z-Index Lösung
import React, { useState } from 'react'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useLearnMode } from '@/lib/LearnModeContext'

interface LearnTooltipProps {
  term: string
  definition: string
  calculation?: string
  example?: string
  className?: string
}

const LearnTooltip: React.FC<LearnTooltipProps> = ({ 
  term, 
  definition, 
  calculation, 
  example,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { isLearnMode } = useLearnMode()

  // ✅ Nicht rendern wenn Learn Mode aus ist
  if (!isLearnMode) return null

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 text-theme-muted hover:text-blue-400 transition-colors ${className}`}
        aria-label={`Erklärung: ${term}`}
      >
        <QuestionMarkCircleIcon className="w-4 h-4" />
      </button>

      {/* ✅ SUPER HIGH Z-INDEX TOOLTIP - ohne body manipulation */}
      {isOpen && (
        <div 
          className="absolute w-80 p-4 bg-theme-card border border-theme rounded-lg shadow-2xl backdrop-blur-sm"
          style={{ 
            top: -8, 
            left: 24,
            zIndex: 999999999, // ✅ Noch höher als vorher
            position: 'absolute'
          }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Arrow */}
          <div 
            className="absolute w-2 h-2 bg-theme-card border-l border-t border-theme transform rotate-45"
            style={{
              left: -4,
              top: 16,
              zIndex: 999999999
            }}
          />
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-theme-primary">{term}</h4>
            
            <p className="text-xs text-theme-secondary leading-relaxed">
              {definition}
            </p>
            
            {calculation && (
              <div className="bg-theme-secondary/50 rounded p-2">
                <p className="text-xs text-theme-muted font-medium mb-1">Berechnung:</p>
                <p className="text-xs text-theme-secondary font-mono">{calculation}</p>
              </div>
            )}
            
            {example && (
              <div className="bg-blue-500/10 rounded p-2">
                <p className="text-xs text-blue-400 font-medium mb-1">Beispiel:</p>
                <p className="text-xs text-theme-secondary">{example}</p>
              </div>
            )}
            
            <div className="pt-2 border-t border-theme/50">
              <p className="text-xs text-theme-muted">
                💡 Mehr Details im{' '}
                <Link 
                  href="/lexikon" 
                  className="text-blue-400 hover:underline"
                  onClick={() => setIsOpen(false)}
                >
                  Lexikon
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LearnTooltip