// lib/useTheme.ts - Dark Theme Only (Light Theme temporär deaktiviert)
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export type Theme = 'light' | 'dark'

// ✅ Feature Flag: Light Theme temporär deaktiviert
// Auf false setzen um Light Theme wieder zu aktivieren
export const LIGHT_THEME_DISABLED = false

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // ✅ Routes die Theme Toggle haben dürfen (wenn Light Theme aktiv)
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
  const allowsThemeToggle = !LIGHT_THEME_DISABLED && themeToggleRoutes.some(route =>
    pathname.startsWith(route)
  )

  // ✅ FIXED: Homepage und spezifische Dark Routes
  const isAlwaysDark = LIGHT_THEME_DISABLED || pathname === '/' || alwaysDarkRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Client-side mounting und Theme laden
  useEffect(() => {
    setMounted(true)

    // ✅ Light Theme deaktiviert: Immer dunkel
    if (LIGHT_THEME_DISABLED) {
      setTheme('dark')
      applyTheme('dark')
      // Alte Light-Theme Einstellung überschreiben
      localStorage.setItem('finclue-terminal-theme', 'dark')
      return
    }

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
        // Standard: Terminal jetzt DUNKEL
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
      root.classList.remove('light')
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
    }

    // Force repaint für CSS-Variablen Update
    document.body.style.display = 'none'
    document.body.offsetHeight // Trigger reflow
    document.body.style.display = ''
  }

  // Theme wechseln (nur für Terminal-Routen, wenn Light Theme aktiviert)
  const toggleTheme = () => {
    // ✅ Light Theme deaktiviert: Toggle ignorieren
    if (LIGHT_THEME_DISABLED) {
      return
    }

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
    allowsThemeToggle: allowsThemeToggle && !isAlwaysDark, // ✅ Theme Toggle nur wo erlaubt
    lightThemeDisabled: LIGHT_THEME_DISABLED // ✅ Für UI-Komponenten
  }
}