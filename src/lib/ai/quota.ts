// src/lib/ai/quota.ts
// Fragenlimit: Premium je Kalendermonat, kostenlos insgesamt. Gebucht wird vor
// der Antwort (ai_reserve_question), danach mit Kosten abgeschlossen oder
// zurückgegeben.

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AiUser } from './auth'
import { FREE_QUESTIONS_TOTAL, PREMIUM_QUESTIONS_PER_MONTH } from './config'
import type { AgentUsage } from './agent'
import type { AiQuota } from './types'

/** Monatsanfang in Deutschland als UTC-Zeitpunkt */
function monthStart(now: Date): string {
  const [year, month] = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now).split('-').map(Number)
  const guess = new Date(Date.UTC(year, month - 1, 1))
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(guess))
  return new Date(guess.getTime() - hour * 3_600_000).toISOString()
}

function rule(user: AiUser, now: Date): { limit: number; since: string | null; period: AiQuota['period'] } {
  return user.isPremium
    ? { limit: PREMIUM_QUESTIONS_PER_MONTH, since: monthStart(now), period: 'monat' }
    : { limit: FREE_QUESTIONS_TOTAL, since: null, period: 'gesamt' }
}

export async function getQuota(user: AiUser, now = new Date()): Promise<AiQuota> {
  const { limit, since, period } = rule(user, now)
  let query = supabaseAdmin.from('ai_usage').select('charged, status, created_at').eq('user_id', user.id).gt('charged', 0).limit(1000)
  if (since) query = query.gte('created_at', since)
  const { data, error } = await query
  if (error) throw new Error('Fragenlimit nicht lesbar')
  const staleBefore = now.getTime() - 10 * 60_000
  const used = (data ?? [])
    .filter(r => !(r.status === 'reserved' && Date.parse(r.created_at) < staleBefore))
    .reduce((s, r) => s + Number(r.charged), 0)
  return { used, limit, period }
}

/** Buchungs-ID oder null, wenn das Limit erreicht ist */
export async function reserveQuestion(user: AiUser, charge: number, now = new Date()): Promise<string | null> {
  const { limit, since } = rule(user, now)
  const { data, error } = await supabaseAdmin.rpc('ai_reserve_question', { p_user: user.id, p_charge: charge, p_limit: limit, p_since: since })
  if (error) throw new Error('Frage konnte nicht gebucht werden')
  return (data as string | null) ?? null
}

export async function finishQuestion(id: string, usage: AgentUsage, durationMs: number): Promise<void> {
  await supabaseAdmin.from('ai_usage').update({
    status: 'done', model: usage.model, input_tokens: usage.inputTokens, output_tokens: usage.outputTokens,
    cache_read_tokens: usage.cacheReadTokens, cache_write_tokens: usage.cacheWriteTokens, web_searches: usage.webSearches,
    cost_usd: usage.costUsd.toFixed(6), duration_ms: durationMs,
  }).eq('id', id)
}

/** Fehlgeschlagen: Frage zurückgeben (außer keepCharge) */
export async function releaseQuestion(id: string, keepCharge = false): Promise<void> {
  await supabaseAdmin.from('ai_usage').update(keepCharge ? { status: 'failed' } : { status: 'failed', charged: 0 }).eq('id', id)
}

export async function recordCachedAnswer(userId: string, model: string): Promise<void> {
  await supabaseAdmin.from('ai_usage').insert({ user_id: userId, charged: 0, status: 'cached', model, cost_usd: 0 })
}
