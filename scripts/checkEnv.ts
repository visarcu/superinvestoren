// scripts/checkEnv.ts - Environment Variables Checker für RAG System
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

interface EnvCheck {
  key: string
  required: boolean
  description: string
  setup_url?: string
  validate?: (value: string) => boolean
}

const requiredEnvVars: EnvCheck[] = [
  {
    key: 'PINECONE_API_KEY',
    required: true,
    description: 'Pinecone Vector Database API Key',
    setup_url: 'https://app.pinecone.io',
    validate: (val) => val.startsWith('pk-') || val.startsWith('pcsk-')
  },
  {
    key: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API Key für Embeddings',
    setup_url: 'https://platform.openai.com/api-keys',
    validate: (val) => val.startsWith('sk-')
  },
  {
    key: 'FMP_API_KEY',
    required: false,
    description: 'Financial Modeling Prep API Key',
    setup_url: 'https://financialmodelingprep.com',
    validate: (val) => val.length > 10
  },
  {
    key: 'NEXT_PUBLIC_FMP_API_KEY',
    required: false,
    description: 'FMP API Key (Alternative Location)',
    setup_url: 'https://financialmodelingprep.com'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase Project URL',
    validate: (val) => val.includes('supabase.co')
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase Service Role Key',
    validate: (val) => val.startsWith('eyJ')
  }
]

function loadEnvFile(): Record<string, string> {
  const envVars: Record<string, string> = {}
  
  // Load from process.env first
  for (const envCheck of requiredEnvVars) {
    if (process.env[envCheck.key]) {
      envVars[envCheck.key] = process.env[envCheck.key]!
    }
  }
  
  // Try to load .env.local
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf8')
      const lines = envContent.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const equalIndex = trimmed.indexOf('=')
          const key = trimmed.substring(0, equalIndex).trim()
          const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '')
          
          if (key && value) {
            envVars[key] = value
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not read .env.local file')
  }
  
  return envVars
}

async function testPineconeConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.pinecone.io/indexes', {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })
    return response.ok
  } catch {
    return false
  }
}

async function testOpenAIConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    return response.ok
  } catch {
    return false
  }
}

