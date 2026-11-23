'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { COOKIE_MAX_AGE_SECONDS, cookieAttributes, readCookies, sharedCookieDomain } from './siteCookies'

export interface CookiePreferences {
  essential: boolean
  analytics: boolean
}

// Die Auswahl liegt in einem Cookie für die ganze Domain, damit sie auf
// finclue.de und depot.finclue.de gilt und der Banner nur einmal erscheint.
// Früher (und falls der Browser das Cookie nicht zulässt) im localStorage.
const STORAGE_KEY = 'cookie-preferences'

const DEFAULT_PREFERENCES: CookiePreferences = { essential: true, analytics: false }

// Listeners for cross-component sync
let listeners: Array<() => void> = []

function subscribe(listener: () => void) {
  migrateFromLocalStorage()
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

function notifyListeners() {
  listeners.forEach(l => l())
}

function readCookie(): string | null {
  const value = readCookies().get(STORAGE_KEY)
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/** false, wenn der Browser das Cookie nicht annimmt */
function writeCookie(value: string): boolean {
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(value)}${cookieAttributes(sharedCookieDomain(), COOKIE_MAX_AGE_SECONDS)}`
  return readCookie() === value
}

function localGet(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function localRemove() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Privater Modus o. Ä.
  }
}

/** Auswahl aus der Zeit vor dem Cookie übernehmen. Ein vorhandenes Cookie gewinnt. */
function migrateFromLocalStorage() {
  const legacy = localGet()
  if (legacy === null) return
  if (readCookie() !== null || writeCookie(legacy)) localRemove()
}

function getSnapshot(): string | null {
  if (typeof window === 'undefined') return null
  return readCookie() ?? localGet()
}

function getServerSnapshot(): string | null {
  return null
}

function parsePreferences(raw: string | null): CookiePreferences {
  if (!raw) return DEFAULT_PREFERENCES
  try {
    return JSON.parse(raw)
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveCookiePreferences(prefs: CookiePreferences) {
  const value = JSON.stringify(prefs)
  if (writeCookie(value)) {
    localRemove()
  } else {
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Privater Modus o. Ä.: dann fragt der Banner beim nächsten Besuch erneut
    }
  }
  notifyListeners()
  // Dispatch storage event for other tabs
  window.dispatchEvent(new Event('cookie-consent-changed'))
}

export function useCookieConsent() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const consentGiven = raw !== null
  const preferences = parsePreferences(raw)
  const analyticsAllowed = consentGiven && preferences.analytics

  const save = useCallback((prefs: CookiePreferences) => {
    saveCookiePreferences(prefs)
  }, [])

  const reset = useCallback(() => {
    document.cookie = `${STORAGE_KEY}=${cookieAttributes(sharedCookieDomain(), 0)}`
    localRemove()
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
