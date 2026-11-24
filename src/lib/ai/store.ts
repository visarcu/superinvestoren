// src/lib/ai/store.ts
// Verlauf und Antwort-Zwischenspeicher in Supabase. Jede Abfrage ist an die
// user_id gebunden, die der Server aus dem Token kennt.

import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { MAX_HISTORY_MESSAGES, SHARED_ANSWER_TTL_MINUTES } from './config'
import type { HistoryMessage } from './agent'
import type { AiContext, AiMessage, AiMessagePayload, AiThreadSummary } from './types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

export async function listThreads(userId: string, limit = 40): Promise<AiThreadSummary[]> {
  const { data } = await supabaseAdmin.from('ai_threads').select('id, title, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(limit)
  return (data ?? []).map(t => ({ id: t.id, title: t.title, updatedAt: t.updated_at }))
}

export async function loadThread(userId: string, threadId: string): Promise<{ title: string; context: AiContext | null; messages: AiMessage[] } | null> {
  const { data: thread } = await supabaseAdmin.from('ai_threads').select('title, context').eq('id', threadId).eq('user_id', userId).maybeSingle()
  if (!thread) return null
  const { data } = await supabaseAdmin.from('ai_messages').select('id, role, content, payload, created_at').eq('thread_id', threadId).eq('user_id', userId).order('created_at', { ascending: true }).limit(200)
  return {
    title: thread.title,
    context: (thread.context as AiContext | null) ?? null,
    messages: (data ?? []).map(m => ({ id: m.id, role: m.role, content: m.content, payload: m.payload ?? null, createdAt: m.created_at })),
  }
}

const fromDepot = (payload: AiMessagePayload | null): boolean =>
  !!payload?.mitDepot || !!payload?.quellen?.some(q => q.label.startsWith('Dein Depot'))

/** withDepot = false: Antworten mit Depotdaten samt Frage weglassen */
export async function loadHistory(userId: string, threadId: string, withDepot: boolean): Promise<HistoryMessage[] | null> {
  const thread = await loadThread(userId, threadId)
  if (!thread) return null
  const visible = withDepot ? thread.messages : thread.messages.filter((m, i) =>
    m.role === 'assistant' ? !fromDepot(m.payload) : !fromDepot(thread.messages[i + 1]?.role === 'assistant' ? thread.messages[i + 1].payload : null))
  const recent = visible.slice(-MAX_HISTORY_MESSAGES)
  // muss mit einer Frage beginnen
  while (recent.length > 0 && recent[0].role !== 'user') recent.shift()
  return recent.map(m => ({ role: m.role, content: m.content.replace(/\[\[\s*g\d+\s*\]\]\n?/g, ''), ...(fromDepot(m.payload) ? { mitDepot: true } : {}) }))
}

export async function createThread(userId: string, question: string, context: AiContext | null): Promise<string> {
  const title = question.replace(/\s+/g, ' ').trim().slice(0, 90)
  const { data, error } = await supabaseAdmin.from('ai_threads').insert({ user_id: userId, title, context }).select('id').single()
  if (error || !data) throw new Error('Gespräch konnte nicht angelegt werden')
  return data.id
}

/** Frage und Antwort gemeinsam speichern, abgebrochene Antworten gar nicht */
export async function saveExchange(userId: string, threadId: string, question: string, answer: string, payload: AiMessagePayload, model: string): Promise<void> {
  const asked = Date.now()
  await supabaseAdmin.from('ai_messages').insert([
    { thread_id: threadId, user_id: userId, role: 'user', content: question, created_at: new Date(asked - 1).toISOString() },
    { thread_id: threadId, user_id: userId, role: 'assistant', content: answer, payload, model, created_at: new Date(asked).toISOString() },
  ])
  await supabaseAdmin.from('ai_threads').update({ updated_at: new Date(asked).toISOString() }).eq('id', threadId).eq('user_id', userId)
}

export async function deleteThread(userId: string, threadId: string): Promise<void> {
  await supabaseAdmin.from('ai_threads').delete().eq('id', threadId).eq('user_id', userId)
}

// ── Geteilte Antworten ───────────────────────────────────────────────────────

const PERSONAL = /\b(ich|mir|mich|mein\w*|wir|uns|unser\w*|depots?|portfolios?|\w*depot)\b/i

/** Nur kurze, unpersönliche erste Fragen im Standardmodus werden geteilt. */
export function sharedAnswerKey(question: string, context: AiContext | null, mode: string, firstQuestion: boolean): string | null {
  const text = question.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()
  if (!firstQuestion || mode !== 'standard' || text.length < 8 || text.length > 120 || PERSONAL.test(text)) return null
  // Auf der Depotseite ist im Zweifel das eigene Depot gemeint
  if (context?.depotId) return null
  return createHash('sha256').update(`v2|${context?.symbol ?? ''}|${context?.depot ? 'd' : ''}|${text}`).digest('hex')
}

export async function readSharedAnswer(key: string): Promise<{ content: string; payload: AiMessagePayload; model: string } | null> {
  const { data } = await supabaseAdmin.from('ai_answer_cache').select('content, payload, model').eq('key', key).gt('expires_at', new Date().toISOString()).maybeSingle()
  return data ? { content: data.content, payload: data.payload as AiMessagePayload, model: data.model } : null
}

export async function writeSharedAnswer(key: string, content: string, payload: AiMessagePayload, model: string): Promise<void> {
  const now = Date.now()
  await supabaseAdmin.from('ai_answer_cache').upsert({
    key, content, payload, model, created_at: new Date(now).toISOString(), expires_at: new Date(now + SHARED_ANSWER_TTL_MINUTES * 60_000).toISOString(),
  })
}
