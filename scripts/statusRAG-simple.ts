// scripts/statusRAG-simple.ts - Einfacher Status Check
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manual .env.local loading
function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    
    console.log('📁 Loading .env.local manually...')
    
    let loaded = 0
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const equalIndex = trimmed.indexOf('=')
        const key = trimmed.substring(0, equalIndex).trim()
        const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '')
        
        if (key && value) {
          process.env[key] = value
          loaded++
          // Debug: Log key loading (without value)
          if (key.includes('API_KEY')) {
            console.log(`   Loaded: ${key}`)
          }
        }
      }
    }
    
    console.log(`✅ Loaded ${loaded} environment variables`)
    return true
  } catch (error: any) {
    console.log('❌ Could not load .env.local:', error?.message || error)
    return false
  }
}

// Load environment
loadEnvFile()

// Check environment variables
console.log('\n🔍 Environment Check:')
const keys = ['OPENAI_API_KEY', 'FMP_API_KEY', 'NEXT_PUBLIC_FMP_API_KEY', 'PINECONE_API_KEY']

keys.forEach(key => {
  const exists = !!process.env[key]
  const status = exists ? '✅' : '❌'
  const value = exists ? 'Set' : 'Missing'
  console.log(`   ${status} ${key}: ${value}`)
})

// Check if we have the minimum required keys
const hasOpenAI = !!process.env.OPENAI_API_KEY
const hasFMP = !!(process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY)
const hasPinecone = !!process.env.PINECONE_API_KEY

console.log('\n📊 Summary:')
console.log(`   OpenAI: ${hasOpenAI ? '✅' : '❌'}`)
console.log(`   FMP: ${hasFMP ? '✅' : '❌'}`)
console.log(`   Pinecone: ${hasPinecone ? '✅' : '❌'}`)

if (hasOpenAI && hasFMP && hasPinecone) {
  console.log('\n🚀 All API keys available! Ready for RAG setup.')
} else if (hasOpenAI && hasFMP) {
  console.log('\n🎯 Almost ready! Only Pinecone API key missing.')
  console.log('   Next step: Create Pinecone account at https://app.pinecone.io')
} else {
  console.log('\n⚠️ Some API keys are missing.')
}

// Test basic imports
console.log('\n🧪 Testing imports...')
try {
  const { FinancialRAGSystem } = await import('../src/lib/ragSystem.js')
  console.log('✅ ragSystem import successful')
  
  if (hasPinecone) {
    console.log('🔗 Testing Pinecone connection...')
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')
    console.log('✅ Pinecone connection successful!')
  } else {
    console.log('⏭️ Skipping Pinecone test (API key missing)')
  }
  
} catch (error: any) {
  console.log('❌ Import/connection error:', error?.message || error)
}