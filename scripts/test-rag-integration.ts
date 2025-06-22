// scripts/test-rag-integration.ts - Teste RAG in deiner AI App

import { enhancePromptWithRAG, FinancialRAGSystem } from '../src/lib/ragSystem'

async function testRAGIntegration() {
  console.log('🧪 Testing RAG Integration with AI...\n')
  
  try {
    // 1. Test direkte RAG Nutzung
    console.log('1️⃣ Testing direct RAG usage...')
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    
    // Test search
    const searchResults = await ragSystem.search({
      query: 'Apple iPhone revenue quarterly earnings',
      ticker: 'AAPL',
      limit: 3
    })
    
    console.log(`   Found ${searchResults.length} relevant documents`)
    if (searchResults.length > 0) {
      console.log(`   Best match: ${searchResults[0].source}`)
      console.log(`   Relevance: ${(searchResults[0].relevance_score * 100).toFixed(1)}%`)
    }
    
    // 2. Test RAG-enhanced prompts
    console.log('\n2️⃣ Testing RAG-enhanced prompts...')
    
    const testPrompts = [
      {
        prompt: "How is Apple performing this quarter?",
        ticker: "AAPL"
      },
      {
        prompt: "What are Microsoft's growth prospects?", 
        ticker: "MSFT"
      },
      {
        prompt: "Analyze Tesla's recent performance",
        ticker: "TSLA"
      }
    ]
    
    for (const test of testPrompts) {
      console.log(`\n   Testing: "${test.prompt}"`)
      
      const enhancedPrompt = await enhancePromptWithRAG(
        test.prompt,
        test.ticker,
        'stock'
      )
      
      const hasRAGContext = enhancedPrompt.includes('RELEVANTE DOKUMENTE')
      console.log(`   RAG Enhancement: ${hasRAGContext ? '✅ Added context' : '⚠️ No context found'}`)
      
      if (hasRAGContext) {
        const contextLength = enhancedPrompt.length - test.prompt.length
        console.log(`   Context added: ${contextLength} characters`)
      }
    }
    
    // 3. Test mit echten AI Chat
    console.log('\n3️⃣ Testing with AI Chat simulation...')
    
    // Simuliere AI Chat Request
    const mockChatRequest = {
        message: "Tell me about Apple's latest earnings and growth prospects",
        ticker: "AAPL",
        analysisType: "stock" as const  // ← FIX: 'as const' oder direkte Zuweisung
      }
    
    console.log(`   Chat Message: "${mockChatRequest.message}"`)
    
    const enhancedForAI = await enhancePromptWithRAG(
      mockChatRequest.message,
      mockChatRequest.ticker,
      mockChatRequest.analysisType
    )
    
    // Zeige Struktur des enhanced prompts
    const lines = enhancedForAI.split('\n')
    const hasContext = lines.some(line => line.includes('RELEVANTE DOKUMENTE'))
    const hasInstructions = lines.some(line => line.includes('INSTRUCTIONS'))
    
    console.log(`   ✅ Enhanced prompt structure:`)
    console.log(`      - Has RAG context: ${hasContext}`)
    console.log(`      - Has instructions: ${hasInstructions}`)
    console.log(`      - Total length: ${enhancedForAI.length} chars`)
    
    // 4. Integration mit API Route
    console.log('\n4️⃣ API Route Integration example...')
    console.log(`
   // In your app/api/chat/route.ts:
   
   export async function POST(req: Request) {
     const { message, ticker } = await req.json()
     
     // RAG Enhancement
     const enhancedPrompt = await enhancePromptWithRAG(
       message,
       ticker,
       'stock'
     )
     
     // Send to OpenAI with enhanced context
     const completion = await openai.chat.completions.create({
       model: "gpt-4",
       messages: [
         {
           role: "system", 
           content: "Du bist ein Finanzexperte mit Zugriff auf aktuelle Daten..."
         },
         {
           role: "user",
           content: enhancedPrompt  // ← RAG-enhanced prompt!
         }
       ]
     })
     
     return Response.json(completion.choices[0].message)
   }
    `)
    
    console.log('\n🎉 RAG Integration Test completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('   1. Load real data: npm run rag:ingest AAPL')
    console.log('   2. Update your chat API to use enhancePromptWithRAG()')
    console.log('   3. Test with real users!')
    
    return true
    
  } catch (error) {
    console.error('❌ RAG Integration test failed:', error)
    return false
  }
}

// Load real financial data for testing
async function loadTestData() {
  console.log('📈 Loading test financial data...\n')
  
  try {
    const { DataIngestionService, FinancialRAGSystem } = require('../src/lib/ragSystem')
    
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    
    const ingestion = new DataIngestionService(ragSystem)
    
    // Load data for key stocks
    const testTickers = ['AAPL', 'MSFT']
    
    console.log(`Loading earnings calls and news for: ${testTickers.join(', ')}`)
    console.log('This will take 2-3 minutes...\n')
    
    for (const ticker of testTickers) {
      console.log(`📊 Processing ${ticker}...`)
      
      // Load recent earnings calls (last 2 quarters)
      const currentYear = new Date().getFullYear()
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
      
      for (let i = 0; i < 2; i++) {
        let year = currentYear
        let quarter = currentQuarter - i
        
        if (quarter <= 0) {
          quarter += 4
          year -= 1
        }
        
        try {
          await ingestion.ingestEarningsCall(ticker, year, quarter)
          console.log(`   ✅ Earnings call Q${quarter} ${year}`)
        } catch (error) {
          console.log(`   ⚠️ No earnings call data for Q${quarter} ${year}`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
      }
      
      // Load recent news
      try {
        await ingestion.ingestNews(ticker, 10)
        console.log(`   ✅ Recent news articles`)
      } catch (error) {
        console.log(`   ⚠️ No news data available`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)) // Rate limiting
    }
    
    console.log('\n✅ Test data loaded successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Failed to load test data:', error)
    return false
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--load-data')) {
    await loadTestData()
  } else {
    await testRAGIntegration()
  }
}

if (require.main === module) {
  main()
}

export { testRAGIntegration, loadTestData }