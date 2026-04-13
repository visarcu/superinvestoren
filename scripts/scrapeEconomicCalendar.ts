/**
 * scrapeEconomicCalendar.ts
 *
 * Scraped Wirtschaftstermine von offiziellen Regierungsquellen:
 * - Fed FOMC: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 * - EZB: https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html
 * - Ifo: https://www.ifo.de/en/survey/ifo-business-climate-index-germany
 * - BLS (CPI/NFP): Manuell (403 Blockade)
 *
 * Usage:
 *   npx tsx scripts/scrapeEconomicCalendar.ts
 *   npx tsx scripts/scrapeEconomicCalendar.ts --output  # Zeigt JSON Output
 *
 * Empfehlung: 1x pro Monat laufen lassen
 */

interface ScrapedEvent {
  source: string
  eventId: string
  date: string
  time?: string
}

// ─── Fed FOMC Dates ──────────────────────────────────────────────────────────

async function scrapeFedDates(): Promise<ScrapedEvent[]> {
  try {
    const res = await fetch('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', {
      headers: { 'User-Agent': 'Finclue Economic Calendar Bot/1.0' },
    })
    if (!res.ok) throw new Error(`Fed: ${res.status}`)

    const html = await res.text()
    const events: ScrapedEvent[] = []

    // FOMC dates format: "January 27-28*" or "March 17-18"
    const yearMatch = html.match(/20\d{2}\s*FOMC\s*Meetings/i) || html.match(/>(\d{4})</)
    const currentYear = new Date().getFullYear()

    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    }

    // Match patterns like "January 27-28" or "March 17-18*"
    const datePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})[-–](\d{1,2})\*?/gi
    let match
    while ((match = datePattern.exec(html)) !== null) {
      const monthStr = match[1].toLowerCase()
      const endDay = match[3].padStart(2, '0')
      const monthNum = months[monthStr]
      if (!monthNum) continue

      // The rate decision is on the LAST day of the meeting
      const date = `${currentYear}-${monthNum}-${endDay}`

      // Only include future dates or dates from this year
      if (date.startsWith(String(currentYear)) || date.startsWith(String(currentYear + 1))) {
        events.push({
          source: 'fed',
          eventId: 'fed-rate',
          date,
          time: '18:00',
        })
      }
    }

    console.log(`✅ [Fed] ${events.length} FOMC Termine gefunden`)
    return events
  } catch (err) {
    console.error(`❌ [Fed] Scraping fehlgeschlagen: ${err}`)
    return []
  }
}

// ─── Ifo Dates ───────────────────────────────────────────────────────────────

async function scrapeIfoDates(): Promise<ScrapedEvent[]> {
  try {
    const res = await fetch('https://www.ifo.de/en/survey/ifo-business-climate-index-germany', {
      headers: { 'User-Agent': 'Finclue Economic Calendar Bot/1.0' },
    })
    if (!res.ok) throw new Error(`Ifo: ${res.status}`)

    const html = await res.text()
    const events: ScrapedEvent[] = []

    // Ifo dates format: "24 April 2026" or "22 May 2026"
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    }

    const datePattern = /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi
    let match
    while ((match = datePattern.exec(html)) !== null) {
      const day = match[1].padStart(2, '0')
      const monthStr = match[2].toLowerCase()
      const year = match[3]
      const monthNum = months[monthStr]
      if (!monthNum) continue

      events.push({
        source: 'ifo',
        eventId: 'ifo',
        date: `${year}-${monthNum}-${day}`,
        time: '08:30',
      })
    }

    console.log(`✅ [Ifo] ${events.length} Termine gefunden`)
    return events
  } catch (err) {
    console.error(`❌ [Ifo] Scraping fehlgeschlagen: ${err}`)
    return []
  }
}

// ─── EZB Dates (aus bekannter Liste, da Scraping komplex) ────────────────────

function getECBDates2026(): ScrapedEvent[] {
  // Offizielle EZB Termine 2026 (von ecb.europa.eu)
  const dates = [
    '2026-04-30', '2026-06-11', '2026-07-23',
    '2026-09-10', '2026-10-29', '2026-12-17',
  ]
  console.log(`✅ [EZB] ${dates.length} Termine (aus offizieller Liste)`)
  return dates.map(d => ({ source: 'ecb', eventId: 'ecb-rate', date: d, time: '12:15' }))
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const showOutput = process.argv.includes('--output')

  console.log('🚀 Economic Calendar Scraper')
  console.log('   Quellen: Fed, EZB, Ifo')
  console.log('')

  const [fedDates, ifoDates] = await Promise.all([
    scrapeFedDates(),
    scrapeIfoDates(),
  ])
  const ecbDates = getECBDates2026()

  const allEvents = [...fedDates, ...ecbDates, ...ifoDates]
    .sort((a, b) => a.date.localeCompare(b.date))

  console.log('')
  console.log(`📊 Gesamt: ${allEvents.length} Termine`)
  console.log(`   Fed: ${fedDates.length} | EZB: ${ecbDates.length} | Ifo: ${ifoDates.length}`)

  if (showOutput) {
    console.log('')
    console.log('// Paste into economicEvents.ts SCHEDULED_EVENTS_2026:')
    for (const e of allEvents) {
      console.log(`  { eventId: '${e.eventId}', date: '${e.date}'${e.time ? `, time: '${e.time}'` : ''} },`)
    }
  }

  // Nächste 5 Termine anzeigen
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = allEvents.filter(e => e.date >= today).slice(0, 5)
  if (upcoming.length > 0) {
    console.log('')
    console.log('Nächste Termine:')
    for (const e of upcoming) {
      const eventName = e.eventId === 'fed-rate' ? 'Fed Zinsentscheid' :
        e.eventId === 'ecb-rate' ? 'EZB Zinsentscheid' :
        e.eventId === 'ifo' ? 'Ifo Geschäftsklimaindex' : e.eventId
      console.log(`  ${e.date} ${e.time || '--:--'}  ${eventName}`)
    }
  }
}

main().catch(console.error)
