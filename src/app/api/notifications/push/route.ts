// src/app/api/notifications/push/route.ts
// Sends Expo push notifications to one or multiple users
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

interface PushPayload {
  userIds?: string[]       // send to specific users
  all?: boolean            // send to ALL users with a push token (use carefully)
  title: string
  body: string
  data?: Record<string, any>
}

export async function POST(request: NextRequest) {
  // Internal-only endpoint — verify secret header
  const secret = request.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userIds, all, title, body, data }: PushPayload = await request.json()

  if (!title || !body) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  try {
    // Fetch push tokens from device_tokens table
    let query = supabaseService
      .from('device_tokens')
      .select('token')

    if (!all && userIds?.length) {
      query = query.in('user_id', userIds)
    }

    const { data: rows, error } = await query
    if (error) throw error

    const tokens = (rows || [])
      .map((r: any) => r.token)
      .filter((t: string) => t?.startsWith('ExponentPushToken['))

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No push tokens found' })
    }

    // Send via Expo Push API (batch up to 100 per request)
    const messages = tokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }))

    const chunks = chunkArray(messages, 100)
    let totalSent = 0

    for (const chunk of chunks) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      })

      if (res.ok) {
        const result = await res.json()
        const successful = result.data?.filter((r: any) => r.status === 'ok').length ?? chunk.length
        totalSent += successful
        console.log(`✅ Push sent: ${successful}/${chunk.length}`)
      } else {
        console.error('❌ Expo push error:', await res.text())
      }
    }

    return NextResponse.json({ sent: totalSent, total: tokens.length })

  } catch (error: any) {
    console.error('Push notification error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to send push notifications', detail: error?.message }, { status: 500 })
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
