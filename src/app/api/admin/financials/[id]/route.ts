// src/app/api/admin/financials/[id]/route.ts
// PUT    → Einzelnen Statement updaten
// DELETE → Statement löschen

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/adminAuth'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: Params) {
  const admin = await verifyAdmin(request)
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const { id } = await params
  try {
    const body = await request.json()

    // Datum-Felder konvertieren
    if (body.periodEnd) body.periodEnd = new Date(body.periodEnd)
    if (body.reportDate) body.reportDate = new Date(body.reportDate)

    const statement = await prisma.financialStatement.update({
      where: { id },
      data: {
        ...body,
        enteredByEmail: admin.email,
      },
    })

    return NextResponse.json({ statement })
  } catch (err: any) {
    console.error('PUT /api/admin/financials/[id] failed:', err)
    return NextResponse.json(
      { error: err.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = await verifyAdmin(request)
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const { id } = await params
  try {
    await prisma.financialStatement.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('DELETE /api/admin/financials/[id] failed:', err)
    return NextResponse.json(
      { error: err.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
