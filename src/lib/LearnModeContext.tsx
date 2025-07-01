// src/lib/LearnModeContext.tsx - Global Learn Mode State
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface LearnModeContextType {
  isLearnMode: boolean
  toggleLearnMode: () => void
  setLearnMode: (enabled: boolean) => void
}

const LearnModeContext = createContext<LearnModeContextType | undefined>(undefined)

export function LearnModeProvider({ children }: { children: ReactNode }) {
  const [isLearnMode, setIsLearnMode] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLearnMode = localStorage.getItem('learnMode')
      if (storedLearnMode) {
        setIsLearnMode(storedLearnMode === 'true')
      }
    }
  }, [])

  // Save to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('learnMode', isLearnMode.toString())
    }
  }, [isLearnMode])

  const toggleLearnMode = () => {
    setIsLearnMode(prev => !prev)
  }

  const setLearnMode = (enabled: boolean) => {
    setIsLearnMode(enabled)
  }

  return (
    <LearnModeContext.Provider value={{ isLearnMode, toggleLearnMode, setLearnMode }}>
      {children}
    </LearnModeContext.Provider>
  )
}

export function useLearnMode() {
  const context = useContext(LearnModeContext)
  if (context === undefined) {
    throw new Error('useLearnMode must be used within a LearnModeProvider')
  }
  return context
}