#!/usr/bin/env npx tsx
// Senate Financial Disclosure Scraper — Playwright-basiert
// Scrapt efdsearch.senate.gov für Periodic Transaction Reports
// Usage: npx tsx scripts/fetchSenateTrades.ts [--pages 5]

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
chromium.use(StealthPlugin())
import * as fs from 'fs'
import * as path from 'path'

const OUT_DIR = path.join(process.cwd(), 'src/data/politician-trades')
const INDEX_PATH = path.join(OUT_DIR, 'index.json')
const BASE_URL = 'https://efdsearch.senate.gov'

// ── Helpers ──────────────────────────────────────────────────────────────────

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

interface SenateTrade {
  senator: string
  office: string
  transactionDate: string
  disclosureDate: string
  ticker: string
  assetName: string
  assetType: string
  type: string // Purchase, Sale, Exchange
  amount: string
  comment: string
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const maxPages = parseInt(args[args.indexOf('--pages') + 1] || '10')

  console.log('🏛️  Senate Financial Disclosure Scraper (Playwright)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   Max Seiten: ${maxPages}`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 1. Akzeptiere die Nutzungsbedingungen
    console.log('\n📋 Lade Senate eFD Search...')
    await page.goto(`${BASE_URL}/search/`, { waitUntil: 'networkidle', timeout: 30000 })

    // Checkbox "I understand" akzeptieren
    const checkbox = page.locator('#agree_statement')
    if (await checkbox.isVisible()) {
      await checkbox.check()
      console.log('   ✅ Nutzungsbedingungen akzeptiert')
      await sleep(1000)
    }

    // 2. Suche nach Periodic Transaction Reports (Type 11)
    // Wir nutzen die DataTables AJAX API direkt über die Seite
    console.log('📥 Suche nach PTR Filings...')

    const allTrades: SenateTrade[] = []
    let totalRecords = 0

    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      const start = pageNum * 100

      // AJAX Request mit CSRF-Token
      const response = await page.evaluate(async ({ start }) => {
        // CSRF-Token aus Cookie + Hidden Input
        const csrfCookie = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('csrftoken='))?.split('=')[1] || ''
        const csrfInput = (document.querySelector('input[name=csrfmiddlewaretoken]') as HTMLInputElement)?.value || ''
        const token = csrfInput || csrfCookie

        const formData = new URLSearchParams()
        formData.set('start', start.toString())
        formData.set('length', '100')
        formData.set('report_types', '[11]') // 11 = Periodic Transaction Report
        formData.set('filer_types', '[1]') // 1 = Senator
        formData.set('submitted_start_date', '01/01/2024 00:00:00')
        formData.set('submitted_end_date', '')
        formData.set('candidate_state', '')
        formData.set('senator_state', '')
        formData.set('office_id', '')
        formData.set('first_name', '')
        formData.set('last_name', '')
        formData.set('csrfmiddlewaretoken', token)

        const res = await fetch('/search/report/data/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': token,
          },
          body: formData.toString(),
          credentials: 'same-origin',
        })

