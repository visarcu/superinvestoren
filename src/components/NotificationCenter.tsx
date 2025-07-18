// src/components/NotificationCenter.tsx - MIT ECHTEN DATEN
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  ChartBarIcon,
  NewspaperIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolid } from '@heroicons/react/24/solid'
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

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Check auth status
  useEffect(() => {
    checkAuth()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth()
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load notifications when opened
  useEffect(() => {
    if (isOpen && user) {
      loadNotifications()
    }
  }, [isOpen, user])

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      if (session?.user) {
        console.log('Current user ID:', session.user.id)
      } else {
        console.log('No user session')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setUser(null)
    }
  }

  async function loadNotifications() {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
      
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
        console.log('Loading notifications for user:', user.id)
        console.log('Notifications data:', data)
        console.log('Notifications error:', error)
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
    if (!user) return
    
    setMarkingAsRead(prev => new Set(prev).add(notificationId))
    
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
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationId)
        return newSet
      })
    }
  }

  async function markAllAsRead() {
    if (!user) return
    
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
        return <InformationCircleIcon className="w-4 h-4 text-green-400" />
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

  // Don't show if not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isOpen 
            ? 'bg-green-500/20 text-green-400' 
            : 'text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50'
        }`}
        title="Benachrichtigungen"
      >
        {unreadCount > 0 ? (
          <BellSolid className="w-5 h-5" />
        ) : (
          <BellIcon className="w-5 h-5" />
        )}
        
        {/* Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-theme-card border border-theme/20 rounded-xl shadow-xl z-50">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-theme/10">
            <div>
              <h3 className="text-lg font-bold text-theme-primary">Benachrichtigungen</h3>
              <p className="text-sm text-theme-muted">
                {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alle gelesen'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-green-400 hover:text-green-300 font-medium"
                >
                  Alle als gelesen markieren
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-theme-muted hover:text-theme-primary rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-theme-muted">Lade Benachrichtigungen...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <BellIcon className="w-8 h-8 text-theme-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-theme-muted">Keine Benachrichtigungen</p>
                <p className="text-xs text-theme-muted mt-1">
                  Aktiviere Benachrichtigungen in den Einstellungen
                </p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => {
                  const isMarkingRead = markingAsRead.has(notification.id)
                  
                  const content = (
                    <div 
                      className={`flex gap-3 p-3 rounded-lg transition-all duration-200 ${
                        !notification.read 
                          ? 'bg-green-500/5 border border-green-500/20' 
                          : 'hover:bg-theme-secondary border border-transparent'
                      } ${notification.href ? 'cursor-pointer' : ''}`}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium ${
                            !notification.read ? 'text-theme-primary' : 'text-theme-secondary'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {notification.href && (
                              <ArrowTopRightOnSquareIcon className="w-3 h-3 text-theme-muted" />
                            )}
                            
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                disabled={isMarkingRead}
                                className="p-1 text-theme-muted hover:text-green-400 transition-colors disabled:opacity-50"
                                title="Als gelesen markieren"
                              >
                                {isMarkingRead ? (
                                  <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <CheckIcon className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-xs mt-1 ${
                          !notification.read ? 'text-theme-secondary' : 'text-theme-muted'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-theme-muted">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          
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
                        setIsOpen(false)
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={notification.id}>
                      {content}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-theme/10 text-center">
              <Link 
                href="/notifications"
                className="text-sm text-green-400 hover:text-green-300 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Alle Benachrichtigungen anzeigen
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}