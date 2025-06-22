// lib/useTheme.ts - Optimierter Theme Hook (behält deine Struktur bei)
'use client'

import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark') // Default dark (wie vorher)
  const [mounted, setMounted] = useState(false)

  // Client-side mounting
  useEffect(() => {
    setMounted(true)
    
    // Theme aus localStorage laden
    const savedTheme = localStorage.getItem('finclue-theme') as Theme | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
    // Kein System-Theme override - User behält Kontrolle
  }, [])

  // Theme auf document anwenden (wie dein alter Code)
  useEffect(() => {
    if (!mounted) return

    // Entferne alle Theme-Klassen
    document.documentElement.classList.remove('light', 'dark')
    
    // Füge aktuelle Theme-Klasse hinzu
    document.documentElement.classList.add(theme)
    
    // In localStorage speichern (wie vorher)
    localStorage.setItem('finclue-theme', theme)
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return { 
    theme, 
    toggleTheme,
    mounted // Für SSR-safe rendering
  }
}

// Bonus: Theme Provider für App-weite Verwaltung
export function useThemeProvider() {
  const { theme, toggleTheme, mounted } = useTheme()

  const isDark = theme === 'dark'
  const isLight = theme === 'light'

  return {
    theme,
    isDark,
    isLight,
    toggleTheme,
    mounted
  }
}