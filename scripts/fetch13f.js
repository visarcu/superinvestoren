// scripts/fetch13f.js
import fetch from 'node-fetch'
import { parseStringPromise, processors } from 'xml2js'
import fs from 'fs/promises'
import path from 'path'
import { investorCiks } from '../src/lib/cikMapping.js'

// Investoren die kleinere Zahlen in den SEC Filings haben (brauchen extra Multiplikator)
const extraMultiplierSlugs = ['klarman', 'spier', 'triplefrond'];

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

// Hilfsfunktion: Period End Date aus NPORT-P extrahieren  
function extractNportPeriod(rawXml) {
  try {
    // Suche nach repPdEnd (Report Period End)
    const repPdEndMatch = rawXml.match(/<repPdEnd>([^<]+)<\/repPdEnd>/)
    if (repPdEndMatch) {
      const endDate = repPdEndMatch[1]
      console.log(`    • NPORT-P Period End gefunden: ${endDate}`)
      return getQuarterFromDate(endDate)
    }
    
    // Fallback: repPdDate (Report Period Date)
    const repPdDateMatch = rawXml.match(/<repPdDate>([^<]+)<\/repPdDate>/)
    if (repPdDateMatch) {
      const periodDate = repPdDateMatch[1]
      console.log(`    • NPORT-P Period Date gefunden: ${periodDate}`)
      return getQuarterFromDate(periodDate)
    }
    
    return null
  } catch (err) {
    console.warn(`    ⚠ Fehler beim Period-Extrakt: ${err.message}`)
    return null
  }
}

// Hilfsfunktion: Wert normalisieren - KORREKT für jeden Typ
function normalizeValue(rawValue, form, slug) {
  let value = Number(rawValue.replace(/,/g, ''))
  
  if (form === '13F-HR') {
    // 13F-HR: Werte sind in Tausenden USD -> *1000
    value = value * 1000
    
    // Manche Investoren haben noch kleinere Zahlen
    if (extraMultiplierSlugs.includes(slug)) {
      value = value * 1000
    }
    
    console.log(`    13F-HR Wert: ${rawValue} -> ${value} (${(value/1000000).toFixed(1)}M)`)
    
  } else if (form === 'NPORT-P') {
    // NPORT-P: Werte sind BEREITS in USD - KEIN Multiplikator!
    // <valUSD>16638573.600000000000</valUSD> = 16.6M USD
    
    console.log(`    NPORT-P Wert: ${rawValue} -> ${value} (${(value/1000000).toFixed(1)}M) [BEREITS KORREKT]`)
  }
  
  return value
}

// Hilfsfunktion: CUSIP bereinigen und validieren
function normalizeCusip(cusip) {
  if (!cusip) return null
  const cleaned = cusip.replace(/[^A-Z0-9]/g, '').slice(0, 9)
  return cleaned.length >= 6 ? cleaned : null
}

// Hilfsfunktion: Firmenname bereinigen
function normalizeCompanyName(name) {
  if (!name) return 'Unknown Company'
  return name.replace(/\s+/g, ' ').replace(/\b(INC|CORP|LTD|LLC|LP)\b\.?/gi, '$1').trim()
}

