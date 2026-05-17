// scripts/fetch13f.js - ERWEITERT für Put/Call Detection
import fetch from 'node-fetch'
import { parseStringPromise, processors } from 'xml2js'
import fs from 'fs/promises'
import path from 'path'
import { investorCiks } from '../src/lib/cikMapping.js'

// Investoren die kleinere Zahlen in den SEC Filings haben (brauchen extra Multiplikator)
const extraMultiplierSlugs = [''];

// ✅ NEU: Investoren die bereits Dollar-Werte haben (KEIN Multiplikator)
const noMultiplierSlugs = ['greenhaven', 'vulcanvalue', 'cunniff', 'martin', 'munger', 'ellenbogen', 'meritage', 'muhlenkamp', 'greenbrier', 'wyden', 'brenton' ,'buffett', 'ark_investment_management', 'einhorn', 'duan','rolfe', 'cunniff_sequoia', 'welling','roepers', 'thiel', 'ackman', 'ubben', 'lou', 'makaira', 'berkowitz', 'bloomstran', 'mandel', 'sosin', 'marks', 'greenberg', 'ainslie', 'lilu', 'icahn', 'tepper', 'loeb', 'gates', 'dalio', ,'whitman', 'rochon', 'miller', 'coleman', 'kahn', 'hong', 'hohn', 'dorsey', 'lawrence', 'watsa', 'smith', 'ketterer', 'train', 'patientcapital', 'viking', 'makaira', 'russo', 'akre', 'tarasoff', 'polen', 'firsteagle', 'jensen', 'abrams', 'burn', 'cantillon', 'armitage', 'yacktman','torray', 'vinall', 'katz', 'gayner', 'weitz', 'meridiancontrarian', 'mairspower', 'dodgecox','altarockpartners', 'davis', 'pzena', 'hawkins', 'rogers', 'peltz', 'gregalexander', 'miller', 'burry', 'pabrai', 'kantesaria', 'greenblatt', 'fisher','soros', 'haley','vandenberg'];

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Dein Name <deine.email@beispiel.de>' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`)
  return res.text()
}

// Hilfsfunktion: Quartal aus Datum bestimmen (konsistent)
function getQuarterFromDate(dateStr) {
  if (!dateStr) return null
  
  const [year, month] = dateStr.split('-')
  if (!year || !month) return null
  
  const quarterNum = Math.ceil(Number(month) / 3)
  return `${year}-Q${quarterNum}`
}

// Period End Date aus NPORT extrahieren
function extractNportPeriod(rawXml) {
  try {
    const repPdDateMatch = rawXml.match(/<repPdDate>([^<]+)<\/repPdDate>/)
    if (repPdDateMatch) {
      return repPdDateMatch[1]
    }
    
    const repPdEndMatch = rawXml.match(/<repPdEnd>([^<]+)<\/repPdEnd>/)
    if (repPdEndMatch) {
      return repPdEndMatch[1]
    }
    
    return null
  } catch (err) {
    return null
  }
}

// ✅ KORRIGIERT: Wert normalisieren - mit slug-spezifischer Behandlung
function normalizeValue(rawValue, form, slug) {
  let value = Number(rawValue.replace(/,/g, ''))
  
  if (form === '13F-HR') {
    if (noMultiplierSlugs.includes(slug)) {
      // Dieser Investor hat bereits Dollar-Werte - KEIN Multiplikator
      console.log(`    13F-HR Wert (${slug} - bereits USD): ${rawValue} -> $${(value/1000000).toFixed(1)}M`)
    } else {
      // Standard 13F-HR: Werte sind in Tausend Dollar -> *1000 für USD
      value = value * 1000
      
      // Spezielle extraMultiplierSlugs: zusätzlicher *1000 Multiplikator
      if (extraMultiplierSlugs.includes(slug)) {
        value = value * 1000  // Total: *1,000,000
        console.log(`    13F-HR Wert (extraMultiplier): ${rawValue} -> $${(value/1000000).toFixed(1)}M`)
      } else {
        console.log(`    13F-HR Wert: ${rawValue} -> $${(value/1000000).toFixed(1)}M`)
      }
    }
    
  } else if (form.startsWith('NPORT')) {
    // NPORT Werte sind bereits in USD - KEIN Multiplikator
    console.log(`    ${form} Wert: ${rawValue} -> $${(value/1000000).toFixed(1)}M`)
  }
  
  return value
}

