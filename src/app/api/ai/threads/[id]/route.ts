// src/app/api/ai/threads/[id]/route.ts
// Ein Gespräch der Finclue AI laden oder löschen.

import { NextResponse } from 'next/server'
import { getAiUser } from '@/lib/ai/auth'
import { isAiBetaUser } from '@/lib/ai/config'
import { deleteThread, isUuid, loadThread } from '@/lib/ai/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getAiUser(request)
  if (!user) return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 })
  if (!isAiBetaUser(user.email) || !isUuid(params.id)) return NextResponse.json({ error: 'Gespräch nicht gefunden.' }, { status: 404 })
  const thread = await loadThread(user.id, params.id)
  if (!thread) return NextResponse.json({ error: 'Gespräch nicht gefunden.' }, { status: 404 })
  return NextResponse.json(thread)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getAiUser(request)
  if (!user) return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 })
  if (!isUuid(params.id)) return NextResponse.json({ error: 'Gespräch nicht gefunden.' }, { status: 404 })
  await deleteThread(user.id, params.id)
  return NextResponse.json({ ok: true })
}
