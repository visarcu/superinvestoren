// src/lib/fundamentalAlerts.server.ts
// Server-only Helfer für die Fundamental-Alerts-Beta.
// ALERTS_BETA_ALLOWLIST: kommaseparierte E-Mail-Liste ⇒ nur diese Nutzer.
// '*' ⇒ Feature für alle offen (Beta-Ende).
// Nicht gesetzt/leer ⇒ Feature GESCHLOSSEN — fail-safe: eine in Vercel
// vergessene Env-Var darf die Beta nicht versehentlich für alle öffnen.

export function alertsBetaAllowlist(): string[] | null {
  const raw = process.env.ALERTS_BETA_ALLOWLIST
  if (!raw || !raw.trim()) return [] // geschlossen
  if (raw.trim() === '*') return null // offen für alle
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAlertsBetaUser(email: string | null | undefined): boolean {
  const allowlist = alertsBetaAllowlist()
  if (!allowlist) return true
  if (!email) return false
  return allowlist.includes(email.toLowerCase())
}
