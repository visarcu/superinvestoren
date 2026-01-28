'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'

export interface CookiePreferences {
  essential: boolean
  analytics: boolean
}

const STORAGE_KEY = 'cookie-preferences'

// Listeners for cross-component sync
let listeners: Array<() => void> = []

function subscribe(listener: () => void) {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

function getSnapshot(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

function getServerSnapshot(): string | null {
  return null
}

function notifyListeners() {
  listeners.forEach(l => l())
}

export function getConsentGiven(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) !== null
}

export function getCookiePreferences(): CookiePreferences {
  if (typeof window === 'undefined') {
    return { essential: true, analytics: false }
  }
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return { essential: true, analytics: false }
  try {
    return JSON.parse(saved)
  } catch {
    return { essential: true, analytics: false }
  }
}

export function saveCookiePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  notifyListeners()
  // Dispatch storage event for other tabs
  window.dispatchEvent(new Event('cookie-consent-changed'))
}

export function useCookieConsent() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const consentGiven = raw !== null
  const preferences: CookiePreferences = raw
    ? (() => { try { return JSON.parse(raw) } catch { return { essential: true, analytics: false } } })()
    : { essential: true, analytics: false }

  const analyticsAllowed = consentGiven && preferences.analytics

  const save = useCallback((prefs: CookiePreferences) => {
    saveCookiePreferences(prefs)
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    notifyListeners()
    window.dispatchEvent(new Event('cookie-consent-changed'))
  }, [])

  return {
    consentGiven,
    preferences,
    analyticsAllowed,
    save,
    reset,
  }
}