        if (!res.ok) return null
        return res.json()
      }, { start })

      if (!response || !response.data) {
        console.log(`   ⚠️  Seite ${pageNum + 1}: keine Daten`)
        break
      }

      if (pageNum === 0) {
        totalRecords = response.recordsTotal || 0
        console.log(`   📊 ${totalRecords} PTR-Filings gefunden`)
      }

      const rows = response.data as string[][]
      if (rows.length === 0) break

      // Jedes Row ist ein Filing — wir müssen den Report öffnen um die Trades zu sehen
      for (const row of rows) {
        // row[0] = First Name, row[1] = Last Name, row[2] = Office, row[3] = Report Link HTML
        const firstName = row[0]?.replace(/<[^>]*>/g, '').trim() || ''
        const lastName = row[1]?.replace(/<[^>]*>/g, '').trim() || ''
        const office = row[2]?.replace(/<[^>]*>/g, '').trim() || ''
        const dateStr = row[4]?.replace(/<[^>]*>/g, '').trim() || ''

        // Report URL extrahieren
        const linkMatch = row[3]?.match(/href="([^"]+)"/)
        if (!linkMatch) continue
        const reportUrl = linkMatch[1]

        const senatorName = `${firstName} ${lastName}`.trim()
        if (!senatorName) continue

        // Report-Seite laden und Trades parsen
        try {
          const reportPage = await context.newPage()
          await reportPage.goto(`${BASE_URL}${reportUrl}`, { waitUntil: 'networkidle', timeout: 20000 })

          // Trades aus der Tabelle extrahieren
          const trades = await reportPage.evaluate(() => {
            const results: any[] = []
            // Die Trades-Tabelle hat die Klasse "table-striped" oder id "transaction_table"
            const tables = document.querySelectorAll('table')

            for (const table of tables) {
              const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim().toLowerCase() || '')

              // Suche nach der Transactions-Tabelle
              if (!headers.some(h => h.includes('transaction') || h.includes('ticker') || h.includes('asset'))) continue

              const rows = table.querySelectorAll('tbody tr')
              for (const row of rows) {
                const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
                if (cells.length < 5) continue

                // Typische Spaltenreihenfolge: #, Transaction Date, Owner, Ticker, Asset Name, Asset Type, Transaction Type, Amount, Comment
                results.push({
                  transactionDate: cells[1] || '',
                  owner: cells[2] || '',
                  ticker: cells[3] || '',
                  assetName: cells[4] || '',
                  assetType: cells[5] || '',
                  txType: cells[6] || '',
                  amount: cells[7] || '',
                  comment: cells[8] || '',
                })
              }
            }
            return results
          })

          for (const t of trades) {
            if (!t.ticker || t.ticker === '--' || t.ticker === 'N/A') continue

            allTrades.push({
              senator: senatorName,
              office,
              transactionDate: t.transactionDate || '',
              disclosureDate: dateStr,
              ticker: t.ticker.replace(/^\$/, '').toUpperCase(),
              assetName: t.assetName || '',
              assetType: t.assetType || '',
              type: t.txType?.toLowerCase().includes('purchase') ? 'purchase'
                : t.txType?.toLowerCase().includes('sale') ? 'sale' : 'exchange',
              amount: t.amount || '',
              comment: t.comment || '',
            })
          }

          await reportPage.close()
        } catch (err) {
          // Report konnte nicht geladen werden — überspringen
        }
      }

      const progress = Math.min(start + 100, totalRecords)
      console.log(`   📄 Seite ${pageNum + 1}: ${progress}/${totalRecords} Filings verarbeitet, ${allTrades.length} Trades bisher`)

      if (start + 100 >= totalRecords) break
      await sleep(500) // Rate limit
    }

    console.log(`\n✅ ${allTrades.length} Senate-Trades gescrapt`)

    // 3. In bestehende Daten mergen
    const existingData = new Map<string, any>()
    const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json') && f !== 'index.json')
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf-8'))
        if (data.slug) existingData.set(data.slug, data)
      } catch {}
    }

    let newTradeCount = 0
    for (const trade of allTrades) {
      const slug = nameToSlug(trade.senator)
      if (!existingData.has(slug)) {
        existingData.set(slug, {
          slug,
          name: trade.senator,
          chamber: 'senate',
          state: trade.office?.match(/\(([A-Z]{2})\)/)?.[1] || '',
          trades: [],
        })
      }

      const pol = existingData.get(slug)!

      // Deduplizieren
      const key = `${trade.transactionDate}|${trade.ticker}|${trade.type}`
      const exists = pol.trades.some((t: any) =>
        `${t.transactionDate}|${t.ticker}|${t.type}` === key
      )

      if (!exists) {
        pol.trades.push({
          disclosureYear: (trade.disclosureDate || '').split('/').pop() || '',
          disclosureDate: trade.disclosureDate,
          transactionDate: trade.transactionDate,
          owner: 'self',
          ticker: trade.ticker,
          assetDescription: trade.assetName,
          type: trade.type,
          typeRaw: trade.type === 'purchase' ? 'Purchase' : trade.type === 'sale' ? 'Sale' : 'Exchange',
          amount: trade.amount,
          representative: trade.senator,
          district: trade.office || '',
          link: '',
          capitalGainsOver200USD: 'False',
          slug,
          state: pol.state,
          chamber: 'senate',
        })
        newTradeCount++
      }
    }

    // 4. Speichern
    console.log(`💾 Speichere ${existingData.size} Politiker (${newTradeCount} neue Senate-Trades)...`)

    const oldIndex: any[] = (() => {
      try { return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8')) } catch { return [] }
    })()
    const oldIndexMap = new Map(oldIndex.map((p: any) => [p.slug, p]))

    const indexEntries: any[] = []
    for (const [slug, data] of existingData) {
      data.trades.sort((a: any, b: any) => (b.transactionDate || '').localeCompare(a.transactionDate || ''))
      fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(data, null, 2))

      const recentTickers = [...new Set(data.trades.slice(0, 10).map((t: any) => t.ticker).filter(Boolean))]
      const entry: any = {
        slug,
        name: data.name,
        chamber: data.chamber || 'senate',
        state: data.state || '',
        tradeCount: data.trades.length,
        lastTradeDate: data.trades[0]?.transactionDate || '',
        recentTickers: recentTickers.slice(0, 5),
      }

      // Preserve photo/bioguide/party from old index
      const old = oldIndexMap.get(slug)
      if (old) {
        if (old.bioguideId) entry.bioguideId = old.bioguideId
        if (old.photoUrl) entry.photoUrl = old.photoUrl
        if (old.party) entry.party = old.party
      }

      indexEntries.push(entry)
    }

    indexEntries.sort((a, b) => b.tradeCount - a.tradeCount)
    fs.writeFileSync(INDEX_PATH, JSON.stringify(indexEntries, null, 2))

    // Senators auflisten
    const senators = allTrades.reduce((acc, t) => {
      acc.add(t.senator)
      return acc
    }, new Set<string>())

    console.log(`\n📊 Ergebnis:`)
    console.log(`   Senate-Trades: ${allTrades.length}`)
    console.log(`   Neue Trades:   ${newTradeCount}`)
    console.log(`   Senatoren:     ${senators.size}`)
    console.log(`   Gesamt (Index): ${indexEntries.length} Politiker, ${indexEntries.reduce((s, e) => s + e.tradeCount, 0)} Trades`)

    if (senators.size > 0) {
      console.log(`\n🏆 Senatoren gefunden:`)
      for (const s of [...senators].sort()) {
        console.log(`   ${s}`)
      }
    }

  } catch (error) {
    console.error('❌ Fehler:', (error as Error).message)
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
