// src/app/api/notifications/check-portfolio-si/route.ts
// Cron: Checks if superinvestors made moves on stocks that portfolio users hold
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

// TEST MODE: Only send notifications to this user. Set to null to send to all.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const envTestUserId = process.env.TEST_USER_ID || null
const TEST_USER_ID = envTestUserId && UUID_REGEX.test(envTestUserId) ? envTestUserId : null

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Ticker resolution helpers (same as super-investor-overlap)
const NOISE = new Set(['INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'LTD', 'LIMITED', 'PLC', 'LP', 'LLC', 'NV', 'SA', 'AG', 'SE', 'THE', 'OF', 'AND', '&', 'A', 'AN', 'CLASS', 'CL', 'SHS', 'NEW', 'DEL', 'COM', 'ORD', 'SER', 'SERIES'])
const ABBREVS: Record<string, string> = { 'HLDGS': 'HOLDINGS', 'CORP': 'CORPORATION', 'INC': 'INCORPORATED', 'INTL': 'INTERNATIONAL', 'TECH': 'TECHNOLOGY', 'TECHS': 'TECHNOLOGIES', 'GRP': 'GROUP', 'SVCS': 'SERVICES', 'FINL': 'FINANCIAL', 'MGMT': 'MANAGEMENT' }

const cusipIdx = new Map<string, string>()
const nameIdx = new Map<string, string>()
for (const s of stocks) {
  if (s.cusip) cusipIdx.set(s.cusip, s.ticker)
  const k = nameKey(s.name); if (k) nameIdx.set(k, s.ticker)
}

function nameKey(name: string): string {
  const w = name.toUpperCase().replace(/[.,\-\/\\()&'"!]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')
  return w.filter(x => !NOISE.has(x)).map(x => ABBREVS[x] || x).filter(x => !NOISE.has(x)).join('|')
}

function resolveTicker(pos: any): string | null {
  if (pos.ticker) return pos.ticker
  if (pos.cusip) { const t = cusipIdx.get(pos.cusip); if (t) return t }
  if (pos.name) { const k = nameKey(pos.name); if (k) { const t = nameIdx.get(k); if (t) return t } }
  return null
}

interface SIMove {
  investorName: string
  investorSlug: string
  ticker: string
  moveType: 'neu_gekauft' | 'aufgestockt' | 'reduziert' | 'verkauft'
  changePercent: number
  currentShares: number
  currentValue: number
}

// Detect significant SI moves on a set of tickers
function detectSIMoves(targetTickers: Set<string>): SIMove[] {
  const moves: SIMove[] = []

  Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
    const inv = investors.find(i => i.slug === slug)
    if (!inv || !snapshots || snapshots.length < 2) return

    const latest = snapshots[snapshots.length - 1]?.data
    const previous = snapshots[snapshots.length - 2]?.data
    if (!latest?.positions || !previous?.positions) return

    // Check current positions for target tickers
    for (const ticker of targetTickers) {
      const curPositions = latest.positions.filter((p: any) => resolveTicker(p) === ticker)
      const prevPositions = previous.positions.filter((p: any) => resolveTicker(p) === ticker)

      const curShares = curPositions.reduce((s: number, p: any) => s + (p.shares || 0), 0)
      const prevShares = prevPositions.reduce((s: number, p: any) => s + (p.shares || 0), 0)
      const curValue = curPositions.reduce((s: number, p: any) => s + (p.value || 0), 0)

      // Skip negligible positions
      if (curShares === 0 && prevShares === 0) continue
      if (curValue < 100000 && curShares === 0) continue

      let moveType: SIMove['moveType'] | null = null
      let changePercent = 0

      if (prevShares === 0 && curShares > 0 && curValue >= 1000000) {
        moveType = 'neu_gekauft'
        changePercent = 100
      } else if (prevShares > 0 && curShares === 0) {
        moveType = 'verkauft'
        changePercent = -100
      } else if (prevShares > 0 && curShares > 0) {
        changePercent = ((curShares - prevShares) / prevShares) * 100
        const minThreshold = Math.max(1000, prevShares * 0.01) // 1% or min 1000 shares
        if (Math.abs(curShares - prevShares) >= minThreshold && Math.abs(changePercent) >= 5) {
          moveType = changePercent > 0 ? 'aufgestockt' : 'reduziert'
        }
      }

      if (moveType) {
        moves.push({
          investorName: inv.name,
          investorSlug: slug,
          ticker,
          moveType,
          changePercent,
          currentShares: curShares,
          currentValue: curValue
        })
      }
    }
  })

  return moves
}

// Get current quarter key from latest holdings data
function getCurrentQuarterKey(): string {
  const allSnapshots = Object.values(holdingsHistory).flat()
  if (allSnapshots.length === 0) return 'unknown'
  const latest = allSnapshots.sort((a: any, b: any) => (b.quarter || '').localeCompare(a.quarter || ''))[0]
  return (latest as any)?.quarter || 'unknown'
}

async function handleCheck(queryTestUserId: string | null = null) {
  const startTime = Date.now()
  const testUser = queryTestUserId || TEST_USER_ID
  console.log(`[SI-Portfolio-Alert] Starting check... Test mode: ${testUser ? 'ON (' + testUser + ')' : 'OFF'}`)

  const currentQuarter = getCurrentQuarterKey()
  let notificationsCreated = 0

  try {
    // 1. Get all users who have portfolio holdings
    let holdingsQuery = supabaseService
      .from('portfolio_holdings')
      .select('portfolio_id, symbol, user_id:portfolios(user_id)')

    // In test mode, only fetch holdings for the test user's portfolios
    if (testUser) {
      const { data: testPortfolios } = await supabaseService
        .from('portfolios')
        .select('id')
        .eq('user_id', testUser)
      if (testPortfolios && testPortfolios.length > 0) {
        holdingsQuery = holdingsQuery.in('portfolio_id', testPortfolios.map(p => p.id))
      }
    }

    const { data: portfolioHoldings, error: holdingsError } = await holdingsQuery

    if (holdingsError) {
      console.error('[SI-Portfolio-Alert] Error fetching holdings:', holdingsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!portfolioHoldings || portfolioHoldings.length === 0) {
      console.log('[SI-Portfolio-Alert] No portfolio holdings found')
      return NextResponse.json({ message: 'No holdings', notificationsCreated: 0 })
    }

    // 2. Group holdings by user
    const userTickers = new Map<string, Set<string>>()
    for (const h of portfolioHoldings) {
      const userId = (h as any).user_id?.user_id
      if (!userId) continue
      if (!userTickers.has(userId)) userTickers.set(userId, new Set())
      userTickers.get(userId)!.add(h.symbol.toUpperCase())
    }

    console.log(`[SI-Portfolio-Alert] ${userTickers.size} users with portfolios`)

    // 3. Get ALL unique tickers across all users
    const allTickers = new Set<string>()
    for (const tickers of userTickers.values()) {
      for (const t of tickers) allTickers.add(t)
    }

    // 4. Detect SI moves on all tickers (single pass)
    const siMoves = detectSIMoves(allTickers)
    console.log(`[SI-Portfolio-Alert] Detected ${siMoves.length} significant SI moves`)

    if (siMoves.length === 0) {
      return NextResponse.json({ message: 'No new SI moves', notificationsCreated: 0 })
    }

    // 5. Group moves by ticker for multi-investor detection
    const movesByTicker = new Map<string, SIMove[]>()
    for (const move of siMoves) {
      if (!movesByTicker.has(move.ticker)) movesByTicker.set(move.ticker, [])
      movesByTicker.get(move.ticker)!.push(move)
    }

    // 6. For each user, check if their tickers have SI moves
    for (const [userId, tickers] of userTickers.entries()) {
      for (const ticker of tickers) {
        const tickerMoves = movesByTicker.get(ticker)
        if (!tickerMoves || tickerMoves.length === 0) continue

        // Check deduplication: have we already notified this user about this ticker+quarter?
        const refId = `si-portfolio-${ticker}-${currentQuarter}`
        const { data: existing } = await supabaseService
          .from('notification_log')
          .select('id')
          .eq('user_id', userId)
          .eq('notification_type', 'portfolio_update')
          .eq('reference_id', refId)
          .maybeSingle()

        if (existing) continue // Already notified

        // Build notification
        const buyers = tickerMoves.filter(m => m.moveType === 'neu_gekauft' || m.moveType === 'aufgestockt')
        const sellers = tickerMoves.filter(m => m.moveType === 'reduziert' || m.moveType === 'verkauft')

        let title: string
        let message: string

        if (tickerMoves.length >= 3) {
          // Multi-investor move
          if (buyers.length > sellers.length) {
            title = `🔥 ${tickerMoves.length} Superinvestoren kaufen ${ticker}`
            message = `${buyers.map(m => m.investorName).join(', ')} stocken ihre ${ticker}-Position auf.`
          } else if (sellers.length > buyers.length) {
            title = `⚠️ ${tickerMoves.length} Superinvestoren verkaufen ${ticker}`
            message = `${sellers.map(m => m.investorName).join(', ')} reduzieren ihre ${ticker}-Position.`
          } else {
            title = `🤔 ${tickerMoves.length} Superinvestoren bewegen ${ticker}`
            message = `Gemischte Signale: ${buyers.length} kaufen, ${sellers.length} verkaufen.`
          }
        } else {
          // Single or few investors
          const move = tickerMoves[0]
          const actionText = {
            neu_gekauft: 'hat eine neue Position in',
            aufgestockt: 'hat',
            reduziert: 'hat',
            verkauft: 'hat',
          }[move.moveType]

          const suffix = {
            neu_gekauft: 'eröffnet',
            aufgestockt: `aufgestockt (+${Math.abs(move.changePercent).toFixed(0)}%)`,
            reduziert: `reduziert (${move.changePercent.toFixed(0)}%)`,
            verkauft: 'komplett verkauft',
          }[move.moveType]

          title = `${move.investorName} ${actionText} ${ticker} ${suffix}`
          message = tickerMoves.length > 1
            ? `Weitere: ${tickerMoves.slice(1).map(m => `${m.investorName} (${m.moveType})`).join(', ')}`
            : `${ticker} ist in deinem Portfolio. Prüfe die Auswirkungen.`
        }

        // Create notification
        const { error: insertError } = await supabaseService
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'portfolio_update',
            title,
            message,
            data: {
              ticker,
              moves: tickerMoves.map(m => ({
                investor: m.investorName,
                type: m.moveType,
                changePercent: m.changePercent
              })),
              quarter: currentQuarter
            },
            href: `/analyse/stocks/${ticker.toLowerCase()}`
          })

        if (insertError) {
          console.error(`[SI-Portfolio-Alert] Error creating notification:`, insertError)
          continue
        }

        // Log to prevent duplicates
        await supabaseService
          .from('notification_log')
          .insert({
            user_id: userId,
            notification_type: 'portfolio_update',
            reference_id: refId,
            content: { ticker, quarter: currentQuarter, moves: tickerMoves.length }
          })

        notificationsCreated++
      }
    }

    const duration = Date.now() - startTime
    console.log(`[SI-Portfolio-Alert] ✅ Done in ${duration}ms. ${notificationsCreated} notifications created.`)

    return NextResponse.json({
      success: true,
      notificationsCreated,
      siMovesDetected: siMoves.length,
      quarter: currentQuarter,
      duration: `${duration}ms`
    })

  } catch (error) {
    console.error('[SI-Portfolio-Alert] Error:', error)
    return NextResponse.json({ error: 'Check failed' }, { status: 500 })
  }
}

function getTestUserFromRequest(request: NextRequest): string | null {
  const q = new URL(request.url).searchParams.get('testUserId')
  return q && UUID_REGEX.test(q) ? q : null
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleCheck(getTestUserFromRequest(request))
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleCheck(getTestUserFromRequest(request))
}
