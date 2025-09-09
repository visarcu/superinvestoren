// Test FMP API direkt
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testFMPAPI() {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
  console.log('🔑 API Key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NICHT GESETZT')
  
  if (!apiKey) {
    console.log('❌ FMP_API_KEY nicht in .env.local gesetzt!')
    return
  }

  try {
    // Test 1: EUR/USD aktueller Kurs
    console.log('\n1️⃣ Testing EURUSD current rate...')
    const response1 = await fetch(`https://financialmodelingprep.com/api/v3/fx/EURUSD?apikey=${apiKey}`)
    const data1 = await response1.json()
    console.log('📊 Current EURUSD:', data1)
    
    // Test 2: Historischer Kurs
    console.log('\n2️⃣ Testing historical EURUSD rate...')
    const testDate = '2024-12-01'
    const response2 = await fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/EURUSD?from=${testDate}&to=${testDate}&apikey=${apiKey}`)
    const data2 = await response2.json()
    console.log('📊 Historical EURUSD:', data2)
    
    // Test 3: Konvertierung
    if (data1 && (data1[0]?.price || data1.price)) {
      const eurUsd = data1[0]?.price || data1.price
      const usdEur = 1 / eurUsd
      console.log(`\n3️⃣ Conversion test:`)
      console.log(`   EUR/USD: ${eurUsd}`)
      console.log(`   USD/EUR: ${usdEur.toFixed(6)}`)
      console.log(`   150 EUR = ${(150 / usdEur).toFixed(2)} USD`)
      console.log(`   150 USD = ${(150 * usdEur).toFixed(2)} EUR`)
    }
    
  } catch (error) {
    console.error('❌ API Error:', error)
  }
}

testFMPAPI()