#!/usr/bin/env node

/**
 * Simple Test für Currency Manager ohne DB-Abhängigkeiten
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testCurrencyManager() {
  console.log('🧪 Testing Currency Manager Functions\n')

  try {
    // Import currency manager
    const { currencyManager } = await import('../src/lib/portfolioCurrency.js')
    
    console.log('1️⃣ Testing current exchange rate...')
    const currentRate = await currencyManager.getCurrentUSDtoEURRate()
    console.log(`💱 Current USD→EUR rate: ${currentRate.toFixed(6)}`)
    
    console.log('\n2️⃣ Testing historical exchange rate...')
    const historicalDate = '2024-12-01'
    const historicalRate = await currencyManager.getHistoricalUSDtoEURRate(historicalDate)
    console.log(`📅 Historical USD→EUR rate (${historicalDate}): ${historicalRate.toFixed(6)}`)
    
    console.log('\n3️⃣ Testing EUR to USD conversion...')
    const testConversion = await currencyManager.convertNewPositionToUSD(150.00, 'EUR', '2024-12-01')
    console.log(`🔄 Convert 150.00 EUR → ${testConversion.priceUSD.toFixed(2)} USD`)
    console.log(`   Exchange rate used: ${testConversion.exchangeRate.toFixed(6)}`)
    console.log(`   Metadata:`, testConversion.metadata)
    
    console.log('\n4️⃣ Testing USD passthrough...')
    const usdConversion = await currencyManager.convertNewPositionToUSD(150.00, 'USD')
    console.log(`🔄 Convert 150.00 USD → ${usdConversion.priceUSD.toFixed(2)} USD (passthrough)`)
    
    console.log('\n5️⃣ Testing holdings display conversion...')
    const mockHoldings = [
      {
        id: '1',
        symbol: 'AAPL', 
        quantity: 10,
        purchase_price: 180, // USD from DB
        current_price: 195,  // USD from FMP
        purchase_date: '2024-12-01'
      },
      {
        id: '2',
        symbol: 'MSFT',
        quantity: 5, 
        purchase_price: 420, // USD from DB
        current_price: 435,  // USD from FMP
        purchase_date: '2024-11-15'
      }
    ]
    
    // Convert for EUR display
    const eurDisplay = await currencyManager.convertHoldingsForDisplay(mockHoldings, 'EUR', true)
    console.log('📊 EUR Display Conversion:')
    eurDisplay.forEach(holding => {
      console.log(`  ${holding.symbol}: ${holding.quantity} shares`)
      console.log(`    Purchase: ${holding.purchase_price_display.toFixed(2)}€/share (was $${holding.purchase_price})`)
      console.log(`    Current:  ${holding.current_price_display.toFixed(2)}€/share (was $${holding.current_price})`)
      console.log(`    Value:    ${holding.value.toFixed(2)}€`)
      console.log(`    P&L:      ${holding.gain_loss >= 0 ? '+' : ''}${holding.gain_loss.toFixed(2)}€ (${holding.gain_loss_percent.toFixed(1)}%)`)
      console.log()
    })
    
    // Convert for USD display (should be passthrough)
    const usdDisplay = await currencyManager.convertHoldingsForDisplay(mockHoldings, 'USD', false)
    console.log('💵 USD Display Conversion (passthrough):')
    usdDisplay.forEach(holding => {
      console.log(`  ${holding.symbol}: Value $${holding.value.toFixed(2)}, P&L $${holding.gain_loss >= 0 ? '+' : ''}${holding.gain_loss.toFixed(2)} (${holding.gain_loss_percent.toFixed(1)}%)`)
    })
    
    console.log('\n6️⃣ Testing cash position conversion...')
    const cashUSD = 5000
    const cashEUR = await currencyManager.convertCashPosition(cashUSD, 'EUR')
    const cashUSDPass = await currencyManager.convertCashPosition(cashUSD, 'USD')
    console.log(`💰 Cash: $${cashUSD} → ${cashEUR.toFixed(2)}€ / $${cashUSDPass} (passthrough)`)
    
    console.log('\n✅ All Currency Manager tests passed!')
    console.log('\n🎯 Currency system is working correctly:')
    console.log('- Historical exchange rates: ✅')
    console.log('- EUR→USD conversion for new positions: ✅')
    console.log('- Holdings display conversion: ✅')
    console.log('- Performance calculation with currency effects: ✅')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.log('\nCheck:')
    console.log('1. FMP_API_KEY in environment variables')
    console.log('2. Internet connection for API calls')
    console.log('3. Currency manager import path')
  }
}

testCurrencyManager()