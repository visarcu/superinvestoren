// src/app/(terminal)/notifications/page.tsx - FEY STYLE REDESIGN
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  BellIcon,
  CheckIcon,
  ChartBarIcon,
  NewspaperIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'watchlist_dip' | 'filing_alert' | 'price_target' | 'portfolio_update' | 'system'
  title: string
  message: string
  data: any
  read: boolean
  href?: string
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

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

  function getNotificationIcon(type: Notification['type']) {
    switch (type) {
      case 'watchlist_dip':
        return <ChartBarIcon className="w-4 h-4 text-red-400" />
      case 'filing_alert':
        return <NewspaperIcon className="w-4 h-4 text-blue-400" />
      case 'price_target':
        return <ExclamationCircleIcon className="w-4 h-4 text-yellow-400" />
      case 'system':
        return <InformationCircleIcon className="w-4 h-4 text-brand-light" />
      default:
        return <BellIcon className="w-4 h-4 text-theme-muted" />
    }
  }

  function formatTimeAgo(dateString: string) {
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

  const filteredNotifications = notifications.filter(n =>
    filter === 'all' || !n.read
  )

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-secondary text-sm">Lade Benachrichtigungen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8">

        {/* Header - Flat Style wie Settings */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <BellIcon className="w-4 h-4 text-theme-muted" />
            <span className="text-sm text-theme-muted">Benachrichtigungen</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-theme-primary mb-2">
                Alle Benachrichtigungen
              </h1>
              <p className="text-theme-secondary text-sm">
                {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alle gelesen'} · {notifications.length} insgesamt
              </p>
            </div>

            <Link
              href="/notifications/settings"
              className="flex items-center gap-2 px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary text-theme-primary rounded-lg transition-colors text-sm"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Einstellungen
            </Link>
          </div>
        </div>

        {/* Filter Tabs - Flat Style */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-theme-secondary text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Alle ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-emerald-500 text-white'
                : 'bg-theme-secondary text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Ungelesen ({unreadCount})
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="ml-auto text-sm text-theme-muted hover:text-brand-light font-medium transition-colors"
            >
              Alle als gelesen markieren
            </button>
          )}
        </div>

        {/* Notifications List - Flat Style */}
        {filteredNotifications.length === 0 ? (
          <div className="border-b border-theme pb-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-theme-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                <BellIcon className="w-6 h-6 text-theme-muted" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-medium text-theme-primary mb-1">
                  {filter === 'unread' ? 'Keine ungelesenen Benachrichtigungen' : 'Keine Benachrichtigungen'}
                </h2>
                <p className="text-theme-muted text-sm mb-4">
                  {filter === 'unread'
                    ? 'Alle Benachrichtigungen wurden gelesen.'
                    : 'Aktiviere Benachrichtigungen in den Einstellungen, um über wichtige Ereignisse informiert zu werden.'
                  }
                </p>
                <Link
                  href="/notifications/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Einstellungen öffnen
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredNotifications.map((notification) => {
                const content = (
                  <div
                    className={`flex items-center justify-between py-5 ${
                      notification.href ? 'cursor-pointer hover:bg-theme-hover -mx-3 px-3 rounded-lg' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        notification.type === 'watchlist_dip' ? 'bg-red-500/10' :
                        notification.type === 'filing_alert' ? 'bg-blue-500/10' :
                        notification.type === 'price_target' ? 'bg-yellow-500/10' :
                        'bg-brand/10'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className={`text-sm font-medium ${
                            !notification.read ? 'text-theme-primary' : 'text-theme-secondary'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className={`text-xs ${
                          !notification.read ? 'text-theme-secondary' : 'text-theme-muted'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-theme-muted">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            notification.type === 'watchlist_dip' ? 'bg-red-500/10 text-red-400' :
                            notification.type === 'filing_alert' ? 'bg-blue-500/10 text-blue-400' :
                            notification.type === 'price_target' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-brand/10 text-brand-light'
                          }`}>
                            {notification.type === 'watchlist_dip' ? 'Watchlist' :
                             notification.type === 'filing_alert' ? 'Filing' :
                             notification.type === 'price_target' ? 'Price Alert' :
                             'System'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {notification.href && (
                        <span className="text-xs text-theme-muted flex items-center gap-1">
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                          Öffnen
                        </span>
                      )}

                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="p-1.5 text-theme-muted hover:text-brand-light hover:bg-brand/10 transition-all rounded-lg"
                          title="Als gelesen markieren"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )

                return notification.href ? (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id)
                      }
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id} className="block">
                    {content}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Navigation - wie in Settings */}
        <div>
          <h2 className="text-sm font-medium text-theme-secondary mb-4">Schnellzugriff</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/analyse"
              className="px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors"
            >
              <span className="text-sm text-theme-secondary">Dashboard</span>
            </Link>
            <Link
              href="/analyse/watchlist"
              className="px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors"
            >
              <span className="text-sm text-theme-secondary">Watchlist</span>
            </Link>
            <Link
              href="/notifications/settings"
              className="px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors"
            >
              <span className="text-sm text-theme-secondary">Einstellungen</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
