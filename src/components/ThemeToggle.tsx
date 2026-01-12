// 2. components/ThemeToggle.tsx - EINHEITLICHE KOMPONENTE
'use client'

import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/useTheme'

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'compact'
  className?: string
}

export default function ThemeToggle({ variant = 'button', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted, lightThemeDisabled } = useTheme()

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`w-8 h-8 bg-theme-hover rounded-lg animate-pulse ${className}`} />
    )
  }

  // ✅ Light Theme deaktiviert: Sichtbar aber disabled mit "Bald verfügbar" Hinweis
  if (lightThemeDisabled) {
    if (variant === 'icon') {
      return (
        <div className={`relative group ${className}`}>
          <div className="p-2 rounded-lg bg-neutral-800/50 opacity-50 cursor-not-allowed">
            <SunIcon className="w-4 h-4 text-neutral-500" />
          </div>
          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <p className="text-xs text-neutral-400">Light Theme wird überarbeitet</p>
            <p className="text-xs text-amber-500">Bald verfügbar</p>
          </div>
        </div>
      )
    }

    if (variant === 'compact') {
      return (
        <div className={`relative group ${className}`}>
          <div className="flex items-center gap-2 px-2 py-1 bg-neutral-800/50 border border-neutral-700/30 rounded-lg opacity-50 cursor-not-allowed">
            <SunIcon className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs font-medium text-neutral-500 hidden sm:block">Light</span>
          </div>
          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <p className="text-xs text-neutral-400">Light Theme wird überarbeitet</p>
            <p className="text-xs text-amber-500">Bald verfügbar</p>
          </div>
        </div>
      )
    }

    // Default 'button' variant - disabled mit Hinweis
    return (
      <div className={`relative group ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 border border-neutral-700/30 rounded-lg opacity-60 cursor-not-allowed">
          <SunIcon className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-500">Light</span>
          <span className="text-xs text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-1">
            Bald
          </span>
        </div>
      </div>
    )
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors ${className}`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <SunIcon className="w-4 h-4" />
        ) : (
          <MoonIcon className="w-4 h-4" />
        )}
      </button>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-2 py-1 bg-theme-tertiary/30 hover:bg-theme-tertiary/50 border border-theme hover:border-green-500/30 rounded-lg transition-all duration-200 group ${className}`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <SunIcon className="w-3.5 h-3.5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
        ) : (
          <MoonIcon className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-500 transition-colors" />
        )}
        <span className="text-xs font-medium text-theme-secondary group-hover:text-theme-primary transition-colors hidden sm:block">
          {theme === 'dark' ? 'Hell' : 'Dunkel'}
        </span>
      </button>
    )
  }

  // Default 'button' variant
  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-2 bg-theme-card border border-theme rounded-lg hover:bg-theme-hover transition-all duration-200 ${className}`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <SunIcon className="w-4 h-4 text-yellow-400" />
      ) : (
        <MoonIcon className="w-4 h-4 text-blue-600" />
      )}
      <span className="text-sm font-medium text-theme-secondary">
        {theme === 'dark' ? 'Hell' : 'Dunkel'}
      </span>
    </button>
  )
}