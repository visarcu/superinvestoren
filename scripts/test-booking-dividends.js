// Test Booking Holdings Dividends specifically
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testBookingDividends() {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
  console.log('🔑 API Key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NICHT GESETZT')
  
  if (!apiKey) {
    console.log('❌ FMP_API_KEY nicht gesetzt!')
    return
  }

  try {
    console.log('\n1️⃣ Testing Booking Holdings (BKNG) historical dividends...')
    const response1 = await fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/BKNG?apikey=${apiKey}`)
    const data1 = await response1.json()
    
    if (data1?.historical?.length > 0) {
      console.log(`📊 Found ${data1.historical.length} dividend records for BKNG`)
      
      // Alle Dividenden der letzten 2 Jahre anzeigen
      const today = new Date()
      const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())
      
      const recentDividends = data1.historical.filter(d => new Date(d.paymentDate) >= twoYearsAgo)
      
      console.log(`\n📅 BKNG Dividends from ${twoYearsAgo.toISOString().split('T')[0]} onwards:`)
      recentDividends.forEach(d => {
        const paymentDate = new Date(d.paymentDate)
        const exDate = new Date(d.date)
        const isUpcoming = paymentDate > today
        
        console.log(`  ${isUpcoming ? '🟢 UPCOMING' : '🔵 PAST'}: Ex: ${d.date} → Payment: ${d.paymentDate} - $${d.adjDividend} (${d.dividend})`)
      })
      
      // Speziell September 2025 prüfen
      const september2025Dividends = data1.historical.filter(d => {
        const paymentDate = new Date(d.paymentDate)
        return paymentDate.getFullYear() === 2025 && paymentDate.getMonth() === 8 // September = 8
      })
      
      console.log(`\n🗓️ September 2025 BKNG dividends:`)
      if (september2025Dividends.length > 0) {
        september2025Dividends.forEach(d => {
          console.log(`  ✅ Ex: ${d.date} → Payment: ${d.paymentDate} - $${d.adjDividend}`)
        })
      } else {
        console.log('  ❌ No BKNG dividends found for September 2025')
      }
      
    } else {
      console.log('❌ No dividend data found for BKNG')
    }
    
    console.log('\n2️⃣ Testing general dividend calendar for September 2025...')
    const response2 = await fetch(`https://financialmodelingprep.com/api/v3/stock_dividend_calendar?from=2025-09-01&to=2025-09-30&apikey=${apiKey}`)
    const data2 = await response2.json()
    
    if (data2?.length > 0) {
      const bkngDividends = data2.filter(d => d.symbol === 'BKNG')
      console.log(`📊 Found ${bkngDividends.length} BKNG dividends in September 2025 calendar`)
      
      bkngDividends.forEach(d => {
        console.log(`  📅 ${d.date}: ${d.symbol} - $${d.dividend}`)
      })
    } else {
      console.log('❌ No dividend calendar data found for September 2025')
    }
    
  } catch (error) {
    console.error('❌ API Error:', error)
  }
}

testBookingDividends()