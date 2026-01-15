// src/app/(terminal)/inbox/page.tsx - FEY STYLE INBOX v4 (Theme-aware)
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
  CalendarIcon
} from '@heroicons/react/24/outline'

type NotificationType = 'watchlist_dip' | 'filing_alert' | 'price_target' | 'portfolio_update' | 'system' | 'earnings_alert'
type FilterType = 'all' | 'filing_alert' | 'watchlist_dip' | 'portfolio_update' | 'system' | 'earnings_alert'

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

// Icon config für jeden Typ
const typeConfig: Record<NotificationType, {
  icon: typeof ChartBarIcon
  bg: string
  iconColor: string
  label: string
}> = {
  watchlist_dip: {
    icon: ChartBarIcon,
    bg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    label: 'Watchlist'
  },
  filing_alert: {
    icon: DocumentTextIcon,
    bg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    label: 'Filings'
  },
  price_target: {
    icon: CurrencyDollarIcon,
    bg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    label: 'Price Alert'
  },
  portfolio_update: {
    icon: BriefcaseIcon,
    bg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    label: 'Portfolio'
  },
  system: {
    icon: BellIcon,
    bg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    label: 'System'
  },
  earnings_alert: {
    icon: CalendarIcon,
    bg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    label: 'Earnings'
  }
}

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'filing_alert', label: 'Filings' },
  { key: 'watchlist_dip', label: 'Watchlist' },
  { key: 'portfolio_update', label: 'Portfolio' },
  { key: 'system', label: 'System' },
  { key: 'earnings_alert', label: 'Earnings' },
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
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (error) {
        console.error('Error marking all as read:', error)
        return
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Gerade eben'
    if (diffInMinutes < 60) return `vor ${diffInMinutes}m`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `vor ${diffInHours}h`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `vor ${diffInDays}d`

    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
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

  // Filter notifications
  const filteredNotifications = notifications.filter(n =>
    filter === 'all' || n.type === filter
  )

  // Group by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const group = getDateGroup(notification.created_at)
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(notification)
    return groups
  }, {} as Record<string, Notification[]>)

  const unreadCount = notifications.filter(n => !n.read).length
  const groupOrder = ['Heute', 'Gestern', 'Diese Woche', 'Älter']

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-muted text-sm">Lade Inbox...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-theme-primary">Inbox</h1>
            <p className="text-sm text-theme-muted mt-1">
              {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alle Nachrichten gelesen'}
            </p>
          </div>
          <Link
            href="/notifications/settings"
            className="p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-hover transition-all"
            title="Einstellungen"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Link>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f.key
                  ? 'bg-emerald-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.1] hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              {f.label}
            </button>
          ))}

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="ml-auto text-sm text-theme-muted hover:text-emerald-400 font-medium transition-colors"
            >
              Alle als gelesen markieren
            </button>
          )}
        </div>

        {/* Notifications */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <BellIcon className="w-8 h-8 text-theme-muted" />
            </div>
            <h3 className="text-lg font-medium text-theme-primary mb-2">Deine Inbox ist leer</h3>
            <p className="text-sm text-theme-muted mb-6">
              Aktiviere Benachrichtigungen um Updates zu erhalten
            </p>
            <Link
              href="/notifications/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Einstellungen
            </Link>
          </div>
        ) : (
          <div>
            {groupOrder.map((group, groupIndex) => {
              const groupNotifications = groupedNotifications[group]
              if (!groupNotifications || groupNotifications.length === 0) return null

              return (
                <div key={group}>
                  {/* Group Header */}
                  <div className={`text-xs font-medium text-theme-muted uppercase tracking-wider mb-3 ${groupIndex > 0 ? 'mt-8' : ''}`}>
                    {group}
                  </div>

                  {/* Notification Cards */}
                  <div className="space-y-3">
                    {groupNotifications.map(notification => {
                      const config = typeConfig[notification.type] || typeConfig.system
                      const Icon = config.icon

                      const cardContent = (
                        <div
                          className={`
                            flex items-center gap-4 p-4 rounded-xl transition-all relative
                            ${!notification.read
                              ? 'bg-emerald-50 dark:bg-emerald-500/5 border-l-4 border-l-emerald-500 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/10'
                              : 'bg-white dark:bg-[#141416] hover:bg-neutral-50 dark:hover:bg-[#1a1a1c] border border-neutral-200 dark:border-white/[0.04] hover:border-neutral-300 dark:hover:border-white/[0.08]'
                            }
                          `}
                          onClick={() => {
                            if (!notification.read && !notification.href) {
                              markAsRead(notification.id)
                            }
                          }}
                        >
                          {/* Unread Badge */}
                          {!notification.read && (
                            <div className="absolute top-2 right-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">
                                NEU
                              </span>
                            </div>
                          )}

                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                            <Icon className={`w-5 h-5 ${config.iconColor}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-[15px] font-medium ${!notification.read ? 'text-theme-primary font-semibold' : 'text-theme-secondary'}`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                              )}
                            </div>
                            <p className={`text-sm mt-0.5 truncate ${!notification.read ? 'text-theme-secondary' : 'text-theme-muted'}`}>
                              {notification.message}
                            </p>
                          </div>

                          {/* Date */}
                          <span className={`text-xs flex-shrink-0 ${!notification.read ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-theme-muted'}`}>
                            {formatDate(notification.created_at)}
                          </span>
                        </div>
                      )

                      return notification.href ? (
                        <Link
                          key={notification.id}
                          href={notification.href}
                          className="block"
                          onClick={() => {
                            if (!notification.read) {
                              markAsRead(notification.id)
                            }
                          }}
                        >
                          {cardContent}
                        </Link>
                      ) : (
                        <div key={notification.id} className="cursor-pointer">
                          {cardContent}
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