async function run() {
  const baseDir = path.resolve('src/data/holdings')
  await fs.mkdir(baseDir, { recursive: true })

  for (const [slug, cik] of Object.entries(investorCiks)) {
    // Zum Testen nur einen Slug aktivieren:
    if (slug !== 'torray') continue

    const invDir = path.join(baseDir, slug)
    await fs.mkdir(invDir, { recursive: true })
    console.log(`→ Bearbeite ${slug} (CIK ${cik})`)

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

      // 2) Alle Filings (historisch + recent) vereinen
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

      // 3) Nur 13F-HR und NPORT-P
      const rawFilings = allFilings
        .filter(f => f.form === '13F-HR' || f.form === 'NPORT-P')
        .map(f => ({
          form: f.form,
          date: f.filingDate,
          period: f.periodOfReport || f.filingDate,
          accession: f.accessionNumber.replace(/-/g, ''),
          rawAccession: f.accessionNumber,
          xmlHref:
            f.form === '13F-HR'
              ? `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g, '')}/${f.accessionNumber}.xml`
              : `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g, '')}/primary_doc.xml`,
          txtHref:
            f.form === '13F-HR'
              ? `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g, '')}/${f.accessionNumber}.txt`
              : undefined,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      console.log(
        `   • Gefundene 13F-HR: ${rawFilings.filter(f => f.form === '13F-HR').length}, NPORT-P: ${rawFilings.filter(f => f.form === 'NPORT-P').length}`
      )

      // 4) Pre-process: Für NPORT-P die echte Period aus XML extrahieren
      const processedFilings = []
      
      for (const filing of rawFilings) {
        let actualPeriod = filing.period
        let quarterKey = getQuarterFromDate(actualPeriod)
        
        if (filing.form === 'NPORT-P') {
          // Für NPORT-P: Lade XML und extrahiere echte Period
          try {
            console.log(`  • Analysiere NPORT-P Period für ${filing.rawAccession}`)
            const xmlContent = await fetchUrl(filing.xmlHref)
            const extractedQuarter = extractNportPeriod(xmlContent)
            
            if (extractedQuarter) {
              quarterKey = extractedQuarter
              console.log(`  • NPORT-P Period überschrieben: ${getQuarterFromDate(actualPeriod)} -> ${quarterKey}`)
            }
          } catch (err) {
            console.warn(`  ⚠ Konnte NPORT-P Period nicht extrahieren: ${err.message}`)
          }
        }
        
        processedFilings.push({
          ...filing,
          quarterKey
        })
      }

      // 5) Gruppierung nach Quarter - nur das neueste Filing pro Quartal
      const filingsByQuarter = new Map()
      
      processedFilings.forEach(filing => {
        if (!filing.quarterKey) return
        
        const existing = filingsByQuarter.get(filing.quarterKey)
        if (!existing || new Date(filing.date) > new Date(existing.date)) {
          filingsByQuarter.set(filing.quarterKey, filing)
          console.log(`  • Quartal ${filing.quarterKey}: ${filing.form} vom ${filing.date} (${filing.rawAccession})`)
        }
      })

      console.log(`   • Eindeutige Quartale: ${filingsByQuarter.size}`)

      // 6) Pro eindeutigem Quartal: verarbeiten
      for (const [quarterKey, filing] of filingsByQuarter) {
        const outFile = path.join(invDir, `${quarterKey}.json`)
        
        console.log(`  • Verarbeite ${slug} ${quarterKey} (${filing.form})`)

        // Rohdaten holen (falls noch nicht geholt)
        let raw = ''
        try {
          raw = await fetchUrl(filing.xmlHref)
        } catch {
          if (filing.txtHref) {
            try {
              raw = await fetchUrl(filing.txtHref)
            } catch {
              console.warn(`  ⚠ XML & TXT fehlgeschlagen für ${slug} ${quarterKey}`)
              continue
            }
          } else {
            console.warn(`  ⚠ XML fehlgeschlagen für ${slug} ${quarterKey}`)
            continue
          }
        }

        let positions = []
        let totalValue = 0

        if (filing.form === '13F-HR') {
          // 13F-HR Logic (bleibt gleich)
          const infoMatch = raw.match(/<(?:\w+:)?informationTable\b[\s\S]*?<\/(?:\w+:)?informationTable>/i)
          if (!infoMatch) {
            console.warn(`  ⚠ Keine informationTable gefunden für ${slug} ${quarterKey}`)
            continue
          }
          
          try {
            const parsed = await parseStringPromise(`<root>${infoMatch[0]}</root>`, {
              explicitArray: false,
              tagNameProcessors: [processors.stripPrefix],
            })
            
            const table = parsed.root.informationTable.infoTable
            const arr = Array.isArray(table) ? table : [table]
            
            positions = arr
              .map(pos => {
                try {
                  const cusip = normalizeCusip(pos.cusip)
                  const name = normalizeCompanyName(pos.nameOfIssuer)
                  const shares = Number(pos.shrsOrPrnAmt?.sshPrnamt?.replace(/,/g, '') || 0)
                  const rawValue = pos.value?.replace(/,/g, '') || '0'
                  const value = normalizeValue(rawValue, filing.form, slug)
                  
                  if (!cusip || shares <= 0 || value <= 0) {
                    return null
                  }
                  
                  return { name, cusip, shares, value }
                } catch (err) {
                  console.warn(`  ⚠ Fehler beim Verarbeiten einer Position: ${err.message}`)
                  return null
                }
              })
              .filter(Boolean)
              
          } catch (parseErr) {
            console.warn(`  ⚠ XML Parse Fehler für ${slug} ${quarterKey}: ${parseErr.message}`)
            continue
          }
          
        } else if (filing.form === 'NPORT-P') {
          // NPORT-P Parser
          try {
            const parsed = await parseStringPromise(raw, { explicitArray: false })
            
            // Debug: Total Assets aus fundInfo holen
            const totalAssets = parsed.edgarSubmission?.formData?.fundInfo?.totAssets
            if (totalAssets) {
              console.log(`    • NPORT-P Total Assets: ${(Number(totalAssets)/1000000).toFixed(1)}M`)
            }
            
            const secs = parsed.edgarSubmission?.formData?.invstOrSecs?.invstOrSec
            const arr = Array.isArray(secs) ? secs : secs ? [secs] : []
            
            console.log(`    • NPORT-P Positionen gefunden: ${arr.length}`)
            
            // Sample der ersten Position
            if (arr.length > 0) {
              const sample = arr[0]
              console.log(`    • Sample: ${sample.name} - valUSD: ${sample.valUSD}`)
            }
            
            positions = arr
              .map(p => {
                try {
                  const cusip = normalizeCusip(p.cusip)
                  const name = normalizeCompanyName(p.name)
                  const shares = Number(p.balance?.replace(/,/g, '') || 0)
                  const rawValue = p.valUSD?.replace(/,/g, '') || '0'
                  const value = normalizeValue(rawValue, filing.form, slug)
                  const pctOfPortfolio = p.pctVal ? Number(p.pctVal) : undefined
                  
                  if (value <= 0) {
                    return null
                  }
                  
                  return {
                    name,
                    cusip,
                    shares,
                    value,
                    pctOfPortfolio,
                  }
                } catch (err) {
                  console.warn(`    ⚠ Fehler beim Verarbeiten einer NPORT Position: ${err.message}`)
                  return null
                }
              })
              .filter(Boolean)
              
          } catch (parseErr) {
            console.warn(`  ⚠ NPORT-P Parse Fehler für ${slug} ${quarterKey}: ${parseErr.message}`)
            continue
          }
        }

        // Validation und Debugging
        totalValue = positions.reduce((sum, pos) => sum + pos.value, 0)
        
        console.log(`    ├ ${positions.length} Positionen verarbeitet`)
        console.log(`    ├ Gesamtwert: $${(totalValue / 1000000).toFixed(1)}M`)
        console.log(`    ├ Größte Position: ${positions[0]?.name || 'N/A'} ($${((positions[0]?.value || 0) / 1000000).toFixed(1)}M)`)
        
        // Realistischer Check für Torray (sollte ~346-671M sein)
        if (slug === 'torray' && filing.form === 'NPORT-P') {
          if (totalValue < 200000000 || totalValue > 1000000000) {
            console.warn(`  ⚠ Torray NPORT-P Gesamtwert ungewöhnlich: $${(totalValue/1000000).toFixed(1)}M`)
          } else {
            console.log(`  ✓ Torray NPORT-P Gesamtwert realistisch: $${(totalValue/1000000).toFixed(1)}M`)
          }
        }
        
        if (positions.length === 0) {
          console.warn(`  ⚠ Keine gültigen Positionen gefunden für ${slug} ${quarterKey}`)
          continue
        }

        // JSON schreiben
        const payload = { 
          form: filing.form, 
          date: filing.date, 
          period: filing.period, 
          accession: filing.rawAccession,
          quarterKey,
          positions: positions.sort((a, b) => b.value - a.value),
          totalValue,
          positionsCount: positions.length
        }
        
        await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf-8')
        console.log(`  ✓ Geschrieben: ${slug}/${quarterKey}.json`)
      }

    } catch (error) {
      console.error(`❌ Fehler bei ${slug}: ${error.message}`)
    }

    console.log()
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})