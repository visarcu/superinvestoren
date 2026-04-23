// src/lib/adminAuth.ts
// Admin-Auth Helper: Prüft via Supabase Session ob User Admin ist.
// Admin = Email in ADMIN_EMAILS Liste.

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin-Emails (Single-User Admin System)
const ADMIN_EMAILS = ['visarcurraj95@gmail.com', 'visi1@hotmail.de']

export interface AdminCheckResult {
  ok: boolean
  email?: string
  error?: string
  status?: number
}

/**
 * Prüft ob der Request von einem Admin kommt.
 * Akzeptiert entweder:
 *  - Bearer Token im Authorization Header (Supabase Access Token)
 *  - oder supabase-auth Cookie (bei Browser-Requests)
 */
export async function verifyAdmin(request: NextRequest): Promise<AdminCheckResult> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Versuche Bearer Token
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return { ok: false, error: 'Invalid token', status: 401 }
      }
      if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return { ok: false, error: 'Not an admin', status: 403 }
      }
      return { ok: true, email: user.email }
    }

    return { ok: false, error: 'No authorization header', status: 401 }
  } catch (err) {
    console.error('Admin check failed:', err)
    return { ok: false, error: 'Auth check error', status: 500 }
  }
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
