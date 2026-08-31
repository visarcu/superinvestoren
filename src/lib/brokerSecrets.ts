// src/lib/brokerSecrets.ts
// Verschlüsselung für Broker-Zugangsdaten (z.B. Trading-212-API-Keys).
// AES-256-GCM mit Server-Secret aus BROKER_SYNC_KEY_SECRET (64 Hex-Zeichen
// = 32 Bytes). Nur serverseitig verwenden — niemals im Client importieren.
//
// Format: "v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>"

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function encryptionKey(): Buffer {
  const hex = process.env.BROKER_SYNC_KEY_SECRET
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('BROKER_SYNC_KEY_SECRET fehlt oder ist kein 64-stelliger Hex-String')
  }
  return Buffer.from(hex, 'hex')
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Unbekanntes Secret-Format')
  }
  const [, ivB64, tagB64, ctB64] = parts
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8')
}
