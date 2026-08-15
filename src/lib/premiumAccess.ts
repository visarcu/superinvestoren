// src/lib/premiumAccess.ts
// Zentrale Premium-Zugriffsprüfung. Alle Gates (API-Routes, Pages, Hooks)
// müssen diese Funktion verwenden statt nur profiles.is_premium zu lesen —
// sonst behalten gekündigte/abgelaufene Abos Zugriff, wenn ein Stripe-Webhook
// verloren geht (genau das ist mit 17 Alt-Accounts passiert).

export interface PremiumProfileFields {
  is_premium?: boolean | null
  subscription_status?: string | null
  subscription_end_date?: string | null
}

// Für .select()-Aufrufe auf profiles, damit hasPremiumAccess alle Felder bekommt.
export const PREMIUM_PROFILE_SELECT = 'is_premium, subscription_status, subscription_end_date'

// Kulanzfenster nach subscription_end_date: Verlängerungen werden nur per
// Webhook (invoice.payment_succeeded) in die DB geschrieben. Kommt der Webhook
// verspätet oder gar nicht an, darf ein zahlender Kunde nicht sofort gesperrt
// werden — der tägliche Reconcile-Cron korrigiert den Datensatz binnen 24h.
const GRACE_MS = 3 * 24 * 60 * 60 * 1000

export function hasPremiumAccess(profile: PremiumProfileFields | null | undefined): boolean {
  if (!profile?.is_premium) return false

  // Kein Enddatum = manuell vergebenes Premium (z.B. Team-Accounts) — gilt unbegrenzt.
  if (!profile.subscription_end_date) return true

  const end = new Date(profile.subscription_end_date).getTime()
  if (Number.isNaN(end)) return true

  // subscription_status wird bewusst NICHT hart geprüft: bei Kündigung zum
  // Periodenende steht dort bereits 'canceled', obwohl der Zugriff bis zum
  // Enddatum bezahlt ist. Das Enddatum ist die verlässliche Grenze.
  return end + GRACE_MS > Date.now()
}
