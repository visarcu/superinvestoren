import { FinancialRAGSystem, DataIngestionService } from '../src/lib/ragSystem'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load Environment Variables
function loadEnv() {
    const envPath = resolve(process.cwd(), '.env.local')
    if (!existsSync(envPath)) return false

    const content = readFileSync(envPath, 'utf8')
    content.split('\n').forEach(line => {
        const [key, ...val] = line.split('=')
        if (key && val.length > 0) {
            process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '')
        }
    })
    return true
}

async function getPopularStocks(): Promise<string[]> {
    console.log('📊 Fetching popular stocks from Supabase...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Missing Supabase credentials, falling back to static list.')
        return []
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase
        .from('watchlists')
        .select('ticker')

    if (error || !data) {
        console.error('❌ Error fetching watchlists:', error)
        return []
    }

    // Count tickers
    const counts = new Map<string, number>()
    data.forEach(item => {
        const t = item.ticker.toUpperCase()
        counts.set(t, (counts.get(t) || 0) + 1)
    })

    // Sort and take top 30
    return Array.from(counts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 30)
        .map(([ticker]) => ticker)
}

async function automate() {
    console.log('🚀 Starting Automated RAG Ingestion...\n')

    if (!loadEnv()) {
        console.error('❌ .env.local not found')
        process.exit(1)
    }

    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize('finclue-financial-docs')

    const ingestion = new DataIngestionService(ragSystem)

    // 1. Core "Must-Have" stocks
    const coreUniverse = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'BRK-B', 'AVGO'
    ]

    // 2. Dynamic Popular stocks
    const popularStocks = await getPopularStocks()

    // Combine and remove duplicates
    const finalUniverse = Array.from(new Set([...coreUniverse, ...popularStocks]))

    console.log(`📊 Processing final universe: ${finalUniverse.length} stocks (${popularStocks.length} from DB popularity)`)

    try {
        await ingestion.batchIngest(finalUniverse)
        console.log('\n✅ Automation completed successfully!')
    } catch (error) {
        console.error('\n❌ Automation failed:', error)
        process.exit(1)
    }
}

automate()
