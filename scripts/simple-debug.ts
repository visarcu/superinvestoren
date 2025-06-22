// scripts/simple-debug.ts - Vereinfachtes Debug ohne TypeScript Fehler

import * as dotenv from 'dotenv'

// Load environment
dotenv.config({ path: '.env.local' })

async function testFMPBasic() {
  console.log('🔍 Testing FMP API...\n')
  
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY
  console.log(`FMP API Key: ${apiKey ? '✅ Available' : '❌ Missing'}`)
  
  if (!apiKey) {
    console.log('❌ Add FMP_API_KEY to .env.local')
    return
  }
  
  const ticker = 'AAPL'
  
  try {
    // Test Quarterly Income Statement
    console.log('\n📊 Testing Quarterly Income Statement:')
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=quarter&limit=4&apikey=${apiKey}`
    )
    
    console.log(`Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Got ${data.length} quarters`)
      
      if (data.length > 0) {
        const latest = data[0]
        console.log('\n📈 Latest Quarter:')
        console.log(`Date: ${latest.date}`)
        console.log(`Revenue: $${(latest.revenue / 1e9).toFixed(2)}B`)
        console.log(`EPS: $${latest.eps}`)
        console.log(`Net Income: $${(latest.netIncome / 1e9).toFixed(2)}B`)
      }
    } else {
      const errorText = await response.text()
      console.log(`❌ API Error: ${errorText}`)
    }
    
  } catch (error) {
    console.log(`❌ Network Error: ${error}`)
  }
  
  // Test Current Quote
  try {
    console.log('\n💰 Testing Current Quote:')
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`
    )
    
    if (response.ok) {
      const data = await response.json()
      const quote = data[0]
      console.log(`✅ Current Price: $${quote?.price}`)
      console.log(`Market Cap: $${(quote?.marketCap / 1e9).toFixed(2)}B`)
      console.log(`Change: ${quote?.changesPercentage}%`)
    } else {
      console.log(`❌ Quote API failed`)
    }
  } catch (error) {
    console.log(`❌ Quote Error: ${error}`)
  }
}

async function testAIRouteData() {
  console.log('\n🤖 Testing AI Route Logic...')
  
  const apiKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY
  
  if (!apiKey) {
    console.log('❌ No API key for route test')
    return
  }
  
  console.log('📡 Simulating fetchCurrentFinancialData...')
  
  try {
    // Diese URLs nutzt deine AI Route
    const urls = [
      `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey}`,
      `https://financialmodelingprep.com/api/v3/income-statement/AAPL?limit=1&apikey=${apiKey}`,
      `https://financialmodelingprep.com/api/v3/income-statement/AAPL?period=quarter&limit=4&apikey=${apiKey}`
    ]
    
    const responses = await Promise.allSettled(
      urls.map(url => fetch(url))
    )
    
    console.log('📊 Route API Results:')
    responses.forEach((result, i) => {
      const name = ['Quote', 'Income', 'Quarterly'][i]
      if (result.status === 'fulfilled' && result.value.ok) {
        console.log(`   ${name}: ✅`)
      } else {
        console.log(`   ${name}: ❌`)
      }
    })
    
    // Test if quarterly data has the info we need
    if (responses[2].status === 'fulfilled' && responses[2].value.ok) {
      const quarterlyData = await responses[2].value.json()
      if (quarterlyData.length > 0) {
        console.log('\n📈 AI Route würde bekommen:')
        console.log(`Revenue: $${(quarterlyData[0].revenue / 1e9).toFixed(2)}B`)
        console.log(`EPS: $${quarterlyData[0].eps}`)
        console.log(`Date: ${quarterlyData[0].date}`)
      }
    }
    
  } catch (error) {
    console.log(`❌ Route simulation failed: ${error}`)
  }
}

async function main() {
  console.log('🚀 Simple FMP Debug\n')
  
  await testFMPBasic()
  await testAIRouteData()
  
  console.log('\n🎯 Summary:')
  console.log('- If APIs work but no data in AI → Route processing issue')
  console.log('- If APIs fail → API key or rate limit issue')
  console.log('- Test in app: Ask "Apple revenue Q1 2025" and check response')
  
  console.log('\n💡 Next: Check your AI chat response for actual FMP data')
}

main().catch(console.error)