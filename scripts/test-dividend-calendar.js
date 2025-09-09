// Test FMP Dividend Calendar API
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testDividendCalendar() {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
  console.log('🔑 API Key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NICHT GESETZT')
  
  if (!apiKey) {
    console.log('❌ FMP_API_KEY nicht gesetzt!')
    return
  }

  try {
    // Test 1: Allgemeiner Dividenden-Kalender
    const today = new Date().toISOString().split('T')[0]
    const nextYear = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    
    console.log('\n1️⃣ Testing general dividend calendar...')
    console.log(`From: ${today} To: ${nextYear}`)
    
    const response1 = await fetch(`https://financialmodelingprep.com/api/v3/stock_dividend_calendar?from=${today}&to=${nextYear}&apikey=${apiKey}`)
    const data1 = await response1.json()
    
    console.log('📊 Calendar Response:', data1?.length ? `${data1.length} dividends found` : 'Empty or error')
    
    // Suche nach Booking
    const bookingDividends = data1?.filter(d => d.symbol === 'BKNG') || []
    console.log('🏨 Booking Holdings (BKNG) dividends:', bookingDividends)
    
    // Top 10 kommende Dividenden zeigen
    if (data1?.length > 0) {
      console.log('\n📅 Next 10 upcoming dividends:')
      data1.slice(0, 10).forEach(d => {
        console.log(`  ${d.date}: ${d.symbol} - $${d.dividend}`)
      })
    }
    
    // Test 2: Spezifisch Booking Historical
    console.log('\n2️⃣ Testing Booking historical dividends...')
    const response2 = await fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/BKNG?apikey=${apiKey}`)
    const data2 = await response2.json()
    
    if (data2?.historical?.length > 0) {
      console.log('🏨 Booking historical dividends (recent):')
      data2.historical.slice(0, 5).forEach(d => {
        console.log(`  ${d.paymentDate}: $${d.adjDividend} (ex: ${d.date})`)
      })
    }
    
  } catch (error) {
    console.error('❌ API Error:', error)
  }
}

testDividendCalendar()