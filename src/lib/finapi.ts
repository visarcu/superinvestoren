// src/lib/finapi.ts
// finAPI-Anbindung für den Broker-Sync (Beta). Nur serverseitig.
//
// Architektur: Pro Finclue-User existiert genau ein finAPI-User (angelegt
// mit Zufallspasswort, abgelegt in broker_connections — Service-Role-only).
// Der Nutzer verbindet sein Depot über die finAPI-WebForm: Zugangsdaten
// gehen NIE durch Finclue, sondern direkt an finAPI (BaFin-lizenzierter
// Kontoinformationsdienst). Wir lesen danach nur Bestände/Transaktionen.
//
// Sandbox/Produktion wird über FINAPI_BASE_URL/FINAPI_WEBFORM_URL gesteuert
// (Default: Sandbox — der 30-Tage-Testzugang).

import { randomBytes } from 'crypto'

const BASE = process.env.FINAPI_BASE_URL || 'https://sandbox.finapi.io'
const WEBFORM_BASE = process.env.FINAPI_WEBFORM_URL || 'https://webform-sandbox.finapi.io'

// Client-Token mit Ablauf-Cache (pro Serverless-Instanz)
let clientToken: { token: string; expiresAt: number } | null = null

function credentials() {
  const id = process.env.FINAPI_CLIENT_ID
  const secret = process.env.FINAPI_CLIENT_SECRET
  if (!id || !secret) throw new Error('finAPI nicht konfiguriert')
  return { id, secret }
}

async function tokenRequest(params: Record<string, string>): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(`${BASE}/api/v2/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`finAPI Token-Fehler ${res.status}`)
  return res.json()
}

export async function getClientToken(): Promise<string> {
  if (clientToken && Date.now() < clientToken.expiresAt - 60_000) return clientToken.token
  const { id, secret } = credentials()
  const tok = await tokenRequest({ grant_type: 'client_credentials', client_id: id, client_secret: secret })
  clientToken = { token: tok.access_token, expiresAt: Date.now() + tok.expires_in * 1000 }
  return tok.access_token
}

export async function getUserToken(finapiUserId: string, finapiUserPassword: string): Promise<string> {
  const { id, secret } = credentials()
  const tok = await tokenRequest({
    grant_type: 'password',
    client_id: id,
    client_secret: secret,
    username: finapiUserId,
    password: finapiUserPassword,
  })
  return tok.access_token
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`finAPI ${path} → ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

/** finAPI-User anlegen — id/password generieren wir, der Aufrufer persistiert sie */
export async function createFinapiUser(): Promise<{ finapiUserId: string; finapiUserPassword: string }> {
  const finapiUserId = `fc-${randomBytes(8).toString('hex')}`
  const finapiUserPassword = randomBytes(24).toString('base64url')
  const token = await getClientToken()
  await api('/api/v2/users', token, {
    method: 'POST',
    body: JSON.stringify({ id: finapiUserId, password: finapiUserPassword }),
  })
  return { finapiUserId, finapiUserPassword }
}

/** WebForm für den Verbindungs-Aufbau erzeugen (URL für den Nutzer) */
export async function createConnectWebForm(userToken: string, bankId: number): Promise<{ url: string; id: string }> {
  const res = await fetch(`${WEBFORM_BASE}/api/webForms/bankConnectionImport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bank: { id: bankId },
      accountTypes: ['CHECKING', 'SECURITY'],
    }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`WebForm-Fehler ${res.status}`)
  const data = await res.json()
  return { url: data.url, id: data.id }
}

export interface FinapiConnection {
  id: number
  name: string | null
  bank?: { name?: string }
  updateStatus: string
  accountIds: number[]
}

export async function listConnections(userToken: string): Promise<FinapiConnection[]> {
  const res = await api<{ connections: any[] }>('/api/v2/bankConnections', userToken)
  return (res.connections || []).map(c => ({
    id: c.id,
    name: c.name ?? null,
    bank: { name: c.bank?.name },
    updateStatus: c.updateStatus,
    accountIds: c.accountIds || [],
  }))
}

export interface FinapiAccount {
  id: number
  bankConnectionId: number | null
  accountName: string | null
  accountType: string | null
  balance: number | null
}

export async function listAccounts(userToken: string): Promise<FinapiAccount[]> {
  const res = await api<{ accounts: any[] }>('/api/v2/accounts', userToken)
  return (res.accounts || []).map(a => ({
    id: a.id,
    bankConnectionId: a.bankConnectionId ?? null,
    accountName: a.accountName ?? null,
    accountType: a.accountType ?? null,
    balance: a.balance != null ? Number(a.balance) : null,
  }))
}

export interface FinapiSecurity {
  accountId: number | null
  isin: string | null
  wkn: string | null
  name: string | null
  quantity: number | null
  entryQuote: number | null
  quote: number | null
  quoteDate: string | null
  marketValue: number | null
}

export async function listSecurities(userToken: string, accountIds?: number[]): Promise<FinapiSecurity[]> {
  const filter = accountIds?.length ? `&accountIds=${accountIds.join(',')}` : ''
  const res = await api<{ securities: any[] }>(`/api/v2/securities?perPage=500${filter}`, userToken)
  return (res.securities || [])
    .map(s => ({
      accountId: s.accountId ?? null,
      isin: s.isin ?? null,
      wkn: s.wkn ?? null,
      name: s.name ?? null,
      quantity: s.quantityNominal != null ? Number(s.quantityNominal) : null,
      entryQuote: s.entryQuote != null ? Number(s.entryQuote) : null,
      quote: s.quote != null ? Number(s.quote) : null,
      quoteDate: s.quoteDate ?? null,
      marketValue: s.marketValue != null ? Number(s.marketValue) : null,
    }))
    // Server-Filter + lokale Absicherung (falls accountIds-Param ignoriert wird)
    .filter(s => !accountIds?.length || (s.accountId != null && accountIds.includes(s.accountId)))
}

/** Konto-IDs einer Bankverbindung (für gezielten Abgleich/Import) */
export async function accountIdsForConnection(userToken: string, connectionId: number): Promise<{ securityIds: number[]; checkingBalance: number }> {
  const accounts = await listAccounts(userToken)
  const forConnection = accounts.filter(a => a.bankConnectionId === connectionId)
  const securityIds = forConnection
    .filter(a => (a.accountType || '').toUpperCase() === 'SECURITY')
    .map(a => a.id)
  const checkingBalance = forConnection
    .filter(a => (a.accountType || '').toUpperCase() !== 'SECURITY')
    .reduce((sum, a) => sum + (a.balance || 0), 0)
  return { securityIds, checkingBalance }
}

/** Bekannte Bank-IDs für den Beta-Sync (aus dem Sandbox-Katalog verifiziert) */
export const FINAPI_BANKS = [
  { id: 280127, name: 'Scalable Capital' },
  { id: 280142, name: 'Trade Republic' },
  { id: 25546, name: 'ING' },
  { id: 24463, name: 'comdirect' },
] as const
