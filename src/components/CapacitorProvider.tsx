'use client'

import { useEffect } from 'react'
import { initCapacitor } from '@/lib/capacitor'

/**
 * Initialisiert Capacitor Native Plugins beim App-Start.
 * Wird nur auf nativen Plattformen (iOS/Android) aktiv — auf Web ein No-op.
 */
export default function CapacitorProvider() {
  useEffect(() => {
    initCapacitor()
  }, [])

  return null
}
