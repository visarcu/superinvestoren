// components/SimpleThemeToggle.tsx
'use client'

import { useTheme } from '@/lib/useTheme'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function SimpleThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme()

  // Verhindere Hydration-Fehler
  if (!mounted) {
    return (
      <div className="w-10 h-10 bg-theme-tertiary rounded-lg animate-pulse"></div>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 bg-theme-secondary border border-theme rounded-lg hover:bg-theme-tertiary hover:border-theme-hover transition-all duration-200 group"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <SunIcon className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
      ) : (
        <MoonIcon className="w-5 h-5 text-blue-600 group-hover:text-blue-500 transition-colors" />
      )}
    </button>
  )
}

// Alternative: Inline Toggle für Sidebar (wie in deinem Layout)
export function InlineThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme()

  if (!mounted) return null

  return (
    <button
      onClick={toggleTheme}
      className="p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <SunIcon className="w-3.5 h-3.5" />
      ) : (
        <MoonIcon className="w-3.5 h-3.5" />
      )}
    </button>
  )
}