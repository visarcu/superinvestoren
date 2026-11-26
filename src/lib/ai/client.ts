// src/lib/ai/client.ts
// Ein Anthropic-Client für alle KI-Aufrufe (Finclue AI, Spaltenvorschlag beim Import).

import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  // Schlüssel mit Geltungsbereich „Organisation“ brauchen bei jeder Anfrage den
  // Workspace, Schlüssel für einen Workspace kommen ohne aus.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim()
  client ??= new Anthropic({
    maxRetries: 2,
    timeout: 100_000,
    ...(workspace ? { defaultHeaders: { 'anthropic-workspace-id': workspace } } : {}),
  })
  return client
}
