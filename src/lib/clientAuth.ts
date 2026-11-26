// src/lib/clientAuth.ts
//
// Authorization-Header mit dem Zugangstoken der Supabase-Sitzung für
// fetch-Aufrufe an angemeldete API-Routen. Ohne Sitzung leer: Die Route
// antwortet dann mit 401, und der Aufrufer behandelt das wie einen Fehler.

import { supabase } from '@/lib/supabaseClient'

export async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  } catch {
    return {}
  }
}
