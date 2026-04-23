// src/app/api/admin/financials/parse-esef/route.ts
// POST: Upload ESEF ZIP → Parse → Return preview (noch nicht gespeichert)
// Der User kann im Review-UI korrigieren und dann via /api/admin/financials POST speichern.

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/adminAuth'
import { parseEsefZip } from '@/lib/esef/ixbrlParser'
import { prisma } from '@/lib/prisma'

// Größere Uploads erlauben (ESEF ZIPs sind typisch 5-15 MB)
export const maxDuration = 60
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const parsed = await parseEsefZip(buffer)

    // LEI → Ticker auflösen (falls bekannt)
    let matchedCompany = null
    if (parsed.entityLei) {
      matchedCompany = await prisma.daxCompany.findFirst({
        where: { lei: parsed.entityLei },
        select: { ticker: true, name: true, nameShort: true, currency: true, fiscalYearEnd: true },
      })
    }

    // Je-Periode rawFacts zuordnen anhand der contextRef-Dates
    const periodsWithFacts = parsed.periods.map(p => {
      const periodFacts: Record<string, any> = {}
      for (const [key, fact] of Object.entries(parsed.rawFacts)) {
        // Nur Facts die zu dieser Periode gehören
        // Heuristik: Context-Dates mit periodEnd matchen (via year-end match)
        // Für Einfachheit: alle rawFacts mit contextRef deren endDate/instant == periodEnd
        // → Das erfordert uns die contexts auch zu kennen. Wir verlassen uns darauf dass
        //   die Mapping-Logik bereits periodEnd-korrekte Zuordnung gemacht hat.
        // Für rawFacts-Speicherung: wir schicken ALLE facts mit, Admin-UI zeigt nur mapped.
        periodFacts[key] = fact
      }
      return { ...p, rawFacts: periodFacts }
    })

    return NextResponse.json({
      filename: file.name,
      size: buffer.length,
      entityLei: parsed.entityLei,
      matchedCompany,
      periods: periodsWithFacts,
      stats: {
        totalFacts: parsed.totalFacts,
        mappedFacts: parsed.mappedFacts,
        skippedFactsWithDimensions: parsed.skippedFactsWithDimensions,
      },
      warnings: parsed.warnings.slice(0, 20),
    })
  } catch (err: any) {
    console.error('ESEF Parse Error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Parse fehlgeschlagen' },
      { status: 500 }
    )
  }
}
