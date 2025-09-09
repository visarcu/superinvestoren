#!/usr/bin/env node

/**
 * Test Script für das Portfolio-Währungssystem
 * 
 * Testet:
 * 1. Migration der DB-Felder
 * 2. Bestehende Daten (sollten weiter funktionieren)  
 * 3. Neue EUR-Käufe
 * 4. Währungskonvertierung und Performance-Berechnung
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testCurrencyMigration() {
  console.log('🧪 Testing Portfolio Currency Migration System\n')

  try {
    // 1. Test: Check if migration columns exist
    console.log('1️⃣ Testing DB Schema...')
    const { data: columns, error: schemaError } = await supabase.rpc('get_table_columns', { table_name: 'portfolio_holdings' })
    
    if (schemaError) {
      console.log('⚠️  Cannot check schema via RPC, trying direct query...')
      
      // Alternative: Try to insert a test record to see which fields are available
      const testData = {
        portfolio_id: '00000000-0000-0000-0000-000000000000', // Will fail, but shows us the schema
        symbol: 'TEST',
        quantity: 1,
        purchase_price: 100,
        purchase_date: '2025-01-09',
        purchase_currency: 'EUR',
        purchase_exchange_rate: 0.92,
        purchase_price_original: 92
      }
      
      const { error: insertError } = await supabase
        .from('portfolio_holdings')
        .insert(testData)
      
      if (insertError) {
        console.log('📋 Schema test result:', insertError.message)
        if (insertError.message.includes('purchase_currency')) {
          console.log('✅ New currency fields detected!')
        } else {
          console.log('❌ Migration needed - currency fields missing')
          console.log('Run: psql $DATABASE_URL -f migrations/add_currency_fields.sql')
          return
        }
      }
    }

    // 2. Test: Check existing portfolios
    console.log('\n2️⃣ Checking existing portfolios...')
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select('id, name, currency, cash_position')
      .limit(3)

    console.log(`Found ${portfolios?.length || 0} portfolios`)
    portfolios?.forEach(p => {
      console.log(`  📁 ${p.name} (${p.currency}) - Cash: ${p.cash_position}`)
    })

    // 3. Test: Check existing holdings
    console.log('\n3️⃣ Checking existing holdings...')
    const { data: holdings } = await supabase
      .from('portfolio_holdings')
      .select('symbol, quantity, purchase_price, purchase_currency, purchase_price_original')
      .limit(5)

    console.log(`Found ${holdings?.length || 0} holdings`)
    holdings?.forEach(h => {
      const isMigrated = h.purchase_currency && h.purchase_price_original
      console.log(`  📈 ${h.symbol}: ${h.quantity} @ $${h.purchase_price} ${isMigrated ? `(original: ${h.purchase_price_original} ${h.purchase_currency})` : '(legacy format)'}`)
    })

    // 4. Test: Currency Manager Functions
    console.log('\n4️⃣ Testing Currency Manager...')
    
    // Import currency manager (Node.js compatible)
    const currencyManagerModule = await import('../src/lib/portfolioCurrency.js')
    const { currencyManager } = currencyManagerModule
    
    // Test current exchange rate
    const currentRate = await currencyManager.getCurrentUSDtoEURRate()
    console.log(`💱 Current USD→EUR rate: ${currentRate.toFixed(6)}`)
    
    // Test historical rate
    const historicalDate = '2024-12-01'
    const historicalRate = await currencyManager.getHistoricalUSDtoEURRate(historicalDate)
    console.log(`📅 Historical USD→EUR rate (${historicalDate}): ${historicalRate.toFixed(6)}`)
    
    // Test conversion
    const testConversion = await currencyManager.convertNewPositionToUSD(150.00, 'EUR', '2024-12-01')
    console.log(`🔄 Convert 150 EUR → ${testConversion.priceUSD.toFixed(2)} USD (rate: ${testConversion.exchangeRate.toFixed(6)})`)

    // 5. Test: Display conversion
    console.log('\n5️⃣ Testing display conversion...')
    if (holdings?.length > 0) {
      const mockHoldingsWithPrices = holdings.map(h => ({
        ...h,
        current_price: 180, // Mock current price
        purchase_date: '2024-12-01'
      }))

      const convertedForEUR = await currencyManager.convertHoldingsForDisplay(
        mockHoldingsWithPrices,
        'EUR',
        true // include historical rates
      )

      console.log('📊 Display conversion test:')
      convertedForEUR?.forEach((h, i) => {
        if (i < 2) { // Show first 2
          console.log(`  ${h.symbol}: Value=${h.value?.toFixed(2)}€, P&L=${h.gain_loss?.toFixed(2)}€ (${h.gain_loss_percent?.toFixed(1)}%)`)
        }
      })
    }

    console.log('\n✅ Currency Migration Test completed!')
    console.log('\n🎯 Next Steps:')
    console.log('1. Run the SQL migration if currency fields are missing')
    console.log('2. Test the UI at /analyse/portfolio')
    console.log('3. Add a new position in EUR to test full flow')
    console.log('4. Check performance calculations in both EUR and USD views')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testCurrencyMigration()