// src/app/api/v1/financials/[ticker]/route.ts
// Öffentliche API: Liefert manuell gepflegte DAX-Finanzdaten pro Ticker.
// Quelle: Eigene Daten, manuell aus Original-Geschäftsberichten eingepflegt.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Params {
  params: Promise<{ ticker: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { ticker } = await params
  const tickerUpper = ticker.toUpperCase()
  const period = request.nextUrl.searchParams.get('period') // optional: "Q1","FY",...

  const company = await prisma.daxCompany.findUnique({
    where: { ticker: tickerUpper },
    include: {
      statements: {
        where: period ? { fiscalPeriod: period } : undefined,
        orderBy: [{ fiscalYear: 'desc' }, { periodEnd: 'desc' }],
      },
    },
  })

  if (!company) {
    return NextResponse.json({ error: 'Unknown ticker' }, { status: 404 })
  }

  return NextResponse.json(
    {
      ticker: company.ticker,
      name: company.name,
      nameShort: company.nameShort,
      sector: company.sector,
      currency: company.currency,
      fiscalYearEnd: company.fiscalYearEnd,
      source: 'finclue-manual',
      standard: 'IFRS',
      periods: company.statements,
      count: company.statements.length,
    },
    {
      headers: {
        // Cache 30 Min – Daten ändern sich nur quartalsweise
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    }
  )
}
