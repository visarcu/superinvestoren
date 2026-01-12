// components/SimpleThemeToggle.tsx
'use client'

import { useTheme } from '@/lib/useTheme'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function SimpleThemeToggle() {
  const { theme, toggleTheme, mounted, lightThemeDisabled } = useTheme()

  // Verhindere Hydration-Fehler
  if (!mounted) {
    return (
      <div className="w-10 h-10 bg-theme-tertiary rounded-lg animate-pulse"></div>
    )
  }

  // ✅ Light Theme deaktiviert: Sichtbar aber disabled mit Tooltip
  if (lightThemeDisabled) {
    return (
      <div className="relative group">
        <div className="p-2 rounded-lg bg-neutral-800/50 opacity-50 cursor-not-allowed">
          <SunIcon className="w-5 h-5 text-neutral-500" />
        </div>
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          <p className="text-xs text-neutral-400">Light Theme wird überarbeitet</p>
          <p className="text-xs text-amber-500">Bald verfügbar</p>
        </div>
      </div>
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
  const { theme, toggleTheme, mounted, lightThemeDisabled } = useTheme()

  if (!mounted) return null

  // ✅ Light Theme deaktiviert: Sichtbar aber disabled mit Tooltip
  if (lightThemeDisabled) {
    return (
      <div className="relative group">
        <div className="p-1 rounded opacity-50 cursor-not-allowed">
          <SunIcon className="w-3.5 h-3.5 text-neutral-500" />
        </div>
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          <p className="text-xs text-neutral-400">Light Theme wird überarbeitet</p>
          <p className="text-xs text-amber-500">Bald verfügbar</p>
        </div>
      </div>
    )
  }

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