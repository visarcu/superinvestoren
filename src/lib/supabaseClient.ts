// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import { authCookieStorage } from './authCookieStorage'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const options = {
  realtime: { enabled: false },
  // Sitzung als Cookie für finclue.de + depot.finclue.de statt localStorage
  // (siehe authCookieStorage). Alle anderen Auth-Einstellungen bleiben Default.
  auth: { storage: authCookieStorage },
} as any

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, options)