// ✅ PROFESSIONELLE Option Type Detection (ohne Emojis)
function detectOptionType(titleOfClass, putCall) {
  // Direkte put/call Angabe (wenn verfügbar)
  if (putCall) {
    const pc = putCall.toLowerCase()
    if (pc.includes('put') || pc === 'p') return 'PUT'
    if (pc.includes('call') || pc === 'c') return 'CALL'
  }
  
  // Fallback: Aus titleOfClass ableiten
  if (titleOfClass) {
    const title = titleOfClass.toLowerCase()
    if (title.includes('put') || title.includes('put option')) return 'PUT'
    if (title.includes('call') || title.includes('call option')) return 'CALL'
    // Manchmal steht nur "option" - dann schauen wir nach Hinweisen
    if (title.includes('option')) return 'OPTION' // Unbekannter Typ
  }
  
  return 'STOCK' // Standard Aktie
}

// ✅ PROFESSIONELLE Position Type Display (ohne Emojis, professionell)
function getPositionTypeDisplay(optionType) {
  const types = {
    'STOCK': { 
      label: 'Stock', 
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      strategy: 'equity' 
    },
    'CALL': { 
      label: 'Call Option', 
      badge: 'bg-green-100 text-green-800 border-green-200',
      strategy: 'leveraged_long' 
    },
    'PUT': { 
      label: 'Put Option', 
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      strategy: 'hedging_or_short' // Neutral - kann Hedge oder Short sein
    },
    'OPTION': { 
      label: 'Option', 
      badge: 'bg-gray-100 text-gray-800 border-gray-200',
      strategy: 'unknown' 
    }
  }
  return types[optionType] || types['STOCK']
}

// Hilfsfunktion: CUSIP bereinigen und validieren
function normalizeCusip(cusip, positionName = '') {
  if (!cusip || cusip === 'N/A') {
    const sanitizedName = positionName.replace(/[^A-Z0-9]/g, '').slice(0, 6).padEnd(6, '0')
    return `${sanitizedName}999`
  }
  const cleaned = cusip.replace(/[^A-Z0-9]/g, '').slice(0, 9)
  return cleaned.length >= 6 ? cleaned : `${cleaned.padEnd(6, '0')}999`
}

// Hilfsfunktion: Firmenname bereinigen
function normalizeCompanyName(name) {
  if (!name) return 'Unknown Company'
  return name.replace(/\s+/g, ' ').replace(/\b(INC|CORP|LTD|LLC|LP)\b\.?/gi, '$1').trim()
}

// Filing-Priorität bestimmen - KORRIGIERT für bessere 13F-HR Priorität
function getFilingPriority(form) {
  const priorities = {
    '13F-HR': 3,    // HÖCHSTE Priorität - vollständige Quartals-Daten
    'NPORT-PX': 2,  // Quartalsweise, vollständig  
    'NPORT-P': 1    // Monatlich, oft unvollständig
  }
  return priorities[form] || 0
}

