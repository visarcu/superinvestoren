// src/app/api/admin/rag/health/route.ts - RAG System Health Check API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FinancialRAGSystem } from '@/lib/ragSystem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface HealthCheck {
  status: 'healthy' | 'warning' | 'critical'
  score: number
  checks: {
    pineconeConnection: boolean
    openaiConnection: boolean
    fmpConnection: boolean
    documentCount: number
    avgRelevanceScore: number
    indexStatus: string
    lastUpdate: string | null
  }
  recommendations: string[]
  metrics: {
    totalDocuments: number
    documentsPerTicker: Record<string, number>
    documentsPerType: Record<string, number>
    avgRelevanceScore: number
    coverageScore: number
  }
}

// Rate limiting for health checks
const healthCheckLimiter = new Map<string, number>()

async function verifyAdminAccess(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { error: 'No authorization header', status: 401 }
    }

    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { error: 'Invalid token', status: 401 }
    }

    // Check admin status (adjust based on your admin system)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_premium')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin && !profile?.is_premium) {
      return { error: 'Admin access required', status: 403 }
    }

    return { user, isAdmin: profile?.is_admin || false }
  } catch (error) {
    console.error('Admin verification failed:', error)
    return { error: 'Authentication failed', status: 500 }
  }
}

async function testPineconeConnection(): Promise<boolean> {
  try {
    if (!process.env.PINECONE_API_KEY) return false
    
    const response = await fetch('https://api.pinecone.io/indexes', {
      headers: {
        'Api-Key': process.env.PINECONE_API_KEY,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch {
    return false
  }
}

async function testOpenAIConnection(): Promise<boolean> {
  try {
    if (!process.env.OPENAI_API_KEY) return false
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch {
    return false
  }
}

async function testFMPConnection(): Promise<boolean> {
  try {
    const fmpKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY
    if (!fmpKey) return false
    
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${fmpKey}`,
      { signal: AbortSignal.timeout(5000) }
    )
    return response.ok
  } catch {
    return false
  }
}

async function performRAGHealthCheck(): Promise<HealthCheck> {
  const checks = {
    pineconeConnection: false,
    openaiConnection: false,
    fmpConnection: false,
    documentCount: 0,
    avgRelevanceScore: 0,
    indexStatus: 'unknown',
    lastUpdate: null as string | null
  }

  const recommendations: string[] = []
  const metrics = {
    totalDocuments: 0,
    documentsPerTicker: {} as Record<string, number>,
    documentsPerType: {} as Record<string, number>,
    avgRelevanceScore: 0,
    coverageScore: 0
  }

  // Test external connections
  console.log('Testing external connections...')
  const [pineconeOk, openaiOk, fmpOk] = await Promise.all([
    testPineconeConnection(),
    testOpenAIConnection(),
    testFMPConnection()
  ])

  checks.pineconeConnection = pineconeOk
  checks.openaiConnection = openaiOk
  checks.fmpConnection = fmpOk

  if (!pineconeOk) {
    recommendations.push('Pinecone connection failed - check API key and network access')
  }
  if (!openaiOk) {
    recommendations.push('OpenAI connection failed - check API key and quota')
  }
  if (!fmpOk) {
    recommendations.push('FMP connection failed - check API key or consider upgrading plan')
  }

  // Test RAG system if connections are available
  if (pineconeOk && openaiOk) {
    try {
      console.log('Testing RAG system...')
      const ragSystem = new FinancialRAGSystem()
      await ragSystem.initialize('finclue-financial-docs')
      
      checks.indexStatus = 'connected'

      // Test queries to assess performance
      const testQueries = [
        'earnings revenue quarterly results',
        'Apple iPhone sales revenue',
        'Microsoft cloud Azure growth',
        'Tesla deliveries production',
        'dividend payout yield'
      ]

      let totalResults = 0
      let totalRelevanceSum = 0
      let queryCount = 0

      for (const query of testQueries) {
        try {
          const results = await ragSystem.search({
            query,
            limit: 10
          })

          totalResults += results.length
          
          if (results.length > 0) {
            const avgRelevance = results.reduce((sum, r) => sum + r.relevance_score, 0) / results.length
            totalRelevanceSum += avgRelevance
            queryCount++

            // Count document types and tickers
            results.forEach(result => {
              const type = result.metadata.type || 'unknown'
              const ticker = result.metadata.ticker || 'unknown'
              
              metrics.documentsPerType[type] = (metrics.documentsPerType[type] || 0) + 1
              metrics.documentsPerTicker[ticker] = (metrics.documentsPerTicker[ticker] || 0) + 1
            })
          }

          // Rate limiting between queries
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (queryError) {
          console.warn('Query failed:', query, queryError)
        }
      }

      checks.documentCount = totalResults / testQueries.length
      checks.avgRelevanceScore = queryCount > 0 ? totalRelevanceSum / queryCount : 0
      
      metrics.totalDocuments = Object.values(metrics.documentsPerType).reduce((sum, count) => sum + count, 0)
      metrics.avgRelevanceScore = checks.avgRelevanceScore
      metrics.coverageScore = Math.min(Object.keys(metrics.documentsPerTicker).length / 20, 1) // Max score at 20+ tickers

      // Performance recommendations
      if (checks.avgRelevanceScore < 0.6) {
        recommendations.push('Low relevance scores - consider improving document quality or chunk strategy')
      }
      if (checks.documentCount < 5) {
        recommendations.push('Few documents available - run data ingestion for more tickers')
      }
      if (Object.keys(metrics.documentsPerTicker).length < 10) {
        recommendations.push('Limited ticker coverage - add more major stocks')
      }
      if (!metrics.documentsPerType['earnings_call']) {
        recommendations.push('No earnings call data - run earnings ingestion')
      }
      if (!metrics.documentsPerType['news']) {
        recommendations.push('No news data - run news ingestion')
      }

      // Set last update time (mock - you might store this in a database)
      checks.lastUpdate = new Date().toISOString()

    } catch (ragError) {
      console.error('RAG system test failed:', ragError)
      checks.indexStatus = 'error'
      recommendations.push(`RAG system error: ${ragError instanceof Error ? ragError.message : 'unknown error'}`)
    }
  } else {
    checks.indexStatus = 'disconnected'
    recommendations.push('Cannot test RAG system - connection failures prevent initialization')
  }

  // Calculate overall health score
  const healthFactors = {
    connections: (Number(checks.pineconeConnection) + Number(checks.openaiConnection)) / 2,
    documents: Math.min(checks.documentCount / 10, 1), // Max score at 10+ avg docs per query
    relevance: checks.avgRelevanceScore,
    coverage: metrics.coverageScore
  }

  const score = Object.values(healthFactors).reduce((sum, factor) => sum + factor, 0) / Object.keys(healthFactors).length

  let status: 'healthy' | 'warning' | 'critical' = 'healthy'
  if (score < 0.5) status = 'critical'
  else if (score < 0.8) status = 'warning'

  if (recommendations.length === 0) {
    recommendations.push('RAG system is operating optimally')
  }

  return {
    status,
    score,
    checks,
    recommendations,
    metrics
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const lastCheck = healthCheckLimiter.get(ip) || 0
    
    if (now - lastCheck < 30000) { // 30 second cooldown
      return NextResponse.json(
        { error: 'Rate limited - wait 30 seconds between health checks' },
        { status: 429 }
      )
    }
    
    healthCheckLimiter.set(ip, now)

    // Verify admin access
    const authResult = await verifyAdminAccess(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    console.log('Starting RAG health check...')
    const healthCheck = await performRAGHealthCheck()
    
    console.log(`Health check completed - Status: ${healthCheck.status}, Score: ${(healthCheck.score * 100).toFixed(1)}%`)

    return NextResponse.json({
      success: true,
      health: healthCheck,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      health: {
        status: 'critical',
        score: 0,
        checks: {
          pineconeConnection: false,
          openaiConnection: false,
          fmpConnection: false,
          documentCount: 0,
          avgRelevanceScore: 0,
          indexStatus: 'error',
          lastUpdate: null
        },
        recommendations: ['Health check system error - check logs'],
        metrics: {
          totalDocuments: 0,
          documentsPerTicker: {},
          documentsPerType: {},
          avgRelevanceScore: 0,
          coverageScore: 0
        }
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Same as GET but allows triggering a fresh health check
  return GET(request)
}