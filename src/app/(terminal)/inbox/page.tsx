// src/app/(terminal)/inbox/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import {
  ChartBarIcon,
  DocumentTextIcon,
  BellIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
  CalendarIcon,
  CheckIcon,
  InboxIcon,
} from '@heroicons/react/24/outline'

type NotificationType = 'watchlist_dip' | 'filing_alert' | 'price_target' | 'portfolio_update' | 'system' | 'earnings_alert'
type FilterType = 'all' | 'unread' | 'filing_alert' | 'watchlist_dip' | 'portfolio_update' | 'system' | 'earnings_alert'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  data: any
  read: boolean
  href?: string
  created_at: string
}

const typeConfig: Record<NotificationType, {
  icon: typeof ChartBarIcon
  iconColor: string
  label: string
}> = {
  watchlist_dip: { icon: ChartBarIcon, iconColor: 'text-red-400', label: 'Watchlist' },
  filing_alert: { icon: DocumentTextIcon, iconColor: 'text-blue-400', label: 'Filing' },
  price_target: { icon: CurrencyDollarIcon, iconColor: 'text-amber-400', label: 'Price' },
  portfolio_update: { icon: BriefcaseIcon, iconColor: 'text-purple-400', label: 'Portfolio' },
  system: { icon: BellIcon, iconColor: 'text-theme-muted', label: 'System' },
  earnings_alert: { icon: CalendarIcon, iconColor: 'text-orange-400', label: 'Earnings' },
}

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'unread', label: 'Ungelesen' },
  { key: 'filing_alert', label: 'Filings' },
  { key: 'earnings_alert', label: 'Earnings' },
  { key: 'watchlist_dip', label: 'Watchlist' },
  { key: 'portfolio_update', label: 'Portfolio' },
  { key: 'system', label: 'System' },
]

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error loading notifications:', error)
        return
      }

      setNotifications(data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking as read:', error)
        return
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      window.dispatchEvent(new Event('notifications:updated'))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  async function markAllAsRead() {
    try {
      // Explicit user filter + predicate update so all unread rows are flipped,
      // not just the 100 currently loaded. RLS would already scope to the
      // user, but being explicit also surfaces auth issues immediately.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('Cannot mark all as read: no authenticated user')
        return
      }

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) {
        console.error('Error marking all as read:', error)
        return
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      window.dispatchEvent(new Event('notifications:updated'))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'jetzt'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d`
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  }

  function getDateGroup(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (date >= today) return 'Heute'
    if (date >= yesterday) return 'Gestern'
    if (date >= weekAgo) return 'Diese Woche'
    return 'Älter'
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read
    return n.type === filter
  })

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const group = getDateGroup(notification.created_at)
    if (!groups[group]) groups[group] = []
    groups[group].push(notification)
    return groups
  }, {} as Record<string, Notification[]>)

  const unreadCount = notifications.filter(n => !n.read).length
  const groupOrder = ['Heute', 'Gestern', 'Diese Woche', 'Älter']

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-theme-primary/90 backdrop-blur-md border-b border-theme">
        <div className="px-6 lg:px-10 pt-8 pb-0">
          <div className="flex items-end justify-between mb-5">
            <div className="flex items-baseline gap-3">
              <h1 className="text-[28px] font-semibold text-theme-primary tracking-tight leading-none">Inbox</h1>
              <span className="text-[13px] text-theme-muted tabular-nums">
                {unreadCount > 0 ? `${unreadCount} ungelesen` : 'alles gelesen'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12.5px] text-theme-muted hover:text-theme-primary hover:bg-theme-hover disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-theme-muted disabled:cursor-not-allowed transition-colors"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Alle als gelesen
              </button>
              <Link
                href="/notifications/settings"
                className="flex items-center justify-center w-8 h-8 rounded-md text-theme-muted hover:text-theme-primary hover:bg-theme-hover transition-colors"
                title="Einstellungen"
              >
                <Cog6ToothIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Filter Tabs (underlined) */}
          <div className="flex items-center gap-0 overflow-x-auto -mb-px">
            {filters.map((f) => {
              const count = f.key === 'all'
                ? notifications.length
                : f.key === 'unread'
                  ? unreadCount
                  : notifications.filter(n => n.type === f.key).length
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'text-theme-primary'
                      : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  {f.label}
                  {count > 0 && (
                    <span className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
                      active ? 'bg-theme-secondary text-theme-primary' : 'text-theme-muted'
                    }`}>
                      {count}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-6 lg:px-10 py-6 max-w-[1280px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 rounded-xl border border-theme bg-theme-card flex items-center justify-center mb-4">
              <InboxIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <h3 className="text-[14px] font-medium text-theme-primary mb-1">
              {filter === 'unread' ? 'Nichts Ungelesenes' : 'Keine Benachrichtigungen'}
            </h3>
            <p className="text-[13px] text-theme-muted">
              {filter === 'unread' ? 'Alle deine Nachrichten sind gelesen' : 'Hier landen Filings, Alerts und Updates'}
            </p>
          </div>
        ) : (
          <div>
            {groupOrder.map((group, groupIndex) => {
              const items = groupedNotifications[group]
              if (!items || items.length === 0) return null

              return (
                <div key={group} className={groupIndex > 0 ? 'mt-8' : ''}>
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <span className="text-[11px] font-medium text-theme-muted uppercase tracking-[0.08em]">
                      {group}
                    </span>
                    <span className="text-[11px] text-theme-muted/60 tabular-nums">
                      {items.length}
                    </span>
                  </div>

                  <div>
                    {items.map(notification => {
                      const config = typeConfig[notification.type] || typeConfig.system
                      const Icon = config.icon
                      const unread = !notification.read

                      const row = (
                        <div
                          className={`group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                            unread ? 'hover:bg-theme-hover' : 'hover:bg-theme-hover/60'
                          }`}
                          onClick={() => {
                            if (unread && !notification.href) markAsRead(notification.id)
                          }}
                        >
                          {/* Unread bar */}
                          <span
                            aria-hidden="true"
                            className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-opacity ${
                              unread ? 'bg-brand opacity-100' : 'opacity-0'
                            }`}
                          />

                          {/* Type Icon */}
                          <Icon className={`w-4 h-4 flex-shrink-0 ${unread ? config.iconColor : 'text-theme-muted'}`} />

                          {/* Type Label */}
                          <span className={`hidden sm:inline-block text-[11px] font-medium uppercase tracking-wider w-16 flex-shrink-0 ${
                            unread ? 'text-theme-secondary' : 'text-theme-muted'
                          }`}>
                            {config.label}
                          </span>

                          {/* Title + Message */}
                          <div className="flex-1 min-w-0 flex items-baseline gap-2">
                            <span className={`text-[13.5px] truncate ${
                              unread ? 'font-semibold text-theme-primary' : 'font-normal text-theme-secondary'
                            }`}>
                              {notification.title}
                            </span>
                            <span className="text-theme-muted/40 text-[12px] flex-shrink-0">·</span>
                            <span className="text-[12.5px] text-theme-muted truncate min-w-0">
                              {notification.message}
                            </span>
                          </div>

                          {/* Time */}
                          <span className="text-[11.5px] tabular-nums text-theme-muted flex-shrink-0 w-10 text-right">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                      )

                      return notification.href ? (
                        <Link
                          key={notification.id}
                          href={notification.href}
                          className="block"
                          onClick={() => {
                            if (unread) markAsRead(notification.id)
                          }}
                        >
                          {row}
                        </Link>
                      ) : (
                        <div key={notification.id}>
                          {row}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
