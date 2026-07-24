// src/lib/brevo.ts
// Brevo (ehemals Sendinblue) API-Client — Kontakte in eine Liste synchronisieren.
//
// Nutzt den Bulk-Import-Endpoint (POST /v3/contacts/import). Der Import ist
// idempotent: updateExistingContacts aktualisiert bestehende Kontakte statt zu
// duplizieren. Ein Request pro Chunk (statt einer pro Kontakt) — schont das
// Rate-Limit und läuft in Sekunden durch.

const BREVO_IMPORT_URL = 'https://api.brevo.com/v3/contacts/import'
const CHUNK_SIZE = 1000 // Kontakte pro Import-Request (Brevo-Body-Limit ~8 MB)

export interface BrevoContact {
  email: string
  attributes?: Record<string, string | number | boolean>
}

export interface BrevoSyncResult {
  ok: boolean
  imported: number
  chunks: number
  errors: string[]
}

/**
 * Synct eine Liste von Kontakten idempotent nach Brevo (Upsert in eine Liste).
 * Wirft, wenn BREVO_API_KEY fehlt oder die listId ungültig ist.
 */
export async function syncContactsToBrevo(
  contacts: BrevoContact[],
  listId: number,
): Promise<BrevoSyncResult> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY fehlt')
  if (!listId || Number.isNaN(listId)) throw new Error('BREVO_LIST_ID fehlt oder ungültig')

  const errors: string[] = []
  let imported = 0
  let chunks = 0

  for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
    const chunk = contacts.slice(i, i + CHUNK_SIZE)
    chunks++

    const res = await fetch(BREVO_IMPORT_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        listIds: [listId],
        updateExistingContacts: true, // idempotent: bestehende Kontakte aktualisieren
        emptyContactsAttributes: false, // leere Felder überschreiben KEINE vorhandenen Werte
        jsonBody: chunk,
      }),
    })

    // Import ist async — Brevo antwortet mit 202 (Accepted) + processId.
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      errors.push(`Chunk ${chunks} (HTTP ${res.status}): ${body.slice(0, 300)}`)
      continue
    }
    imported += chunk.length
  }

  return { ok: errors.length === 0, imported, chunks, errors }
}
