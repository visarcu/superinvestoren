// src/app/api/notifications/trigger-filing-check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper: Investor Namen
function getInvestorName(slug: string): string {
  const names: Record<string, string> = {
    'buffett': 'Warren Buffett',
    'ackman': 'Bill Ackman',
    'gates': 'Bill Gates',
    'torray': 'Torray Investment Partners',
    'davis': 'Christopher Davis',
    'altarockpartners': 'Mark Massey',
    'greenhaven': 'Edgar Wachenheim III',
    'vinall': 'Robert Vinall',
    'meridiancontrarian': 'Meridian Contrarian Fund',
    'hawkins': 'Mason Hawkins',
    'olstein': 'Robert Olstein',
    'peltz': 'Nelson Peltz',
    'gregalexander': 'Greg Alexander',
    'miller': 'Bill Miller',
    'tangen': 'Nicolai Tangen',
    'burry': 'Michael Burry',
    'pabrai': 'Mohnish Pabrai',
    'kantesaria': 'Dev Kantesaria',
    'greenblatt': 'Joel Greenblatt',
    'fisher': 'Ken Fisher',
    'soros': 'George Soros',
    'haley': 'Connor Haley',
    'vandenberg': 'Arnold Van Den Berg',
    'dodgecox': 'Dodge & Cox',
    'pzena': 'Richard Pzena',
    'mairspower': 'Mairs & Power Inc',
    'weitz': 'Wallace Weitz',
    'yacktman': 'Yacktman Asset Management',
    'gayner': 'Thomas Gayner',
    'armitage': 'John Armitage',
    'burn': 'Harry Burn',
    'cantillon': 'William von Mueffling',
    'jensen': 'Eric Schoenstein',
    'abrams': 'David Abrams',
    'firsteagle': 'First Eagle Investment',
    'polen': 'Polen Capital Management',
    'tarasoff': 'Josh Tarasoff',
    'rochon': 'Francois Rochon',
    'russo': 'Thomas Russo',
    'akre': 'Chuck Akre',
    'triplefrond': 'Triple Frond Partners',
    'whitman': 'Marty Whitman',
    'patientcapital': 'Samantha McLemore',
    'klarman': 'Seth Klarman',
    'makaira': 'Tom Bancroft',
    'ketterer': 'Sarah Ketterer',
    'train': 'Lindsell Train',
    'smith': 'Terry Smith',
    'watsa': 'Prem Watsa',
    'lawrence': 'Bryan Lawrence',
    'dorsey': 'Pat Dorsey',
    'hohn': 'Chris Hohn',
    'hong': 'Dennis Hong',
    'kahn': 'Kahn Brothers Group',
    'coleman': 'Chase Coleman',
    'dalio': 'Ray Dalio',
    'loeb': 'Daniel Loeb',
    'tepper': 'David Tepper',
    'icahn': 'Carl Icahn',
    'lilu': 'Li Lu',
    'ainslie': 'Lee Ainslie',
    'greenberg': 'Glenn Greenberg',
    'mandel': 'Stephen Mandel',
    'marks': 'Howard Marks',
    'rogers': 'John Rogers',
    'ariel_appreciation': 'Ariel Appreciation Fund',
    'ariel_focus': 'Ariel Focus Fund',
    'cunniff': 'Ruane, Cunniff & Goldfarb',
    'spier': 'Guy Spier',
    'chou': 'Francis Chou',
    'sosin': 'Clifford Sosin',
    'welling': 'Glenn Welling',
    'lou': 'Norbert Lou',
    'munger': 'Charlie Munger',
    'ark_investment_management': 'Catherine Wood',
    'cunniff_sequoia': 'Sequoia Fund',
    'katz': 'David Katz',
    'tweedy_browne_fund_inc': 'Tweedy Browne'
  }
  return names[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
}

// Helper: Finde kürzlich hinzugefügte Holdings-Dateien (letzte 24h)
function findRecentFilings(): string[] {
  const holdingsDir = path.join(process.cwd(), 'src', 'data', 'holdings')
  const recentInvestors: string[] = []
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // Alle Investor-Ordner durchgehen
    const investors = fs.readdirSync(holdingsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    for (const investor of investors) {
      const investorDir = path.join(holdingsDir, investor)
      
      try {
        // Alle JSON-Dateien in diesem Investor-Ordner
        const files = fs.readdirSync(investorDir)
          .filter(file => file.endsWith('.json'))
        
        for (const file of files) {
          const filePath = path.join(investorDir, file)
          const stats = fs.statSync(filePath)
          
          // Wenn Datei in den letzten 24h erstellt/geändert wurde
          if (stats.mtime > yesterday) {
            if (!recentInvestors.includes(investor)) {
              recentInvestors.push(investor)
              console.log(`[Filing Detection] Found recent filing for ${investor}: ${file} (${stats.mtime.toISOString()})`)
            }
          }
        }
      } catch (error) {
        console.error(`[Filing Detection] Error reading ${investor} directory:`, error)
        continue
      }
    }
  } catch (error) {
    console.error('[Filing Detection] Error reading holdings directory:', error)
  }

  return recentInvestors
}

// Helper: In-App Notification erstellen
async function createInAppNotification({
  userId,
  type,
  title,
  message,
  data,
  href
}: {
  userId: string
  type: string
  title: string
  message: string
  data?: any
  href?: string
}) {
  try {
    const { error } = await supabaseService
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data: data || {},
        href
      })
    
    if (error) {
      console.error('Error creating in-app notification:', error)
    } else {
      console.log(`✅ In-app notification created for user ${userId}: ${title}`)
    }
  } catch (error) {
    console.error('Failed to create in-app notification:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { specificInvestor } = await request.json() // Optional: nur bestimmten Investor prüfen

    console.log('[Filing Trigger] Starting filing notification check...')
    
    // 1. Finde Investoren mit kürzlichen Filing-Änderungen
    const recentInvestors = specificInvestor ? [specificInvestor] : findRecentFilings()
    
    if (recentInvestors.length === 0) {
      console.log('[Filing Trigger] No recent filings found in last 24h')
      return NextResponse.json({
        success: true,
        message: 'No recent filings found',
        recentInvestors: []
      })
    }

    console.log(`[Filing Trigger] Found ${recentInvestors.length} investors with recent filings:`, recentInvestors)

    // 2. Alle User mit aktivierten Filing-Notifications holen
    const { data: usersWithFilingNotifications, error: usersError } = await supabaseService
      .from('notification_settings')
      .select(`
        user_id,
        preferred_investors,
        profiles!inner(email_verified)
      `)
      .eq('filings_enabled', true)

    if (usersError) {
      console.error('[Filing Trigger] Users Error:', usersError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`[Filing Trigger] Found ${usersWithFilingNotifications?.length || 0} users with filing notifications enabled`)

    let totalFilingNotifications = 0
    let totalFilingEmails = 0

    // 3. Für jeden User: Prüfe ob er den Investor abonniert hat
    for (const userSettings of usersWithFilingNotifications || []) {
      const preferredInvestors = userSettings.preferred_investors || []
      
      if (preferredInvestors.length === 0) continue

      for (const investorSlug of recentInvestors) {
        // Nur senden wenn User diesen Investor abonniert hat
        if (!preferredInvestors.includes(investorSlug)) continue

        try {
          // Prüfen ob wir schon heute eine Filing-Notification gesendet haben
          const today = new Date().toISOString().split('T')[0]
          
          const { data: recentNotification } = await supabaseService
            .from('notification_log')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .eq('notification_type', 'filing_alert')
            .eq('reference_id', investorSlug)
            .gte('sent_at', `${today}T00:00:00.000Z`)
            .maybeSingle()

          if (!recentNotification) {
            const investorName = getInvestorName(investorSlug)

            // ✅ In-App Notification erstellen
            await createInAppNotification({
              userId: userSettings.user_id,
              type: 'filing_alert',
              title: `Neues 13F-Filing von ${investorName}`,
              message: `Neue Portfolio-Änderungen verfügbar`,
              data: { investor: investorSlug },
              href: `/superinvestor/${investorSlug}`
            })
            
            totalFilingNotifications++

            // ✅ E-Mail senden
            const { data: { user } } = await supabaseService.auth.admin.getUserById(userSettings.user_id)
            
            if (user?.email) {
              // Filing E-Mail senden
              const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/send-filing-email`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.CRON_SECRET}`
                },
                body: JSON.stringify({
                  userEmail: user.email,
                  investorSlug,
                  investorName,
                  isTest: false
                })
              })

              if (emailResponse.ok) {
                totalFilingEmails++
                
                // Notification Log erstellen
                await supabaseService
                  .from('notification_log')
                  .insert({
                    user_id: userSettings.user_id,
                    notification_type: 'filing_alert',
                    reference_id: investorSlug,
                    content: { investor: investorSlug, investorName },
                    email_sent: true
                  })
                
                console.log(`✅ Filed notification sent to ${user.email} for ${investorName}`)
              }
            }
          }
        } catch (investorError) {
          console.error(`[Filing Trigger] Error processing ${investorSlug} for user ${userSettings.user_id}:`, investorError)
          continue
        }
      }
    }

    console.log(`[Filing Trigger] Created ${totalFilingNotifications} in-app notifications`)
    console.log(`[Filing Trigger] Sent ${totalFilingEmails} filing emails`)
    
    return NextResponse.json({
      success: true,
      recentInvestors,
      usersChecked: usersWithFilingNotifications?.length || 0,
      filingNotificationsSent: totalFilingNotifications,
      filingEmailsSent: totalFilingEmails,
      message: `Processed ${recentInvestors.length} recent filings`
    })

  } catch (error) {
    console.error('[Filing Trigger] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}