// NEU: Test mehrere URL-Varianten für NPORT Filings
async function tryNportUrls(cik, accession, slug, quarterKey) {
  const baseAccession = accession.replace(/-/g, '')
  
  // Verschiedene URL-Patterns die die SEC verwendet
  const urlPatterns = [
    // Standard primary_doc.xml
    `https://www.sec.gov/Archives/edgar/data/${cik}/${baseAccession}/primary_doc.xml`,
    // Alternative: .txt zur .xml Endung
    `https://www.sec.gov/Archives/edgar/data/${cik}/${baseAccession}/${accession}.xml`,
    // Alternative: FormN-PORT.xml (manchmal verwendet)
    `https://www.sec.gov/Archives/edgar/data/${cik}/${baseAccession}/FormN-PORT.xml`,
    // Alternative: xslFormNPORT.xml
    `https://www.sec.gov/Archives/edgar/data/${cik}/${baseAccession}/xslFormNPORT.xml`,
  ]
  
  console.log(`  🔍 Teste URLs für ${slug} ${quarterKey}:`)
  
  for (const [index, url] of urlPatterns.entries()) {
    try {
      console.log(`     ${index + 1}. Teste: ${url}`)
      const content = await fetchUrl(url)
      
      // Validiere, dass es echte NPORT-Daten enthält
      if (content.includes('<invstOrSecs>') && content.includes('<totAssets>')) {
        const totalAssetsMatch = content.match(/<totAssets>([^<]+)<\/totAssets>/)
        if (totalAssetsMatch) {
          const assets = Number(totalAssetsMatch[1]) / 1000000
          console.log(`     ✅ Erfolg! Total Assets: $${assets.toFixed(1)}M`)
          return content
        }
      }
      
      console.log(`     ❌ Keine gültigen Portfolio-Daten gefunden`)
      
    } catch (err) {
      console.log(`     ❌ Fehler: ${err.message}`)
    }
  }
  
  throw new Error(`Keine gültige URL für ${slug} ${quarterKey} gefunden`)
}

