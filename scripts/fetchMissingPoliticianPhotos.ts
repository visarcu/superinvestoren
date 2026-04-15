#!/usr/bin/env npx tsx
// Holt fehlende Politiker-Fotos von congress.gov API
// Für Politiker die im GitHub-Repo keine Bilder haben

import * as fs from 'fs'
import * as path from 'path'

const OUTPUT_DIR = path.join(process.cwd(), 'public/images/politicians')
const INDEX_PATH = path.join(process.cwd(), 'src/data/politician-trades/index.json')
const CONGRESS_API = 'https://api.congress.gov/v3/member'
const API_KEY = 'DEMO_KEY' // Demo key reicht für wenige Requests

interface IndexEntry {
  slug: string; name: string; chamber: string; state: string
  bioguideId?: string; photoUrl?: string; party?: string
  tradeCount: number; lastTradeDate: string; recentTickers: string[]
}

// Manuelle Bioguide-IDs für die 3 ohne Match
const MANUAL_BIOGUIDE: Record<string, string> = {
  'marjorie-taylor-greene': 'G000596',
  'rich-mccormick': 'M001211',
  // April Delaney - kein Bioguide gefunden, ist evtl. kein Mitglied mehr
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Finclue/1.0 (info@finclue.de)',
        'Referer': 'https://www.congress.gov/',
      }
    })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('image')) return false
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength < 1000) return false // Zu klein = kein echtes Bild
    fs.writeFileSync(dest, Buffer.from(buffer))
    return true
  } catch {
    return false
  }
}

async function getPhotoFromCongressApi(bioguideId: string): Promise<string | null> {
  try {
    const res = await fetch(`${CONGRESS_API}/${bioguideId}?format=json&api_key=${API_KEY}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.member?.depiction?.imageUrl || null
  } catch {
    return null
  }
}

async function main() {
  const index: IndexEntry[] = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'))

  // Finde alle mit fehlendem Bild
  const missing: IndexEntry[] = []
  for (const p of index) {
    const destFile = path.join(OUTPUT_DIR, `${p.slug}.jpg`)
    if (!fs.existsSync(destFile)) {
      missing.push(p)
    }
  }

  console.log(`📸 ${missing.length} Politiker ohne Foto`)

  let downloaded = 0, failed = 0

  for (const p of missing) {
    // Bioguide-ID ermitteln
    let bioguideId = p.bioguideId || MANUAL_BIOGUIDE[p.slug]

    if (!bioguideId) {
      console.log(`  ❌ ${p.name} — kein Bioguide-ID`)
      failed++
      continue
    }

    // Erst prüfen ob wir die ID noch nicht gesetzt haben
    if (!p.bioguideId && MANUAL_BIOGUIDE[p.slug]) {
      p.bioguideId = MANUAL_BIOGUIDE[p.slug]
    }

    const destFile = path.join(OUTPUT_DIR, `${p.slug}.jpg`)

    // Versuch 1: unitedstates GitHub (nochmal, mit anderem Format)
    const githubUrl = `https://unitedstates.github.io/images/congress/450x550/${bioguideId}.jpg`
    let ok = await downloadImage(githubUrl, destFile)
    if (ok) {
      console.log(`  📸 ${p.name} → ${bioguideId} (GitHub 450x550)`)
      p.photoUrl = `/images/politicians/${p.slug}.jpg`
      downloaded++
      continue
    }

    // Versuch 2: Congress.gov API für Image-URL
    const congressUrl = await getPhotoFromCongressApi(bioguideId)
    if (congressUrl) {
      ok = await downloadImage(congressUrl, destFile)
      if (ok) {
        console.log(`  📸 ${p.name} → ${bioguideId} (Congress.gov)`)
        p.photoUrl = `/images/politicians/${p.slug}.jpg`
        downloaded++
        continue
      }
    }

    // Versuch 3: Direct congress.gov URL pattern
    const directUrl = `https://www.congress.gov/img/member/${bioguideId.toLowerCase()}_200.jpg`
    ok = await downloadImage(directUrl, destFile)
    if (ok) {
      console.log(`  📸 ${p.name} → ${bioguideId} (Congress.gov direct)`)
      p.photoUrl = `/images/politicians/${p.slug}.jpg`
      downloaded++
      continue
    }

    console.log(`  ⚠️  ${p.name} → ${bioguideId} (kein Foto gefunden)`)
    failed++

    // Rate limit: 100ms Pause
    await new Promise(r => setTimeout(r, 100))
  }

  // Index speichern
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2))

  console.log(`\n📊 Ergebnis:`)
  console.log(`   Heruntergeladen: ${downloaded}`)
  console.log(`   Fehlgeschlagen:  ${failed}`)
}

main().catch(console.error)
