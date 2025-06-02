// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Wir übergeben hier ein Objekt { realtime: { enabled: false } }
// und casten das ganze als „any“, damit TypeScript nicht mehr meckert.
const options = {
  realtime: { enabled: false }
} as any

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, options)