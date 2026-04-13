// Finclue Data API v1 – Company Logo
// GET /api/v1/logo/{ticker}?size=128
// Proxy für Company Logos – nutzt mehrere Quellen mit Fallback.

import { NextRequest, NextResponse } from 'next/server'

// Ticker → Domain Mapping für Logo-Lookup
const TICKER_DOMAINS: Record<string, string> = {
  // Mag 7
  AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com', GOOG: 'google.com',
  AMZN: 'amazon.com', NVDA: 'nvidia.com', META: 'meta.com', TSLA: 'tesla.com',
  // Tech
  NFLX: 'netflix.com', ADBE: 'adobe.com', CRM: 'salesforce.com', ORCL: 'oracle.com',
  INTC: 'intel.com', AMD: 'amd.com', AVGO: 'broadcom.com', CSCO: 'cisco.com',
  IBM: 'ibm.com', NOW: 'servicenow.com', SNOW: 'snowflake.com', PLTR: 'palantir.com',
  UBER: 'uber.com', ABNB: 'airbnb.com', SHOP: 'shopify.com', SPOT: 'spotify.com',
  SNAP: 'snapchat.com', PINS: 'pinterest.com', COIN: 'coinbase.com', SQ: 'squareup.com',
  ASML: 'asml.com', ARM: 'arm.com', RBLX: 'roblox.com',
  CRWD: 'crowdstrike.com', ZS: 'zscaler.com', NET: 'cloudflare.com', DDOG: 'datadoghq.com',
  HIMS: 'forhims.com', DKNG: 'draftkings.com', SOFI: 'sofi.com', MELI: 'mercadolibre.com',
  TTD: 'thetradedesk.com', ROKU: 'roku.com', BILL: 'bill.com',
  // Finance
  V: 'visa.com', MA: 'mastercard.com', PYPL: 'paypal.com',
  JPM: 'jpmorganchase.com', BAC: 'bankofamerica.com', GS: 'goldmansachs.com',
  MS: 'morganstanley.com', WFC: 'wellsfargo.com', BLK: 'blackrock.com',
  // Healthcare
  JNJ: 'jnj.com', UNH: 'unitedhealthgroup.com', PFE: 'pfizer.com',
  LLY: 'lilly.com', ABBV: 'abbvie.com', MRK: 'merck.com', TMO: 'thermofisher.com',
  // Consumer
  WMT: 'walmart.com', KO: 'coca-colacompany.com', PEP: 'pepsico.com', PG: 'pg.com',
  COST: 'costco.com', NKE: 'nike.com', SBUX: 'starbucks.com', MCD: 'mcdonalds.com',
  DIS: 'disney.com',
  // Industrial
  BA: 'boeing.com', CAT: 'caterpillar.com', HON: 'honeywell.com',
  UPS: 'ups.com', DE: 'deere.com', LMT: 'lockheedmartin.com',
  // Energy
  XOM: 'exxonmobil.com', CVX: 'chevron.com',
  // German / DAX
  SAP: 'sap.com', 'SIE.DE': 'siemens.com', 'ALV.DE': 'allianz.com',
  'DTE.DE': 'telekom.com', 'BAS.DE': 'basf.com', 'BMW.DE': 'bmw.com',
  'MBG.DE': 'mercedes-benz.com', 'ADS.DE': 'adidas.com',
}

// Fallback: Ticker → Domain heuristic
function guessDomain(ticker: string): string {
  const clean = ticker.replace('.DE', '').replace('.L', '').toLowerCase()
  return `${clean}.com`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const searchParams = request.nextUrl.searchParams
  const size = Math.min(Math.max(parseInt(searchParams.get('size') || '128'), 16), 512)

  const domain = TICKER_DOMAINS[ticker] || guessDomain(ticker)

  // Google Favicon API als primäre Quelle (zuverlässig, kostenlos)
  const logoUrl = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=${size}`

  try {
    const res = await fetch(logoUrl)
    if (!res.ok) throw new Error(`Logo fetch failed: ${res.status}`)

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/png'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000', // 7 Tage Cache
        'X-Logo-Source': 'google-favicon',
        'X-Logo-Domain': domain,
      },
    })
  } catch (error) {
    // Fallback: SVG Placeholder mit Initialen
    const initials = ticker.slice(0, 2)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#1a1a2e"/>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="${size * 0.35}" font-weight="700" fill="rgba(255,255,255,0.4)">${initials}</text>
    </svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }
}
