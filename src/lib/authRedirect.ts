// Rücksprung nach Anmeldung/Registrierung (?redirect=…). Nur relative Pfade:
// "//evil.com" oder "/\evil.com" wären sonst offene Weiterleitungen.

import { WORKSPACE_PATH } from '@/lib/depotRoutes'

export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}

/** Kommt jemand vom Depot (Rücksprung in den Tracker)? Dann "Finclue Depot" zeigen */
export function isDepotRedirect(path: string | null): boolean {
  return !!path && (path === WORKSPACE_PATH || path.startsWith(`${WORKSPACE_PATH}/`))
}
