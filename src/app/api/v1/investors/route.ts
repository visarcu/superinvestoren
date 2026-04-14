// Finclue Data API v1 – Superinvestoren Liste
// GET /api/v1/investors
// GET /api/v1/investors?type=investor|fund
// Source: Eigene 13F Filing Daten (SEC EDGAR)

import { NextRequest, NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { investors } from '@/data/investors'

// Investor Metadata (name, company, type, image)
const INVESTOR_META: Record<string, { name: string; company: string; type: 'investor' | 'fund'; cik?: string }> = {
  buffett: { name: 'Warren Buffett', company: 'Berkshire Hathaway', type: 'investor', cik: '1067983' },
  ackman: { name: 'Bill Ackman', company: 'Pershing Square', type: 'investor', cik: '1336528' },
  gates: { name: 'Bill Gates', company: 'Bill & Melinda Gates Foundation', type: 'investor' },
  burry: { name: 'Michael Burry', company: 'Scion Asset Management', type: 'investor', cik: '1649339' },
  druckenmiller: { name: 'Stanley Druckenmiller', company: 'Duquesne Family Office', type: 'investor', cik: '1536411' },
  marks: { name: 'Howard Marks', company: 'Oaktree Capital', type: 'investor' },
  tepper: { name: 'David Tepper', company: 'Appaloosa Management', type: 'investor', cik: '1656456' },
  einhorn: { name: 'David Einhorn', company: 'Greenlight Capital', type: 'investor', cik: '1489933' },
  coleman: { name: 'Chase Coleman', company: 'Tiger Global', type: 'investor', cik: '1167483' },
  hohn: { name: 'Chris Hohn', company: 'TCI Fund Management', type: 'investor', cik: '1647251' },
  gayner: { name: 'Thomas Gayner', company: 'Markel Group', type: 'investor', cik: '1096343' },
  akre: { name: 'Chuck Akre', company: 'Akre Capital Management', type: 'investor', cik: '1112520' },
  fisher: { name: 'Ken Fisher', company: 'Fisher Asset Management', type: 'investor' },
  ainslie: { name: 'Lee Ainslie', company: 'Maverick Capital', type: 'investor', cik: '934639' },
  yacktman: { name: 'Donald Yacktman', company: 'Yacktman Asset Management', type: 'investor' },
  bloomstran: { name: 'Chris Bloomstran', company: 'Semper Augustus', type: 'investor', cik: '1115373' },
  mandel: { name: 'Stephen Mandel', company: 'Lone Pine Capital', type: 'investor', cik: '1061165' },
  ellenbogen: { name: 'Henry Ellenbogen', company: 'Durable Capital Partners', type: 'investor', cik: '1798849' },
  russo: { name: 'Tom Russo', company: 'Gardner Russo & Quinn', type: 'investor', cik: '860643' },
  pabrai: { name: 'Mohnish Pabrai', company: 'Pabrai Investment Funds', type: 'investor' },
  duan: { name: 'Duan Yongping', company: 'H&H International Investment', type: 'investor', cik: '1759760' },
  viking: { name: 'Viking Global', company: 'Viking Global Investors', type: 'fund', cik: '1103804' },
  cantillon: { name: 'Cantillon Capital', company: 'Cantillon Capital Management', type: 'fund', cik: '1279936' },
  polen: { name: 'Polen Capital', company: 'Polen Capital Management', type: 'fund', cik: '1034524' },
  jensen: { name: 'Jensen Investment Management', company: 'Jensen Investment Management', type: 'fund', cik: '1106129' },
  armitage: { name: 'John Armitage', company: 'Egerton Capital', type: 'investor', cik: '1581811' },
  smith: { name: 'Terry Smith', company: 'Fundsmith', type: 'investor' },
  altarockpartners: { name: 'Alta Rock Partners', company: 'Altarock Partners', type: 'fund', cik: '1631014' },
  gregalexander: { name: 'Greg Alexander', company: 'Conifer Management', type: 'investor', cik: '1773994' },
  abrams: { name: 'David Abrams', company: 'Abrams Capital', type: 'investor' },
  berkowitz: { name: 'Bruce Berkowitz', company: 'Fairholme Capital', type: 'investor' },
  dodgecox: { name: 'Dodgecox', company: 'Dodge & Cox', type: 'fund' },
  firsteagle: { name: 'First Eagle Investment', company: 'First Eagle Investment Management', type: 'fund' },
  bobrinskoy: { name: 'Charles Bobrinskoy', company: 'Ariel Investments', type: 'investor' },
  bares: { name: 'Brian Bares', company: 'Bares Capital Management', type: 'investor' },
  greenbrier: { name: 'Robert Sands', company: 'Greenbrier Partners', type: 'investor' },
  mairs: { name: 'Mairs & Power', company: 'Mairs & Power Inc', type: 'fund' },
  chou: { name: 'Francis Chou', company: 'Chou Associates', type: 'investor' },
  vinall: { name: 'Robert Vinall', company: 'RV Capital', type: 'investor', cik: '1766596' },
}

function fmtValue(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)} Bio. $`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Mrd. $`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} Mio. $`
  return `${(v / 1e3).toFixed(0)}K $`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type') // 'investor' | 'fund'
  const search = searchParams.get('search')?.toLowerCase()

  const history = holdingsHistory as Record<string, any[]>
  const results: any[] = []

  for (const [slug, snapshots] of Object.entries(history)) {
    if (!snapshots || snapshots.length === 0) continue

    const latest = snapshots[snapshots.length - 1]?.data
    if (!latest?.positions) continue

    const meta = INVESTOR_META[slug]
    const investorInfo = investors.find(inv => inv.slug === slug)
    const name = meta?.name || investorInfo?.name || slug
    const company = meta?.company || ''
    const type = meta?.type || 'investor'

    // Filter
    if (typeFilter && type !== typeFilter) continue
    if (search && !name.toLowerCase().includes(search) && !company.toLowerCase().includes(search) && !slug.includes(search)) continue

    const totalValue = latest.positions.reduce((s: number, p: any) => s + (p.value || 0), 0)
    const positionsCount = latest.positions.length

    // Top 3 Holdings
    const sorted = [...latest.positions].sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
    const top3 = sorted.slice(0, 3).map((p: any) => ({
      name: p.name,
      ticker: p.ticker || null,
      value: p.value,
      pct: totalValue > 0 ? ((p.value || 0) / totalValue) * 100 : 0,
    }))
    const top3Pct = top3.reduce((s, h) => s + h.pct, 0)

    // Quartals-Performance (Wertänderung zum Vorquartal)
    let quarterlyChange: number | null = null
    let totalChange: number | null = null
    if (snapshots.length >= 2) {
      const prev = snapshots[snapshots.length - 2]?.data
      if (prev?.positions) {
        const prevTotal = prev.positions.reduce((s: number, p: any) => s + (p.value || 0), 0)
        if (prevTotal > 0) quarterlyChange = ((totalValue - prevTotal) / prevTotal) * 100
      }
    }
    if (snapshots.length >= 5) {
      const first = snapshots[0]?.data
      if (first?.positions) {
        const firstTotal = first.positions.reduce((s: number, p: any) => s + (p.value || 0), 0)
        if (firstTotal > 0) totalChange = ((totalValue - firstTotal) / firstTotal) * 100
      }
    }

    // Filing date
    const filingDate = latest.date
    const [y, m] = filingDate.split('-').map(Number)
    const reportQ = Math.ceil(m / 3) - 1 || 4
    const reportY = reportQ === 4 && m <= 3 ? y - 1 : y

    results.push({
      slug,
      name,
      company,
      type,
      image: investorInfo?.imageUrl || null,
      cik: meta?.cik || null,
      portfolioValue: totalValue,
      portfolioValueFormatted: fmtValue(totalValue),
      positionsCount,
      quarter: `Q${reportQ} ${reportY}`,
      filingDate,
      top3Holdings: top3,
      top3Pct: Math.round(top3Pct * 100) / 100,
      quarterlyChange: quarterlyChange !== null ? Math.round(quarterlyChange * 10) / 10 : null,
      totalChange: totalChange !== null ? Math.round(totalChange * 10) / 10 : null,
    })
  }

  // Sort by portfolio value
  results.sort((a, b) => b.portfolioValue - a.portfolioValue)

  return NextResponse.json({
    investors: results,
    count: results.length,
    investorCount: results.filter(r => r.type === 'investor').length,
    fundCount: results.filter(r => r.type === 'fund').length,
    source: 'sec-13f',
    fetchedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  })
}
