'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftOnRectangleIcon,
  ChevronDownIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/lib/useTheme'

export interface SidebarUser {
  id: string
  email: string
  isPremium: boolean
}

export interface SidebarNavItem {
  id: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  premium?: boolean
  isNew?: boolean
}

interface SidebarProps {
  user: SidebarUser
  pathname: string
  navItems: SidebarNavItem[]
  settingsItems: SidebarNavItem[]
  onOpenCommandPalette: () => void
  onSignOut: () => void
}

function useUnreadNotifications(userId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) return

    async function fetchUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)

      setUnreadCount(count || 0)
    }

    fetchUnread()

    const channel = supabase
      .channel('unread-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchUnread()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return unreadCount
}

function getInitials(email: string) {
  return (email || 'U').charAt(0).toUpperCase()
}

function getUsername(email: string) {
  return email.split('@')[0] || email
}

function isActivePath(pathname: string, item: SidebarNavItem) {
  return item.href === '/analyse'
    ? pathname === '/analyse'
    : pathname === item.href || pathname.startsWith(item.href + '/')
}

export default function Sidebar({
  user,
  pathname,
  navItems,
  settingsItems,
  onOpenCommandPalette,
  onSignOut,
}: SidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSettingsPopup, setShowSettingsPopup] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme, allowsThemeToggle } = useTheme()
  const unreadCount = useUnreadNotifications(user.id)
  const settingsItem = settingsItems.find((item) => item.id === 'settings')

  useEffect(() => {
    const saved = window.localStorage.getItem('finclue-sidebar-collapsed')
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
      return
    }
    setSidebarCollapsed(window.matchMedia('(max-width: 1023px)').matches)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsPopup(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current
      window.localStorage.setItem('finclue-sidebar-collapsed', String(next))
      return next
    })
  }, [])

  const renderNavItem = (item: SidebarNavItem) => {
    const Icon = item.icon
    const active = isActivePath(pathname, item)
    const premiumLocked = item.premium && !user.isPremium

    return (
      <Link
        key={item.id}
        href={item.href}
        title={sidebarCollapsed ? item.label : undefined}
        data-tour={`nav-${item.id}`}
        className={`
          group relative flex h-10 items-center rounded-lg text-sm transition-colors
          ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'}
          ${active
            ? 'bg-brand-muted/[0.12] text-brand-light'
            : 'text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
          }
        `}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-brand" />
        )}

        <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <Icon className="h-5 w-5" />
          {premiumLocked && (
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
          )}
          {item.id === 'inbox' && unreadCount > 0 && (
            <span className="absolute -right-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>

        {!sidebarCollapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.isNew && (
              <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                Neu
              </span>
            )}
          </>
        )}

        {sidebarCollapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-theme bg-theme-card px-2 py-1 text-xs text-theme-primary opacity-0 shadow-[var(--shadow-dropdown)] transition-opacity group-hover:opacity-100">
            {item.label}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className={`
        hidden h-screen flex-shrink-0 flex-col border-r border-theme bg-theme-primary transition-all duration-200 sm:flex
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      <div className={`flex h-14 items-center justify-between border-b border-theme ${sidebarCollapsed ? 'px-3' : 'px-4'}`}>
        <Link href="/" className="flex min-w-0 items-center gap-3" title="Finclue">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-white">
            <img src="/logos/logo-transparent-white.svg" alt="Finclue" className="h-4 w-4" />
          </span>
          {!sidebarCollapsed && (
            <span className="truncate text-lg font-semibold tracking-tight text-theme-primary">
              Finclue
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-theme-muted transition-colors hover:bg-theme-hover hover:text-theme-primary"
          aria-label={sidebarCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
        >
          {sidebarCollapsed ? (
            <ChevronDoubleRightIcon className="h-4 w-4" />
          ) : (
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="px-3 py-2">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          title={sidebarCollapsed ? 'Suchen...' : undefined}
          className={`
            flex h-10 w-full items-center rounded-lg border border-theme bg-theme-input text-sm text-theme-muted transition-colors hover:border-brand/40 hover:text-theme-primary
            ${sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'}
          `}
        >
          <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0" />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left">Suchen...</span>
              <kbd className="rounded border border-theme bg-theme-secondary px-1.5 py-0.5 text-[11px] text-theme-muted">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      <nav className={`flex-1 space-y-1 px-2 py-2 ${sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
        {navItems.map(renderNavItem)}
      </nav>

      <div className="border-t border-theme px-2 py-2">
        {settingsItem && renderNavItem(settingsItem)}
      </div>

      <div ref={settingsRef} className="relative border-t border-theme px-3 py-3">
        <button
          type="button"
          onClick={() => setShowSettingsPopup((open) => !open)}
          className={`
            flex w-full items-center rounded-lg transition-colors hover:bg-theme-hover
            ${sidebarCollapsed ? 'justify-center p-1' : 'gap-3 p-2'}
          `}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand-light">
            {getInitials(user.email)}
          </span>

          {!sidebarCollapsed && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-theme-primary">{getUsername(user.email)}</span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-xs text-theme-muted">{user.isPremium ? 'Premium' : 'Free'}</span>
                  {user.isPremium && (
                    <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      Premium
                    </span>
                  )}
                </span>
              </span>
              <ChevronDownIcon className={`h-4 w-4 flex-shrink-0 text-theme-muted transition-transform ${showSettingsPopup ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {showSettingsPopup && (
          <div className={`absolute bottom-full z-50 mb-2 ${sidebarCollapsed ? 'left-3' : 'left-3 right-3'}`}>
            <div className="w-56 overflow-hidden rounded-xl border border-theme bg-theme-card py-2 shadow-[var(--shadow-dropdown)]">
              {settingsItems.map((item) => {
                const Icon = item.icon
                const active = isActivePath(pathname, item)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setShowSettingsPopup(false)}
                    className={`
                      flex items-center gap-3 px-4 py-2 text-sm transition-colors
                      ${active
                        ? 'bg-brand-muted/[0.12] text-brand-light'
                        : 'text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}

              <div className="my-2 h-px bg-theme-tertiary" />

              <div className="px-3 py-2">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-theme-muted">Design</p>

                <button
                  type="button"
                  onClick={() => theme === 'light' && allowsThemeToggle && toggleTheme()}
                  className={`flex w-full items-center justify-between rounded px-1 py-1.5 transition-colors ${
                    theme === 'dark' ? 'bg-theme-secondary' : 'hover:bg-theme-hover'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MoonIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium text-theme-primary">Dark</span>
                  </span>
                  {theme === 'dark' && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                </button>

                {!allowsThemeToggle ? (
                  <div className="mt-1 flex cursor-not-allowed items-center justify-between px-1 py-1.5 opacity-50">
                    <span className="flex items-center gap-2">
                      <SunIcon className="h-3.5 w-3.5 text-theme-muted" />
                      <span className="text-xs text-theme-muted">Light</span>
                    </span>
                    <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] text-amber-500">Bald</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => theme === 'dark' && toggleTheme()}
                    className={`mt-1 flex w-full items-center justify-between rounded px-1 py-1.5 transition-colors ${
                      theme === 'light' ? 'bg-theme-secondary' : 'hover:bg-theme-hover'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <SunIcon className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-medium text-theme-primary">Light</span>
                    </span>
                    {theme === 'light' && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                  </button>
                )}
              </div>

              <div className="my-1 h-px bg-theme-tertiary" />

              <button
                type="button"
                onClick={() => { window.location.href = 'mailto:team@finclue.de' }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-theme-secondary transition-colors hover:bg-theme-hover hover:text-theme-primary"
              >
                <EnvelopeIcon className="h-4 w-4" />
                Support
              </button>

              <div className="my-2 h-px bg-theme-tertiary" />

              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                Abmelden
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
