'use client'

import { Analytics } from '@vercel/analytics/next'
import { useCookieConsent } from '@/lib/useCookieConsent'

export function ConditionalAnalytics() {
  const { analyticsAllowed } = useCookieConsent()

  if (!analyticsAllowed) return null

  return <Analytics />
}
