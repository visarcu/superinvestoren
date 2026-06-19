// src/lib/investor-utils.ts

import { investors } from '@/data/investors'

/**
 * Liefert einen lesbaren Anzeigenamen für einen Investor-Slug,
 * z. B. "ark_investment_management" → "Catherine Wood".
 *
 * Quelle ist `src/data/investors.ts`. Firmenzusätze nach " - ", " – "
 * oder " (…)" werden entfernt, damit der Name in E-Mails und
 * Notifications kurz und professionell wirkt.
 */
export function getInvestorDisplayName(slug: string): string {
  const investor = investors.find(inv => inv.slug === slug)
  if (investor?.name && investor.name.trim() && investor.name.trim() !== slug) {
    return cleanInvestorName(investor.name)
  }
  return humanizeSlug(slug)
}

function cleanInvestorName(raw: string): string {
  const trimmed = raw.trim()
  const dashSplit = trimmed.split(/\s+[-–—]\s+/)[0]
  const parenSplit = dashSplit.split(/\s*\(/)[0]
  return parenSplit.trim()
}

function humanizeSlug(slug: string): string {
  return slug
    .split(/[_-]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Bereits vorhandener Dummy-Stub (falls du das schon hattest)
export async function fetchInvestorUpdates() {
  return []
}

// Neu hinzufügen: Diese beiden Namen werden andernfalls im Build vermisst
export async function fetchLatest13F() {
  // TODO: später durch echten Code ersetzen
  return []
}

export async function sendInvestorUpdate() {
  // TODO: später durch echten Code ersetzen
  return
}