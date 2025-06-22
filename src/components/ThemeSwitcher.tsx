// src/components/ThemeSwitcher.tsx
'use client'

import { useState, useEffect } from 'react'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

type Theme = 'light' | 'dark' | 'system'

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Hydration fix
  useEffect(() => {
    setMounted(true)
    
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
    } else {
      setTheme('light') // Default zu hell
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark')
    
    if (theme === 'system') {
      // Use system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  // Listen to system theme changes when system is selected
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(mediaQuery.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  if (!mounted) {
    return (
      <div className="w-8 h-8 bg-theme-hover rounded-lg animate-pulse"></div>
    )
  }

  const themes: { key: Theme; icon: React.ComponentType<any>; label: string }[] = [
    { key: 'light', icon: SunIcon, label: 'Hell' },
    { key: 'dark', icon: MoonIcon, label: 'Dunkel' },
    { key: 'system', icon: ComputerDesktopIcon, label: 'System' }
  ]

  return (
    <div className="relative">
      {/* Current Theme Button */}
      <button
        className="flex items-center gap-2 px-3 py-2 bg-theme-card border border-theme rounded-lg hover:bg-theme-hover transition-all duration-200"
        onClick={() => {
          // Cycle through themes
          const currentIndex = themes.findIndex(t => t.key === theme)
          const nextIndex = (currentIndex + 1) % themes.length
          setTheme(themes[nextIndex].key)
        }}
      >
        {(() => {
          const currentTheme = themes.find(t => t.key === theme)
          const IconComponent = currentTheme?.icon || SunIcon
          return (
            <>
              <IconComponent className="w-4 h-4 text-theme-secondary" />
              <span className="text-sm font-medium text-theme-secondary hidden sm:block">
                {currentTheme?.label}
              </span>
            </>
          )
        })()}
      </button>

      {/* Optional: Dropdown Version (if you prefer) */}
      {/* 
      <div className="absolute right-0 mt-2 w-32 bg-theme-card border border-theme rounded-lg shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        {themes.map((themeOption) => {
          const IconComponent = themeOption.icon
          return (
            <button
              key={themeOption.key}
              onClick={() => setTheme(themeOption.key)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-theme-hover transition-colors ${
                theme === themeOption.key ? 'text-accent-primary' : 'text-theme-secondary'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {themeOption.label}
            </button>
          )
        })}
      </div>
      */}
    </div>
  )
}

// Alternative: Simple Toggle Version
export function SimpleThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme')
    const isDarkMode = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(isDarkMode)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark, mounted])

  if (!mounted) {
    return <div className="w-8 h-8 bg-theme-hover rounded-lg animate-pulse"></div>
  }

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="relative w-12 h-6 bg-theme-tertiary rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 flex items-center justify-center ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <MoonIcon className="w-3 h-3 text-gray-600" />
        ) : (
          <SunIcon className="w-3 h-3 text-yellow-500" />
        )}
      </div>
    </button>
  )
}