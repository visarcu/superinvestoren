// src/app/(terminal)/notifications/page.tsx - THEME-KOMPATIBEL
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
        return <ChartBarIcon className="w-5 h-5 text-red-400" />
      case 'filing_alert':
        return <NewspaperIcon className="w-5 h-5 text-blue-400" />
      case 'price_target':
        return <ExclamationCircleIcon className="w-5 h-5 text-yellow-400" />
      case 'system':
        return <InformationCircleIcon className="w-5 h-5 text-brand-light" />
      default:
        return <BellIcon className="w-5 h-5 text-theme-muted" />
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
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-theme-primary">Alle Benachrichtigungen</h1>
            <p className="text-theme-muted mt-1">
              {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alle gelesen'} · {notifications.length} insgesamt
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm text-brand-light hover:text-green-300 font-medium"
              >
                Alle als gelesen markieren
              </button>
            )}
            
            <Link
              href="/notifications/settings"
              className="flex items-center gap-2 px-4 py-2 bg-theme-card border border-theme/20 hover:bg-theme-hover text-theme-primary rounded-lg transition-colors"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Einstellungen
            </Link>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand text-white'
                : 'bg-theme-card text-theme-muted hover:text-theme-primary border border-theme/10'
            }`}
          >
            Alle ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-brand text-white'
                : 'bg-theme-card text-theme-muted hover:text-theme-primary border border-theme/10'
            }`}
          >
            Ungelesen ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="bg-theme-card border border-theme/10 rounded-xl overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="w-12 h-12 text-theme-muted mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-theme-primary mb-2">
                {filter === 'unread' ? 'Keine ungelesenen Benachrichtigungen' : 'Keine Benachrichtigungen'}
              </h3>
              <p className="text-theme-muted">
                {filter === 'unread' 
                  ? 'Alle Benachrichtigungen wurden gelesen.'
                  : 'Aktiviere Benachrichtigungen in den Einstellungen.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-theme/5">
              {filteredNotifications.map((notification) => {
                const content = (
                  <div 
                    className={`flex gap-4 p-5 transition-all duration-200 ${
                      !notification.read 
                        ? 'bg-brand/5 border-l-4 border-l-green-500' 
                        : 'hover:bg-theme-hover border-l-4 border-l-transparent'
                    } ${notification.href ? 'cursor-pointer' : ''}`}
                  >
                    {/* Icon mit besserer Positionierung */}
                    <div className="flex-shrink-0 pt-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        notification.type === 'watchlist_dip' ? 'bg-red-500/20' :
                        notification.type === 'filing_alert' ? 'bg-blue-500/20' :
                        notification.type === 'price_target' ? 'bg-yellow-500/20' :
                        'bg-brand/20'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                    
                    {/* Content mit besserer Struktur */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className={`font-semibold leading-snug ${
                          !notification.read ? 'text-theme-primary' : 'text-theme-secondary'
                        }`}>
                          {notification.title}
                        </h4>
                        
                        {/* Status Indicators */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {notification.href && (
                            <div className="flex items-center gap-1 text-xs text-theme-muted bg-theme-secondary px-2 py-1 rounded-full">
                              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                              <span>Öffnen</span>
                            </div>
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
                      
                      <p className={`text-sm leading-relaxed mb-3 ${
                        !notification.read ? 'text-theme-secondary' : 'text-theme-muted'
                      }`}>
                        {notification.message}
                      </p>
                      
                      {/* Footer mit besserer Struktur */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-theme-muted font-medium">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
                          {/* Type Badge */}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
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
                        
                        {!notification.read && (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                      </div>
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
                    className="block group"
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
          )}
        </div>
      </div>
    </div>
  )
}