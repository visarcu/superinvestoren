// src/lib/ai/auth.ts
// Anmeldung für alle KI-Routen: Supabase-Token aus dem Authorization-Header
// prüfen und den Premium-Status über hasPremiumAccess() bestimmen.

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hasPremiumAccess, PREMIUM_PROFILE_SELECT } from '@/lib/premiumAccess'

export interface AiUser {
  id: string
  email: string | null
  isPremium: boolean
}

export async function getAiUser(request: Request): Promise<AiUser | null> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select(PREMIUM_PROFILE_SELECT)
    .eq('user_id', data.user.id)
    .maybeSingle()

  return {
    id: data.user.id,
    email: data.user.email?.toLowerCase() ?? null,
    isPremium: hasPremiumAccess(profile),
  }
}
