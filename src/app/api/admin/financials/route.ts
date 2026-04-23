// src/app/api/admin/financials/route.ts
// Admin CRUD API für manuell gepflegte DAX-Finanzdaten.
// GET  /api/admin/financials?ticker=SAP.DE → alle Statements für Ticker (oder alle)
// POST /api/admin/financials                → neuen Statement anlegen

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const ticker = request.nextUrl.searchParams.get('ticker')
  const where = ticker ? { ticker } : {}

  const statements = await prisma.financialStatement.findMany({
    where,
    orderBy: [{ fiscalYear: 'desc' }, { fiscalPeriod: 'desc' }],
    include: {
      company: {
        select: { ticker: true, name: true, nameShort: true, currency: true },
      },
    },
  })

  return NextResponse.json({ statements, count: statements.length })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  try {
    const body = await request.json()

    // Pflichtfelder prüfen
    const required = ['ticker', 'fiscalYear', 'fiscalPeriod', 'periodEnd']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Prüfe ob Firma existiert
    const company = await prisma.daxCompany.findUnique({
      where: { ticker: body.ticker },
    })
    if (!company) {
      return NextResponse.json(
        { error: `Unknown ticker: ${body.ticker}` },
        { status: 400 }
      )
    }

    const statement = await prisma.financialStatement.upsert({
      where: {
        ticker_fiscalYear_fiscalPeriod: {
          ticker: body.ticker,
          fiscalYear: body.fiscalYear,
          fiscalPeriod: body.fiscalPeriod,
        },
      },
      create: {
        ...body,
        periodEnd: new Date(body.periodEnd),
        reportDate: body.reportDate ? new Date(body.reportDate) : undefined,
        enteredByEmail: admin.email,
        currency: body.currency ?? company.currency,
      },
      update: {
        ...body,
        periodEnd: new Date(body.periodEnd),
        reportDate: body.reportDate ? new Date(body.reportDate) : undefined,
        enteredByEmail: admin.email,
      },
    })

    // Update company's lastReportedQ
    await prisma.daxCompany.update({
      where: { ticker: body.ticker },
      data: {
        lastReportedQ: `${body.fiscalPeriod}-${body.fiscalYear}`,
      },
    })

    return NextResponse.json({ statement })
  } catch (err: any) {
    console.error('POST /api/admin/financials failed:', err)
    return NextResponse.json(
      { error: err.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
