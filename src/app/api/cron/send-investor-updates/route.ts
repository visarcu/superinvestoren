// src/app/api/cron/send-investor-updates/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchLatest13F, sendInvestorUpdate } from '@/lib/investor-utils'

export async function GET() {
  // 1) finde alle Investoren, für die es ein neues Filing gibt...
  const investors = await prisma.investorSubscription.groupBy({
    by: ['investorId'],
    where: { confirmed: true },
  })

  for (const { investorId } of investors) {
    const latest = await fetchLatest13F(investorId)    // deine Logik, FMP oder EDGAR
    const record = await prisma.investorLastFiling.findUnique({ where: { investorId }})
    if (!record || record.date < latest.date) {
      // 2) Mail an alle Abonnenten schicken
      const subs = await prisma.investorSubscription.findMany({
        where: { investorId, confirmed: true }
      })
      for (const s of subs) {
        await sendInvestorUpdate(s.email, investorId, latest)
      }
      // 3) und dann lastFiling updaten
      await prisma.investorLastFiling.upsert({
        where: { investorId },
        create: { investorId, date: latest.date },
        update: { date: latest.date },
      })
    }
  }

  return NextResponse.json({ success: true })
}