async function testFMPConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey}`)
    return response.ok
  } catch {
    return false
  }
}

async function checkEnvironment(): Promise<void> {
  console.log('🔍 FinClue AI Environment Check\n')
  
  const envVars = loadEnvFile()
  let hasErrors = false
  let hasWarnings = false
  
  console.log('📋 Environment Variables Status:\n')
  
  // Check each required variable
  for (const envCheck of requiredEnvVars) {
    const value = envVars[envCheck.key]
    const hasValue = !!value
    
    let status = '❌'
    let message = 'Missing'
    
    if (hasValue) {
      if (envCheck.validate) {
        const isValid = envCheck.validate(value)
        if (isValid) {
          status = '✅'
          message = 'Valid'
        } else {
          status = '⚠️'
          message = 'Invalid format'
          hasWarnings = true
        }
      } else {
        status = '✅'
        message = 'Set'
      }
    } else if (envCheck.required) {
      hasErrors = true
    } else {
      status = '⚠️'
      message = 'Optional - not set'
      hasWarnings = true
    }
    
    console.log(`${status} ${envCheck.key}`)
    console.log(`   Description: ${envCheck.description}`)
    console.log(`   Status: ${message}`)
    if (envCheck.setup_url && !hasValue) {
      console.log(`   Setup: ${envCheck.setup_url}`)
    }
    console.log()
  }
  
  // Special check for FMP key (either location is fine)
  const hasFmpKey = envVars['FMP_API_KEY'] || envVars['NEXT_PUBLIC_FMP_API_KEY']
  if (!hasFmpKey) {
    console.log('⚠️ FMP API Key nicht gefunden (optional aber empfohlen)')
    console.log('   Für aktuelle News und Earnings Calls benötigt')
    console.log('   Setup: https://financialmodelingprep.com\n')
  }
  
  // Connection Tests
  console.log('🔗 API Connection Tests:\n')
  
  if (envVars['PINECONE_API_KEY']) {
    process.stdout.write('🧪 Testing Pinecone connection... ')
    const pineconeOk = await testPineconeConnection(envVars['PINECONE_API_KEY'])
    console.log(pineconeOk ? '✅ Connected' : '❌ Failed')
    if (!pineconeOk) hasErrors = true
  }
  
  if (envVars['OPENAI_API_KEY']) {
    process.stdout.write('🧪 Testing OpenAI connection... ')
    const openaiOk = await testOpenAIConnection(envVars['OPENAI_API_KEY'])
    console.log(openaiOk ? '✅ Connected' : '❌ Failed')
    if (!openaiOk) hasErrors = true
  }
  
  if (hasFmpKey) {
    const fmpKey = envVars['FMP_API_KEY'] || envVars['NEXT_PUBLIC_FMP_API_KEY']
    process.stdout.write('🧪 Testing FMP connection... ')
    const fmpOk = await testFMPConnection(fmpKey!)
    console.log(fmpOk ? '✅ Connected' : '❌ Failed')
    if (!fmpOk) hasWarnings = true
  }
  
  console.log()
  
  // File Structure Check
  console.log('📁 File Structure Check:\n')
  
  const requiredFiles = [
    'src/lib/ragSystem.ts',
    'scripts/setupRAG.ts',
    'scripts/statusRAG.ts',
    'scripts/ingestRAG.ts',
    'scripts/updateRAG.ts'
  ]
  
  for (const file of requiredFiles) {
    const exists = existsSync(resolve(process.cwd(), file))
    console.log(`${exists ? '✅' : '❌'} ${file}`)
    if (!exists) hasErrors = true
  }
  
  console.log()
  
  // Dependencies Check
  console.log('📦 Dependencies Check:\n')
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    const requiredDeps = [
      '@pinecone-database/pinecone',
      '@langchain/openai',
      '@langchain/pinecone',
      'langchain',
      'tsx'
    ]
    
    for (const dep of requiredDeps) {
      const installed = !!allDeps[dep]
      console.log(`${installed ? '✅' : '❌'} ${dep}`)
      if (!installed) hasErrors = true
    }
  } catch {
    console.log('❌ Could not read package.json')
    hasErrors = true
  }
  
  console.log()
  
  // Summary and Next Steps
  console.log('📊 SUMMARY:\n')
  
  if (hasErrors) {
    console.log('❌ CRITICAL ISSUES FOUND - RAG System wird nicht funktionieren')
    console.log('\n🔧 REQUIRED FIXES:')
    
    if (!envVars['PINECONE_API_KEY']) {
      console.log('1. Pinecone Setup:')
      console.log('   • Gehe zu https://app.pinecone.io')
      console.log('   • Erstelle kostenlosen Account')
      console.log('   • Erstelle Index: "finclue-financial-docs" (Dimension: 3072)')
      console.log('   • Füge PINECONE_API_KEY zu .env.local hinzu')
      console.log()
    }
    
    if (!envVars['OPENAI_API_KEY']) {
      console.log('2. OpenAI Setup:')
      console.log('   • Gehe zu https://platform.openai.com/api-keys')
      console.log('   • Erstelle neuen API Key')
      console.log('   • Füge OPENAI_API_KEY zu .env.local hinzu')
      console.log()
    }
    
    console.log('3. Nach Fixes ausführen:')
    console.log('   npm install @pinecone-database/pinecone @langchain/openai @langchain/pinecone langchain')
    console.log('   npm run rag:setup')
    
  } else if (hasWarnings) {
    console.log('⚠️ MINOR ISSUES - RAG System funktioniert mit Einschränkungen')
    console.log('\n💡 IMPROVEMENTS:')
    
    if (!hasFmpKey) {
      console.log('• FMP API Key für bessere Datenqualität:')
      console.log('  - Gehe zu https://financialmodelingprep.com')
      console.log('  - Erstelle Account (kostenlose Tier verfügbar)')
      console.log('  - Füge FMP_API_KEY zu .env.local hinzu')
      console.log()
    }
    
    console.log('• Ready to start: npm run rag:setup')
    
  } else {
    console.log('✅ ALL CHECKS PASSED - RAG System ready!')
    console.log('\n🚀 NEXT STEPS:')
    console.log('1. Initialize: npm run rag:setup')
    console.log('2. Add data: npm run rag:ingest AAPL MSFT GOOGL')
    console.log('3. Check status: npm run rag:status')
    console.log('4. Test in app: Frage nach Earnings Calls')
  }
  
  console.log('\n📚 DOCUMENTATION:')
  console.log('• Setup Guide: Siehe RAG Integration Guide')
  console.log('• Troubleshooting: npm run rag:status')
  console.log('• Monitoring: npm run rag:monitor')
  
  if (hasErrors) {
    process.exit(1)
  }
}

// Example .env.local template
function generateEnvTemplate(): void {
  console.log('📄 .env.local Template:\n')
  console.log('# FinClue AI Environment Variables')
  console.log('# Copy this template and fill in your actual keys')
  console.log('')
  console.log('# Pinecone Vector Database (Required)')
  console.log('PINECONE_API_KEY=pk-your-pinecone-key-here')
  console.log('')
  console.log('# OpenAI API (Required)')
  console.log('OPENAI_API_KEY=sk-your-openai-key-here')
  console.log('')
  console.log('# Financial Modeling Prep (Optional but recommended)')
  console.log('FMP_API_KEY=your-fmp-key-here')
  console.log('')
  console.log('# Supabase (Already configured)')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your-supabase-url')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-key')
  console.log('')
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--template')) {
    generateEnvTemplate()
  } else {
    await checkEnvironment()
  }
}

main().catch(console.error)