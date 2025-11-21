// lib/useTheme.ts - FIXED VERSION - Theme Toggle funktioniert wieder!
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // ✅ Routes die Theme Toggle haben dürfen
  const themeToggleRoutes = [
    '/analyse',
    '/dashboard',
    '/profile',
    '/settings'
  ]

  // ✅ Routes die IMMER dunkel sein sollen (spezifische zuerst!)
  const alwaysDarkRoutes = [
    '/pricing',
    '/auth',
    '/superinvestor', 
    '/news'
  ]

  // ✅ FIXED: Bessere Route-Matching Logic
  const allowsThemeToggle = themeToggleRoutes.some(route => 
    pathname.startsWith(route)
  )

  // ✅ FIXED: Homepage und spezifische Dark Routes
  const isAlwaysDark = pathname === '/' || alwaysDarkRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Client-side mounting und Theme laden
  useEffect(() => {
    setMounted(true)
    
    if (isAlwaysDark) {
      // ✅ Für Marketing-Seiten: IMMER dunkel
      setTheme('dark')
      applyTheme('dark')
      return
    }

    if (allowsThemeToggle) {
      // ✅ Für Terminal-Seiten: User-Präferenz laden
      const savedTheme = localStorage.getItem('finclue-terminal-theme') as Theme | null
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme)
        applyTheme(savedTheme)
      } else {
        // Standard: Terminal immer dunkel (wenn keine Einstellung gespeichert)
        const initialTheme = 'dark'
        setTheme(initialTheme)
        applyTheme(initialTheme)
        localStorage.setItem('finclue-terminal-theme', initialTheme)
      }
    } else {
      // ✅ Fallback: dunkel
      setTheme('dark')
      applyTheme('dark')
    }
  }, [pathname, isAlwaysDark, allowsThemeToggle])

  // ✅ Route-Change Handler
  useEffect(() => {
    if (!mounted) return

    if (isAlwaysDark) {
      // ✅ Zurück zu dunkel für Marketing-Seiten
      setTheme('dark')
      applyTheme('dark')
    } else if (allowsThemeToggle) {
      // ✅ Terminal-Theme wiederherstellen
      const savedTheme = localStorage.getItem('finclue-terminal-theme') as Theme | null
      if (savedTheme) {
        setTheme(savedTheme)
        applyTheme(savedTheme)
      }
    }
  }, [pathname, mounted, isAlwaysDark, allowsThemeToggle])

  // Hilfsfunktion um Theme anzuwenden
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // Theme wechseln (nur für Terminal-Routen)
  const toggleTheme = () => {
    if (!mounted || !allowsThemeToggle || isAlwaysDark) {
      return
    }
    
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    
    setTheme(newTheme)
    applyTheme(newTheme)
    // ✅ Separate Storage für Terminal-Theme
    localStorage.setItem('finclue-terminal-theme', newTheme)
  }

  return { 
    theme: isAlwaysDark ? 'dark' : theme, // ✅ Marketing-Seiten immer dunkel
    toggleTheme,
    mounted,
    allowsThemeToggle: allowsThemeToggle && !isAlwaysDark // ✅ Theme Toggle nur wo erlaubt
  }
}