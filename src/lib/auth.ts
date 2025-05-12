// src/lib/auth.ts



export type UserRecord = { id: string; email: string; passwordHash: string }

// Dummy-Daten: später Deine echte Datenbank
const users: UserRecord[] = [
  { id: '1', email: 'alice@example.com', passwordHash: '$2b$10$...' },
  // …
]

export async function findUserByEmail(email: string): Promise<UserRecord|undefined> {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase())
}

import bcrypt from 'bcryptjs'

export function validatePassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}