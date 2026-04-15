#!/usr/bin/env npx tsx
// Script: Politiker-Fotos von unitedstates/images (GitHub) herunterladen
// Quelle: https://github.com/unitedstates/images (Public Domain, US Government)
// Mapping: congress-legislators YAML → Bioguide IDs → Photo URLs
//
// Usage: npx tsx scripts/fetchPoliticianPhotos.ts

import * as fs from 'fs'
import * as path from 'path'

const LEGISLATORS_URL = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml'
const PHOTO_BASE = 'https://unitedstates.github.io/images/congress/225x275'
const OUTPUT_DIR = path.join(process.cwd(), 'public/images/politicians')
const INDEX_PATH = path.join(process.cwd(), 'src/data/politician-trades/index.json')

interface Legislator {
  id: { bioguide: string; govtrack?: number }
  name: { first: string; last: string; official_full?: string }
  terms: { type: string; state: string; party: string; start: string; end: string }[]
}

interface PoliticianIndex {
  slug: string
  name: string
  chamber: string
  state: string
  tradeCount: number
  lastTradeDate: string
  recentTickers: string[]
  bioguideId?: string
  photoUrl?: string
  party?: string
}

// Normalisierung für Matching
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.text()
}

// Simple YAML parser für congress-legislators Format
// Extrahiert: bioguide, first name, last name, official_full, state, party
function parseLegislatorsYaml(yaml: string): Legislator[] {
  const results: Legislator[] = []
  // Split by top-level entries (lines starting with "- id:")
  const entries = yaml.split(/^- id:/m).slice(1)

  for (const entry of entries) {
    try {
      const bioguideMatch = entry.match(/bioguide:\s*(\w+)/)
      const firstMatch = entry.match(/first:\s*(.+)/)
      const lastMatch = entry.match(/last:\s*(.+)/)
      const officialMatch = entry.match(/official_full:\s*(.+)/)

      if (!bioguideMatch || !lastMatch) continue

      // Letzten Term finden für State + Party
      const termBlocks = entry.split(/\s+- type:\s*/)
      const lastTermBlock = termBlocks[termBlocks.length - 1] || ''
      const stateMatch = lastTermBlock.match(/state:\s*(\w+)/)
      const partyMatch = lastTermBlock.match(/party:\s*(.+)/)
      const typeMatch = lastTermBlock.match(/^(rep|sen)/)

      results.push({
        id: { bioguide: bioguideMatch[1].trim() },
        name: {
          first: (firstMatch?.[1] || '').trim(),
          last: (lastMatch?.[1] || '').trim(),
          official_full: officialMatch?.[1]?.trim(),
        },
        terms: [{
          type: typeMatch?.[1] || 'rep',
          state: (stateMatch?.[1] || '').trim(),
          party: (partyMatch?.[1] || '').trim(),
          start: '', end: '',
        }],
      })
    } catch { /* skip malformed entries */ }
  }
  return results
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    if (!res.ok) return false
    const buffer = await res.arrayBuffer()
    fs.writeFileSync(dest, Buffer.from(buffer))
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log('📥 Lade aktuelle Congress-Mitglieder (YAML)...')
  const yamlText = await fetchText(LEGISLATORS_URL)
  const legislators = parseLegislatorsYaml(yamlText)
  console.log(`   ${legislators.length} Abgeordnete geparst`)

  // Index laden
  const index: PoliticianIndex[] = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'))
  console.log(`📋 ${index.length} Politiker in unserem Index`)

  // Mapping: Name → Legislator aufbauen
  const nameMap = new Map<string, Legislator>()
  const slugMap = new Map<string, Legislator>()
  const lastNameMap = new Map<string, Legislator[]>()

  for (const leg of legislators) {
    const fullName = leg.name.official_full || `${leg.name.first} ${leg.name.last}`
    nameMap.set(normalize(fullName), leg)
    slugMap.set(slugify(fullName), leg)

    const lastName = normalize(leg.name.last)
    if (!lastNameMap.has(lastName)) lastNameMap.set(lastName, [])
    lastNameMap.get(lastName)!.push(leg)
  }

  // Output-Verzeichnis erstellen
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  let matched = 0, downloaded = 0, failed = 0

  for (const pol of index) {
    // Versuch 1: Slug-Match
    let leg = slugMap.get(pol.slug)

    // Versuch 2: Normalisierter Name
    if (!leg) leg = nameMap.get(normalize(pol.name))

    // Versuch 3: Nachname + State Match
    if (!leg) {
      const parts = pol.name.split(' ')
      const lastName = normalize(parts[parts.length - 1])
      const candidates = lastNameMap.get(lastName)
      if (candidates) {
        // Match by state
        leg = candidates.find(c => {
          const lastTerm = c.terms[c.terms.length - 1]
          return lastTerm?.state === pol.state
        })
        // Fallback: erster mit gleichem Nachnamen
        if (!leg && candidates.length === 1) leg = candidates[0]
      }
    }

    // Versuch 4: Vorname Nachname ohne Mittelnamen
    if (!leg) {
      const parts = pol.name.split(' ')
      if (parts.length > 2) {
        const simplified = `${parts[0]} ${parts[parts.length - 1]}`
        leg = nameMap.get(normalize(simplified))
      }
    }

    if (leg) {
      matched++
      const bioguideId = leg.id.bioguide
      const lastTerm = leg.terms[leg.terms.length - 1]
      const party = lastTerm?.party || null

      // Foto herunterladen
      const photoUrl = `${PHOTO_BASE}/${bioguideId}.jpg`
      const destFile = path.join(OUTPUT_DIR, `${pol.slug}.jpg`)

      if (fs.existsSync(destFile)) {
        console.log(`  ✅ ${pol.name} → ${bioguideId} (bereits vorhanden)`)
        downloaded++
      } else {
        const ok = await downloadImage(photoUrl, destFile)
        if (ok) {
          console.log(`  📸 ${pol.name} → ${bioguideId} (heruntergeladen)`)
          downloaded++
        } else {
          console.log(`  ⚠️  ${pol.name} → ${bioguideId} (kein Foto verfügbar)`)
          failed++
        }
      }

      // Index updaten
      pol.bioguideId = bioguideId
      pol.photoUrl = `/images/politicians/${pol.slug}.jpg`
      pol.party = party || undefined
    } else {
      console.log(`  ❌ ${pol.name} (${pol.state}) — kein Match gefunden`)
      failed++
    }
  }

  // Aktualisierten Index speichern
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2))

  console.log('\n📊 Ergebnis:')
  console.log(`   Gematcht:      ${matched}/${index.length}`)
  console.log(`   Heruntergeladen: ${downloaded}`)
  console.log(`   Fehlgeschlagen: ${failed}`)
  console.log(`   Bilder in:     ${OUTPUT_DIR}`)
}

main().catch(console.error)
