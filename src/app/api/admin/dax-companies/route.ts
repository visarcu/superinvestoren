// src/app/api/admin/dax-companies/route.ts
// Admin: Liste aller DAX-Firmen mit Übersicht der bereits gepflegten Statements.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const companies = await prisma.daxCompany.findMany({
    orderBy: { nameShort: 'asc' },
    include: {
      statements: {
        orderBy: [{ fiscalYear: 'desc' }, { fiscalPeriod: 'desc' }],
        select: {
          id: true,
          fiscalYear: true,
          fiscalPeriod: true,
          periodEnd: true,
          reportDate: true,
          verified: true,
          revenue: true,
          netIncome: true,
        },
      },
    },
  })

  // Statistiken anreichern
  const enriched = companies.map(c => ({
    ...c,
    stmtCount: c.statements.length,
    latestPeriod: c.statements[0]
      ? `${c.statements[0].fiscalPeriod}-${c.statements[0].fiscalYear}`
      : null,
  }))

  return NextResponse.json({
    companies: enriched,
    total: companies.length,
    totalStatements: companies.reduce((n, c) => n + c.statements.length, 0),
  })
}

export async function PUT(request: NextRequest) {
  // Update einer DaxCompany (z.B. nextEarningsDate setzen)
  const admin = await verifyAdmin(request)
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  try {
    const body = await request.json()
    if (!body.ticker) {
      return NextResponse.json({ error: 'ticker required' }, { status: 400 })
    }

    const { ticker, ...data } = body
    if (data.nextEarningsDate) data.nextEarningsDate = new Date(data.nextEarningsDate)

    const company = await prisma.daxCompany.update({
      where: { ticker },
      data,
    })

    return NextResponse.json({ company })
  } catch (err: any) {
    console.error('PUT /api/admin/dax-companies failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
