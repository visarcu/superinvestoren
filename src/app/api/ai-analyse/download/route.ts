import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FREE_DOWNLOADS_PER_MONTH = 1

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !supabaseUser?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: supabaseUser.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Premium users have unlimited downloads
    if (user.isPremium) {
      return NextResponse.json({
        canDownload: true,
        isPremium: true,
        downloadsThisMonth: 0,
        limit: 'unlimited'
      })
    }

    // Count downloads this month for free users
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const downloadsThisMonth = await prisma.aIReportDownload.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfMonth }
      }
    })

    return NextResponse.json({
      canDownload: downloadsThisMonth < FREE_DOWNLOADS_PER_MONTH,
      isPremium: false,
      downloadsThisMonth,
      limit: FREE_DOWNLOADS_PER_MONTH,
      remaining: Math.max(0, FREE_DOWNLOADS_PER_MONTH - downloadsThisMonth)
    })

  } catch (error) {
    console.error('Error checking download status:', error)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !supabaseUser?.email) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    // Get request body
    const { ticker, companyName } = await request.json()

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker erforderlich' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: supabaseUser.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    // Check if free user has reached limit
    if (!user.isPremium) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const downloadsThisMonth = await prisma.aIReportDownload.count({
        where: {
          userId: user.id,
          createdAt: { gte: startOfMonth }
        }
      })

      if (downloadsThisMonth >= FREE_DOWNLOADS_PER_MONTH) {
        return NextResponse.json({
          error: 'Download-Limit erreicht',
          message: `Du hast dein monatliches Limit von ${FREE_DOWNLOADS_PER_MONTH} Download(s) erreicht. Upgrade auf Premium für unbegrenzte Downloads.`,
          upgradeUrl: '/pricing'
        }, { status: 403 })
      }
    }

    // Record the download
    await prisma.aIReportDownload.create({
      data: {
        userId: user.id,
        ticker: ticker.toUpperCase(),
        companyName: companyName || null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Download erfasst'
    })

  } catch (error) {
    console.error('Error recording download:', error)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
