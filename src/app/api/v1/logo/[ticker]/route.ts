// Finclue Data API v1 – Company Logo
// GET /api/v1/logo/{ticker}?size=128&format=png
//
// Priority:
// 1. Eigene Logos aus /public/logos/ (manuell kuratiert, beste Qualität)
// 2. FMP Image-Stock CDN (https://financialmodelingprep.com/image-stock/{TICKER}.png)
//    Hochwertig und konsistent, Teil des FMP-Plans, kein API-Key für CDN nötig
// 3. Google Favicon API (Fallback, niedrigere Qualität)
// 4. SVG Placeholder mit Initialen (letzter Fallback)
//
// Upload eigener Logos:
// {TICKER}.png oder {TICKER}.svg in /public/logos/ ablegen.
// Z.B. /public/logos/AAPL.png, /public/logos/MSFT.svg, /public/logos/SAP.png

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// Ticker → Domain für Google Favicon Fallback
const DOMAINS: Record<string, string> = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com', GOOG: 'google.com',
  AMZN: 'amazon.com', NVDA: 'nvidia.com', META: 'meta.com', TSLA: 'tesla.com',
  NFLX: 'netflix.com', ADBE: 'adobe.com', CRM: 'salesforce.com', ORCL: 'oracle.com',
  INTC: 'intel.com', AMD: 'amd.com', AVGO: 'broadcom.com', CSCO: 'cisco.com',
  IBM: 'ibm.com', NOW: 'servicenow.com', SNOW: 'snowflake.com', PLTR: 'palantir.com',
  UBER: 'uber.com', ABNB: 'airbnb.com', SHOP: 'shopify.com', SPOT: 'spotify.com',
  SNAP: 'snapchat.com', PINS: 'pinterest.com', COIN: 'coinbase.com',
  ASML: 'asml.com', ARM: 'arm.com', RBLX: 'roblox.com',
  CRWD: 'crowdstrike.com', ZS: 'zscaler.com', NET: 'cloudflare.com',
  HIMS: 'forhims.com', DKNG: 'draftkings.com', SOFI: 'sofi.com', MELI: 'mercadolibre.com',
  TTD: 'thetradedesk.com', ROKU: 'roku.com',
  V: 'visa.com', MA: 'mastercard.com', PYPL: 'paypal.com',
  JPM: 'jpmorganchase.com', BAC: 'bankofamerica.com', GS: 'goldmansachs.com',
  MS: 'morganstanley.com', WFC: 'wellsfargo.com', BLK: 'blackrock.com',
  JNJ: 'jnj.com', UNH: 'unitedhealthgroup.com', PFE: 'pfizer.com',
  LLY: 'lilly.com', ABBV: 'abbvie.com', MRK: 'merck.com',
  WMT: 'walmart.com', KO: 'coca-colacompany.com', PEP: 'pepsico.com', PG: 'pg.com',
  COST: 'costco.com', NKE: 'nike.com', SBUX: 'starbucks.com', MCD: 'mcdonalds.com',
  DIS: 'disney.com', BA: 'boeing.com', CAT: 'caterpillar.com',
  XOM: 'exxonmobil.com', CVX: 'chevron.com',
  // German / DAX
  SAP: 'sap.com', 'SIE.DE': 'siemens.com', 'ALV.DE': 'allianz.com',
  'DTE.DE': 'telekom.com', 'BAS.DE': 'basf.com', 'BMW.DE': 'bmwgroup.com',
  'MBG.DE': 'mercedes-benz.com', 'ADS.DE': 'adidas.com',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const size = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('size') || '128'), 16), 512)

  // ── 1. Eigenes Logo aus /public/logos/ ──────────────────────────────
  const logosDir = path.join(process.cwd(), 'public', 'logos')
  const extensions = ['svg', 'png', 'jpg', 'webp']

  for (const ext of extensions) {
    const filePath = path.join(logosDir, `${ticker}.${ext}`)
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath)
      const contentTypes: Record<string, string> = {
        svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp',
      }
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentTypes[ext] || 'image/png',
          'Cache-Control': 'public, max-age=2592000, immutable', // 30 Tage
          'X-Logo-Source': 'finclue-curated',
        },
      })
    }
  }

  // ── 2. FMP Image-Stock CDN ──────────────────────────────────────────
  // Hochwertig, konsistent, deckt fast alle gelisteten US- und DAX-Aktien ab.
  try {
    const fmpRes = await fetch(
      `https://financialmodelingprep.com/image-stock/${encodeURIComponent(ticker)}.png`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (fmpRes.ok) {
      const buffer = await fmpRes.arrayBuffer()
      // Manche FMP-Logos sind nur 1x1-Platzhalter (z.B. ~200 Bytes) — überspringen
      if (buffer.byteLength > 500) {
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=2592000', // 30 Tage
            'X-Logo-Source': 'fmp-cdn',
          },
        })
      }
    }
  } catch {}

  // ── 3. Google Favicon Fallback ──────────────────────────────────────
  const domain = DOMAINS[ticker] || `${ticker.replace('.DE', '').toLowerCase()}.com`

  try {
    const logoUrl = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=${size}`
    const res = await fetch(logoUrl)
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': res.headers.get('content-type') || 'image/png',
          'Cache-Control': 'public, max-age=604800', // 7 Tage
          'X-Logo-Source': 'google-favicon',
          'X-Logo-Domain': domain,
        },
      })
    }
  } catch {}

  // ── 4. SVG Placeholder ─────────────────────────────────────────────
  const initials = ticker.replace('.DE', '').slice(0, 2)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#1a1a2e"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${size * 0.35}" font-weight="700" fill="rgba(255,255,255,0.4)">${initials}</text>
  </svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
      'X-Logo-Source': 'placeholder',
    },
  })
}
