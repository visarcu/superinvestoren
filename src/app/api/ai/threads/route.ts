// src/app/api/ai/threads/route.ts
// Verlauf der Finclue AI, dazu Zugang und verbleibende Fragen.

import { NextResponse } from 'next/server'
import { getAiUser } from '@/lib/ai/auth'
import { aiConfigured, isAiBetaUser } from '@/lib/ai/config'
import { getQuota } from '@/lib/ai/quota'
import { listThreads } from '@/lib/ai/store'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getAiUser(request)
  if (!user) return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 })
  if (!isAiBetaUser(user.email)) return NextResponse.json({ zugang: false, premium: user.isPremium })
  try {
    const [threads, quota, depots] = await Promise.all([
      listThreads(user.id), getQuota(user),
      supabaseAdmin.from('portfolios').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    return NextResponse.json({ zugang: true, eingerichtet: aiConfigured(), premium: user.isPremium, threads, quota, hatDepot: (depots.count ?? 0) > 0 })
  } catch {
    return NextResponse.json({ error: 'Der Verlauf konnte nicht geladen werden.' }, { status: 500 })
  }
}
