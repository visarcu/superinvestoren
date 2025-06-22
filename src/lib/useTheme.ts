// lib/useTheme.ts - Super einfacher Theme Hook
'use client'

import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    // Theme aus localStorage laden
    const saved = localStorage.getItem('finclue-theme') as 'light' | 'dark' | null
    if (saved) {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    // Theme auf document anwenden
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    
    // In localStorage speichern
    localStorage.setItem('finclue-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggleTheme }
}