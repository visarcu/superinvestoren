// src/lib/ai/config.ts
// Modelle, Preise und Limits der Finclue AI an einer Stelle.

export type AiMode = 'standard' | 'gruendlich'

export interface AiModelConfig {
  model: string
  effort: 'low' | 'medium' | 'high'
  /** wie viele Fragen eine Antwort vom Kontingent abzieht */
  charge: number
}

export const AI_MODELS: Record<AiMode, AiModelConfig> = {
  standard: { model: 'claude-sonnet-5-5', effort: 'medium', charge: 1 },
  gruendlich: { model: 'claude-opus-5-5', effort: 'medium', charge: 2 },
}

/** US-Dollar je Million Tokens (Anthropic-Preisliste, Stand November 2026) */
export const MODEL_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
}
export const WEB_SEARCH_PRICE = 0.01

/** Spaltenvorschlag beim Depot-Import: nur eine Zuordnung, dafür reicht das kleine Modell */
export const COLUMN_MAPPING_MODEL = 'claude-haiku-5-5'

export const PREMIUM_QUESTIONS_PER_MONTH = 100
export const FREE_QUESTIONS_TOTAL = 5

export const MAX_QUESTION_LENGTH = 1_000
/** Werkzeugrunden je Frage, danach muss geantwortet werden */
export const MAX_TOOL_ROUNDS = 6
/** Vorherige Nachrichten, die mitgeschickt werden */
export const MAX_HISTORY_MESSAGES = 8
export const MAX_OUTPUT_TOKENS = 8_000
export const MAX_WEB_SEARCHES = 2

/** Allgemeine Antworten (ohne Bezug zur Person) werden kurz geteilt */
export const SHARED_ANSWER_TTL_MINUTES = 20

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

// AI_BETA_ALLOWLIST: kommaseparierte E-Mails ⇒ nur diese Nutzer, '*' ⇒ alle.
// Nicht gesetzt ⇒ in Produktion geschlossen, damit eine vergessene Variable die
// Beta nicht für alle öffnet. Lokal ist die KI ohne Variable offen.
export function isAiBetaUser(email: string | null | undefined): boolean {
  const raw = process.env.AI_BETA_ALLOWLIST?.trim()
  if (!raw) return process.env.NODE_ENV !== 'production'
  if (raw === '*') return true
  if (!email) return false
  return raw.split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}
