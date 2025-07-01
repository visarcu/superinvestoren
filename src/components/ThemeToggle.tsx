// 2. components/ThemeToggle.tsx - EINHEITLICHE KOMPONENTE
'use client'

import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/useTheme'

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'compact'
  className?: string
}

export default function ThemeToggle({ variant = 'button', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme()

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`w-8 h-8 bg-theme-hover rounded-lg animate-pulse ${className}`} />
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