async function run() {
  const baseDir = path.resolve('src/data/holdings')
  await fs.mkdir(baseDir, { recursive: true })

  for (const [slug, cik] of Object.entries(investorCiks)) {
    // ✅ TANGEN AKTIVIEREN: Jetzt für AKO Capital (Tangen)
    if (slug !== 'smith' && slug !== 'coleman' && slug !== 'tepper') continue

    const invDir = path.join(baseDir, slug)
    await fs.mkdir(invDir, { recursive: true })
    console.log(`\n🔍 Bearbeite ${slug} (CIK ${cik})`)

    try {
      // 1) Metadaten holen
      const secMetaRes = await fetch(
        `https://data.sec.gov/submissions/CIK${cik}.json`,
        {
          headers: {
            'User-Agent': 'Dein Name <deine.email@beispiel.de>',
            Accept: 'application/json',
          },
        }
      )
      if (!secMetaRes.ok) throw new Error(`HTTP ${secMetaRes.status}`)
      const meta = await secMetaRes.json()

      // 2) Alle Filings vereinen
      const histFiles = Array.isArray(meta.filings?.files) ? meta.filings.files : []
      let recent = []
      if (meta.filings?.recent) {
        const { form = [], filingDate = [], accessionNumber = [], periodOfReport = [] } =
          meta.filings.recent
        recent = form.map((fm, i) => ({
          form: fm,
          filingDate: filingDate[i],
          accessionNumber: accessionNumber[i],
          periodOfReport: periodOfReport[i],
        }))
      }
      const allFilings = histFiles.concat(recent)

      // 3) Relevante Filings filtern
      const relevantFilings = allFilings
      .filter(f => f.form && (f.form === '13F-HR' || f.form.startsWith('NPORT'))) // ✅ f.form && hinzugefügt
      .map(f => ({
        form: f.form,
        date: f.filingDate,
        period: f.periodOfReport || f.filingDate,
        accession: f.accessionNumber?.replace(/-/g, '') || '', // ✅ Null-safe
        rawAccession: f.accessionNumber || '', // ✅ Null-safe
        priority: getFilingPriority(f.form),
        // KONSISTENT: quarterKey immer basierend auf Filing-Datum
        quarterKey: getQuarterFromDate(f.filingDate),
      }))
      .filter(f => f.quarterKey && f.form) // ✅ Zusätzliche Validierung
      .sort((a, b) => new Date(b.date) - new Date(a.date))

      console.log(`📋 Relevante Filings: ${relevantFilings.length}`)
      console.log(`   13F-HR: ${relevantFilings.filter(f => f.form === '13F-HR').length}`)
      console.log(`   NPORT: ${relevantFilings.filter(f => f.form.startsWith('NPORT')).length}`)

      // 4) Gruppierung nach Quarter - BESTES Filing pro Quartal
      const filingsByQuarter = new Map()
      
      relevantFilings.forEach(filing => {
        const existing = filingsByQuarter.get(filing.quarterKey)
        
        const shouldReplace = !existing || 
          filing.priority > existing.priority || 
          (filing.priority === existing.priority && new Date(filing.date) > new Date(existing.date))
        
        if (shouldReplace) {
          filingsByQuarter.set(filing.quarterKey, filing)
        }
      })

      console.log(`\n📋 Ausgewählte Filings pro Quartal (13F-HR priorisiert):`)
      const sortedQuarters = Array.from(filingsByQuarter.entries())
        .sort((a, b) => {
          const [yearA, quarterA] = a[0].split('-Q').map(Number)
          const [yearB, quarterB] = b[0].split('-Q').map(Number)
          return yearB - yearA || quarterB - quarterA
        })

      sortedQuarters.slice(0, 8).forEach(([quarterKey, filing]) => {
        const priority = filing.form === '13F-HR' ? '🎯' : '📋'
        console.log(`   ${priority} ${quarterKey}: ${filing.form} vom ${filing.date} (${filing.rawAccession})`)
      })

      // 5) Verarbeite die letzten 8 Quartale (für Performance)
      const recentQuarters = Array.from(filingsByQuarter.entries())
        .sort((a, b) => {
          const [yearA, quarterA] = a[0].split('-Q').map(Number)
          const [yearB, quarterB] = b[0].split('-Q').map(Number)
          return yearB - yearA || quarterB - quarterA
        })
        .slice(0, 8) // Nur die letzten 8 Quartale für bessere Performance

      for (const [quarterKey, filing] of recentQuarters) {
        const outFile = path.join(invDir, `${quarterKey}.json`)
        
        console.log(`\n📄 Verarbeite ${slug} ${quarterKey} (${filing.form})`)

        let raw = ''
        let actualPeriod = filing.period

        if (filing.form === '13F-HR') {
          // Verschiedene 13F-HR URL-Patterns versuchen
          const urls = [
            `https://www.sec.gov/Archives/edgar/data/${cik}/${filing.accession}/${filing.rawAccession}.xml`,
            `https://www.sec.gov/Archives/edgar/data/${cik}/${filing.accession}/${filing.rawAccession}.txt`,
            `https://www.sec.gov/Archives/edgar/data/${cik}/${filing.accession}/form13fInfoTable.xml`,
            `https://www.sec.gov/Archives/edgar/data/${cik}/${filing.accession}/primary_doc.xml`
          ]
          
          let success = false
          for (const url of urls) {
            try {
              raw = await fetchUrl(url)
              if (raw.includes('informationTable') || raw.includes('13F')) {
                console.log(`  ✅ 13F-HR erfolgreich geladen: ${url.split('/').pop()}`)
                success = true
                break
              }
            } catch {
              continue
            }
          }
          
          if (!success) {
            console.warn(`  ⚠ Alle 13F-HR URLs fehlgeschlagen für ${quarterKey}`)
            continue
          }
          
        } else if (filing.form.startsWith('NPORT')) {
          // NPORT: Teste verschiedene URL-Patterns
          try {
            raw = await tryNportUrls(cik, filing.rawAccession, slug, quarterKey)
          } catch (err) {
            console.warn(`  ⚠ ${err.message}`)
            continue
          }
        }

        let positions = []
        let totalValue = 0

        if (filing.form === '13F-HR') {
          // 13F-HR Verarbeitung - ERWEITERT für Options
          const infoMatch = raw.match(/<(?:\w+:)?informationTable\b[\s\S]*?<\/(?:\w+:)?informationTable>/i)
          if (!infoMatch) {
            console.warn(`  ⚠ Keine informationTable für ${quarterKey}`)
            continue
          }
          
          try {
            const parsed = await parseStringPromise(`<root>${infoMatch[0]}</root>`, {
              explicitArray: false,
              tagNameProcessors: [processors.stripPrefix],
            })
            
            const table = parsed.root.informationTable.infoTable
            const arr = Array.isArray(table) ? table : [table]
            
            console.log(`  📊 13F-HR Positionen gefunden: ${arr.length}`)
            
            // ✅ ERWEITERT: Option Type Detection
            let stockCount = 0, callCount = 0, putCount = 0, optionCount = 0
            
            positions = arr.map(pos => {
              try {
                const name = normalizeCompanyName(pos.nameOfIssuer)
                const cusip = normalizeCusip(pos.cusip, name)
                const shares = Number(pos.shrsOrPrnAmt?.sshPrnamt?.replace(/,/g, '') || 0)
                const rawValue = pos.value?.replace(/,/g, '') || '0'
                const value = normalizeValue(rawValue, filing.form, slug)
                
                // ✅ NEU: Option Type Detection
                const titleOfClass = pos.titleOfClass || ''
                const putCall = pos.putCall || ''
                const optionType = detectOptionType(titleOfClass, putCall)
                const typeInfo = getPositionTypeDisplay(optionType)
                
                // Counter für Statistik
                if (optionType === 'STOCK') stockCount++
                else if (optionType === 'CALL') callCount++
                else if (optionType === 'PUT') putCount++
                else optionCount++
                
                if (!cusip || shares <= 0 || value <= 0) return null
                
                return { 
                  name, 
                  cusip, 
                  shares, 
                  value,
                  // ✅ NEU: Option Information
                  optionType,
                  typeInfo,
                  titleOfClass: titleOfClass || null,
                  putCall: putCall || null
                }
              } catch (err) {
                console.warn(`  ⚠ Fehler beim Verarbeiten einer 13F Position: ${err.message}`)
                return null
              }
            }).filter(Boolean)

            // ✅ PROFESSIONELLE Option Statistik ausgeben (ohne Emojis)
            console.log(`    📊 Position Types: ${stockCount} Stocks, ${callCount} Calls, ${putCount} Puts, ${optionCount} Unknown Options`)
              
          } catch (parseErr) {
            console.warn(`  ⚠ 13F-HR Parse Fehler für ${quarterKey}: ${parseErr.message}`)
            continue
          }
          
        } else if (filing.form.startsWith('NPORT')) {
          // NPORT Verarbeitung (bleibt unverändert - haben keine Option-Info)
          try {
            const parsed = await parseStringPromise(raw, { explicitArray: false })
            
            // Debug: Total Assets und Period Info
            const totalAssets = parsed.edgarSubmission?.formData?.fundInfo?.totAssets
            const reportPeriod = extractNportPeriod(raw)
            
            if (totalAssets) {
              console.log(`    💰 ${filing.form} Total Assets: $${(Number(totalAssets)/1000000).toFixed(1)}M`)
            }
            if (reportPeriod) {
              console.log(`    📅 Report Period: ${reportPeriod}`)
              actualPeriod = reportPeriod
            }
            
            // Extrahiere Positionen - KORRIGIERT für andere Feld-Namen
            let secs = parsed.edgarSubmission?.formData?.invstOrSecs?.invstOrSec
            const arr = Array.isArray(secs) ? secs : secs ? [secs] : []
            
            console.log(`    📊 ${filing.form} Positionen gefunden: ${arr.length}`)
            
            positions = arr.map(p => {
              try {
                // KORRIGIERT: Verschiedene Name-Felder probieren
                const name = normalizeCompanyName(p.name || p.n || p.nameOfIssuer || 'Unknown')
                const cusip = normalizeCusip(p.cusip, name)
                const shares = Number(p.balance?.replace(/,/g, '') || 0)
                const rawValue = p.valUSD?.replace(/,/g, '') || '0'
                const value = normalizeValue(rawValue, filing.form, slug)
                
                // Basis-Filterung: Nur echte Werte
                if (value <= 0 || value < 100000) { // Minimum $100k für große Positionen
                  return null
                }
                
                // Spezifische Ausschlüsse
                const nameUpper = name.toUpperCase()
                if (nameUpper.includes('CASH COLLATERAL') ||
                    nameUpper.includes('REVERSE REPO') ||
                    nameUpper === 'N/A' ||
                    shares < 0) {
                  return null
                }
                
                return {
                  name,
                  cusip,
                  shares: Math.abs(shares),
                  value,
                  // NPORT hat keine Option-Info, daher default
                  optionType: 'STOCK',
                  typeInfo: getPositionTypeDisplay('STOCK')
                }
              } catch (err) {
                return null
              }
            }).filter(Boolean)
            
          } catch (parseErr) {
            console.warn(`  ⚠ ${filing.form} Parse Fehler für ${quarterKey}: ${parseErr.message}`)
            continue
          }
        }

        // Validierung und Ausgabe
        totalValue = positions.reduce((sum, pos) => sum + pos.value, 0)
        
        console.log(`    ✅ ${positions.length} Positionen verarbeitet`)
        console.log(`    💵 Gesamtwert: $${(totalValue / 1000000).toFixed(1)}M`)
        
        if (positions.length > 0) {
          const sortedPositions = positions.sort((a, b) => b.value - a.value)
          console.log(`    🔝 Top 5 Positionen:`)
          sortedPositions.slice(0, 5).forEach((pos, i) => {
            const typeLabel = pos.optionType === 'STOCK' ? '' : ` (${pos.optionType})`
            console.log(`       ${i+1}. ${pos.name}${typeLabel}: $${(pos.value / 1000000).toFixed(1)}M`)
          })
        }
        
        if (positions.length === 0) {
          console.warn(`  ⚠ Keine gültigen Positionen für ${quarterKey}`)
          continue
        }

        // ✅ ERWEITERT: Portfolio Summary mit Option Breakdown
        const portfolioSummary = positions.reduce((acc, pos) => {
          acc[pos.optionType] = (acc[pos.optionType] || 0) + pos.value
          return acc
        }, {})

        // JSON schreiben - ERWEITERT
        const payload = { 
          form: filing.form, 
          date: filing.date, 
          period: actualPeriod,
          accession: filing.rawAccession,
          quarterKey,
          positions: positions.sort((a, b) => b.value - a.value),
          totalValue,
          positionsCount: positions.length,
          // ✅ NEU: Portfolio Breakdown
          portfolioSummary: {
            byType: portfolioSummary,
            percentages: Object.entries(portfolioSummary).reduce((acc, [type, value]) => {
              acc[type] = ((value / totalValue) * 100).toFixed(1) + '%'
              return acc
            }, {})
          }
        }
        
        await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf-8')
        console.log(`    ✅ Geschrieben: ${slug}/${quarterKey}.json`)
        
        // ✅ PROFESSIONELLE Portfolio Breakdown ausgeben
        console.log(`    📋 Portfolio Breakdown:`)
        Object.entries(portfolioSummary).forEach(([type, value]) => {
          const percent = ((value / totalValue) * 100).toFixed(1)
          console.log(`       ${type}: $${(value/1000000).toFixed(1)}M (${percent}%)`)
        })
      }

    } catch (error) {
      console.error(`❌ Fehler bei ${slug}: ${error.message}`)
    }
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})