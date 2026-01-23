// src/lib/ragOptimized.ts - Performance-optimierte RAG System Version
import { OpenAIEmbeddings } from "@langchain/openai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { Document } from "@langchain/core/documents"

// Interface Definitionen
interface FinancialDocument {
  id: string
  type: 'earnings_call' | 'sec_filing' | 'news' | 'research_report' | 'press_release'
  ticker: string
  title: string
  content: string
  date: string
  source: string
  metadata: {
    quarter?: string
    year?: number
    filing_type?: string
    page_number?: number
    section?: string
    // SEC Filing specific
    cik?: string
    // Earnings Call specific
    participants?: string[]
    // News specific
    author?: string
    sentiment?: string | null
    tags?: string[]
    // Additional flexible metadata
    [key: string]: any
  }
}

interface RAGQuery {
  query: string
  ticker?: string
  document_types?: string[]
  date_range?: {
    start: string
    end: string
  }
  limit?: number
}

interface RAGResult {
  content: string
  source: string
  relevance_score: number
  metadata: Record<string, any>
}

// Performance & Caching
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000

  set(key: string, data: any, ttlMs: number = 300000): void { // 5min default
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Circuit Breaker Pattern
class CircuitBreaker {
  private failures = 0
  private nextAttempt = 0
  private timeout = 60000 // 1 minute
  
  constructor(private maxFailures = 5) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open')
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private isOpen(): boolean {
    return this.failures >= this.maxFailures && Date.now() < this.nextAttempt
  }

  private onSuccess(): void {
    this.failures = 0
    this.nextAttempt = 0
  }

  private onFailure(): void {
    this.failures++
    this.nextAttempt = Date.now() + this.timeout
  }

  getStatus(): { failures: number, isOpen: boolean, nextAttempt: number } {
    return {
      failures: this.failures,
      isOpen: this.isOpen(),
      nextAttempt: this.nextAttempt
    }
  }
}

// Enhanced RAG System with Performance Optimizations
export class OptimizedFinancialRAGSystem {
  private pinecone: Pinecone
  private embeddings: OpenAIEmbeddings
  private vectorStore: PineconeStore | null = null
  private textSplitter: RecursiveCharacterTextSplitter
  private cache = new SimpleCache()
  private circuitBreaker = new CircuitBreaker(3)
  private connectionPool = new Map<string, Promise<any>>()

  constructor() {
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      throw new Error('Required environment variables missing')
    }

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    })

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-large",
      maxRetries: 3,
      timeout: 30000,
    })

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""],
    })
  }

  async initialize(indexName: string = "finclue-financial-docs"): Promise<void> {
    const cacheKey = `vectorstore_${indexName}`
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      this.vectorStore = cached
      return
    }

    try {
      await this.circuitBreaker.execute(async () => {
        const pineconeIndex = this.pinecone.Index(indexName)
        
        this.vectorStore = await PineconeStore.fromExistingIndex(
          this.embeddings,
          {
            pineconeIndex,
            textKey: "text",
            namespace: "financial-documents",
          }
        )
        
        // Cache the connection
        this.cache.set(cacheKey, this.vectorStore, 600000) // 10min cache
        console.log(`✅ RAG System initialized and cached for ${indexName}`)
      })
    } catch (error) {
      console.error('RAG System initialization failed:', error)
      throw new Error(`Failed to initialize RAG system: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async addDocument(doc: FinancialDocument): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('RAG System not initialized')
    }

    const cacheKey = `doc_${doc.id}`
    if (this.cache.get(cacheKey)) {
      console.log(`Document ${doc.id} already processed (cached)`)
      return
    }

    try {
      await this.circuitBreaker.execute(async () => {
        // Validate document
        if (!doc.content || doc.content.length < 50) {
          throw new Error(`Document ${doc.id} has insufficient content`)
        }

        // Split document with error handling
        const chunks = await this.textSplitter.splitText(doc.content)
        if (chunks.length === 0) {
          throw new Error(`Document ${doc.id} produced no chunks`)
        }

        // Create documents with enhanced metadata
        const documents: Document[] = chunks.map((chunk: string, index: number) => new Document({
          pageContent: chunk,
          metadata: {
            ...doc.metadata,
            id: doc.id,
            type: doc.type,
            ticker: doc.ticker,
            title: doc.title,
            date: doc.date,
            source: doc.source,
            chunk_index: index,
            total_chunks: chunks.length,
            chunk_length: chunk.length,
            processed_at: new Date().toISOString()
          }
        }))

        // Batch processing for better performance
        const batchSize = 10
        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize)
          await this.vectorStore!.addDocuments(batch)
          
          // Small delay between batches to avoid rate limits
          if (i + batchSize < documents.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        // Cache successful processing
        this.cache.set(cacheKey, true, 3600000) // 1 hour cache
        console.log(`✅ Added ${documents.length} chunks for ${doc.id}`)
      })
    } catch (error) {
      console.error(`Failed to add document ${doc.id}:`, error)
      throw error
    }
  }

  async search(query: RAGQuery): Promise<RAGResult[]> {
    if (!this.vectorStore) {
      throw new Error('RAG System not initialized')
    }

    // Cache key includes all query parameters
    const cacheKey = `search_${JSON.stringify(query)}`
    const cached = this.cache.get(cacheKey)
    if (cached) {
      console.log('Returning cached search results')
      return cached
    }

    try {
      const results = await this.circuitBreaker.execute(async () => {
        const { query: searchQuery, ticker, document_types, date_range, limit = 10 } = query

        // Enhanced metadata filter with error handling
        const filter: Record<string, any> = {}
        
        if (ticker) {
          filter.ticker = { $eq: ticker.toUpperCase() }
        }
        
        if (document_types && document_types.length > 0) {
          filter.type = { $in: document_types }
        }
        
        if (date_range) {
          try {
            filter.date = {
              $gte: date_range.start,
              $lte: date_range.end
            }
          } catch (dateError) {
            console.warn('Invalid date range in query:', date_range)
          }
        }

        // Perform search with timeout
        const searchPromise = this.vectorStore!.similaritySearchWithScore(
          searchQuery,
          Math.min(limit, 50), // Cap at 50 results max
          Object.keys(filter).length > 0 ? filter : undefined
        )

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Search timeout')), 30000)
        )

        const searchResults = await Promise.race([searchPromise, timeoutPromise])

        // Post-process and enhance results
        const enhancedResults: RAGResult[] = searchResults.map(([doc, score]: [Document, number]) => ({
          content: doc.pageContent,
          source: `${doc.metadata.title} - ${doc.metadata.source}`,
          relevance_score: score,
          metadata: {
            ...doc.metadata,
            search_score: score,
            search_timestamp: new Date().toISOString()
          }
        }))

        // Filter out low relevance results
        const filteredResults = enhancedResults.filter(r => r.relevance_score > 0.1)

        return filteredResults
      })

      // Cache successful results
      this.cache.set(cacheKey, results, 300000) // 5min cache for search results
      return results

    } catch (error) {
      console.error('Search error:', error)
      
      // Return graceful fallback instead of throwing
      return [{
        content: `Search temporarily unavailable. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'RAG System Error',
        relevance_score: 0,
        metadata: { error: true, timestamp: new Date().toISOString() }
      }]
    }
  }

  async getContextForPrompt(query: string, ticker?: string): Promise<{ context: string, sources: string[], cached: boolean }> {
    const cacheKey = `context_${query}_${ticker || 'global'}`
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      return { ...cached, cached: true }
    }

    try {
      const ragQuery: RAGQuery = {
        query,
        ticker,
        limit: 5
      }

      const results = await this.search(ragQuery)
      
      if (results.length === 0 || results[0].metadata?.error) {
        const fallbackContext = {
          context: "No relevant documents found or search temporarily unavailable.",
          sources: [],
          cached: false
        }
        
        // Short cache for fallback to avoid repeated failures
        this.cache.set(cacheKey, fallbackContext, 60000) // 1min cache
        return fallbackContext
      }

      let context = "\n=== RELEVANTE FINANZDOKUMENTE ===\n\n"
      const sources: string[] = []
      
      results.forEach((result, index) => {
        if (result.relevance_score > 0.3) { // Only include relevant results
          context += `${index + 1}. Quelle: ${result.source}\n`
          context += `   Relevanz: ${(result.relevance_score * 100).toFixed(1)}%\n`
          context += `   Inhalt: ${result.content.substring(0, 500)}...\n\n`
          sources.push(result.source)
        }
      })

      context += "=== ENDE DOKUMENTE ===\n\n"
      context += "WICHTIG: Nutze diese Dokumente für akkurate, quellenbasierte Antworten. Erwähne die Quellen wenn du Informationen daraus verwendest.\n\n"

      const contextResult = { context, sources, cached: false }
      
      // Cache successful context
      this.cache.set(cacheKey, contextResult, 300000) // 5min cache
      return contextResult

    } catch (error) {
      console.error('Context generation error:', error)
      
      return {
        context: "Context generation temporarily unavailable.",
        sources: [],
        cached: false
      }
    }
  }

  // Performance monitoring
  getPerformanceMetrics(): {
    cacheSize: number
    circuitBreakerStatus: any
    connectionPoolSize: number
  } {
    return {
      cacheSize: this.cache.size(),
      circuitBreakerStatus: this.circuitBreaker.getStatus(),
      connectionPoolSize: this.connectionPool.size
    }
  }

  // Cache management
  clearCache(): void {
    this.cache.clear()
    console.log('RAG System cache cleared')
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: any
  }> {
    try {
      if (!this.vectorStore) {
        return { status: 'unhealthy', details: { error: 'Not initialized' } }
      }

      // Quick search test
      const testResults = await this.search({
        query: 'test health check',
        limit: 1
      })

      const circuitStatus = this.circuitBreaker.getStatus()
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      
      if (circuitStatus.isOpen) {
        status = 'unhealthy'
      } else if (circuitStatus.failures > 0 || testResults.length === 0) {
        status = 'degraded'
      }

      return {
        status,
        details: {
          circuitBreaker: circuitStatus,
          cache: { size: this.cache.size() },
          lastTest: testResults.length > 0
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

// Enhanced Data Ingestion with Error Handling
export class OptimizedDataIngestionService {
  private ragSystem: OptimizedFinancialRAGSystem
  private rateLimiter = new Map<string, number>()

  constructor(ragSystem: OptimizedFinancialRAGSystem) {
    this.ragSystem = ragSystem
  }

  private async rateLimit(key: string, limitMs: number = 1000): Promise<void> {
    const now = Date.now()
    const last = this.rateLimiter.get(key) || 0
    const wait = limitMs - (now - last)
    
    if (wait > 0) {
      await new Promise(resolve => setTimeout(resolve, wait))
    }
    
    this.rateLimiter.set(key, Date.now())
  }

  private getFmpApiKey(): string {
    const key = process.env.FMP_API_KEY
    if (!key) {
      throw new Error('FMP API Key not found')
    }
    return key
  }

  async ingestEarningsCall(ticker: string, year: number, quarter: number): Promise<void> {
    const jobId = `earnings_${ticker}_${year}_${quarter}`
    
    try {
      await this.rateLimit(jobId, 2000) // 2 second rate limit
      
      const apiKey = this.getFmpApiKey()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v4/earning_call_transcript/${ticker}?year=${year}&quarter=${quarter}&apikey=${apiKey}`,
          { 
            signal: controller.signal,
            headers: { 'User-Agent': 'Finclue-App/1.0' }
          }
        )
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded - try again later')
          }
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data && data[0] && data[0].content && data[0].content.length > 100) {
          const document = await DocumentProcessor.processEarningsCall({
            ticker,
            company_name: data[0].company || ticker,
            quarter,
            year,
            call_date: data[0].date,
            management_remarks: data[0].content?.split('Questions and Answers')[0] || '',
            qa_session: data[0].content?.split('Questions and Answers')[1] || '',
            participants: []
          })

          await this.ragSystem.addDocument(document)
          console.log(`✅ Ingested earnings call: ${ticker} Q${quarter} ${year}`)
        } else {
          console.warn(`⚠️ No valid earnings call data for ${ticker} Q${quarter} ${year}`)
        }
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏰ Timeout ingesting earnings call for ${ticker} Q${quarter} ${year}`)
      } else {
        console.error(`❌ Error ingesting earnings call for ${ticker} Q${quarter} ${year}:`, error)
      }
      throw error
    }
  }

  async ingestNews(ticker: string, limit: number = 50): Promise<void> {
    const jobId = `news_${ticker}_${Date.now()}`
    
    try {
      await this.rateLimit(jobId, 1500) // 1.5 second rate limit
      
      const apiKey = this.getFmpApiKey()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout
      
      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/stock_news?tickers=${ticker}&limit=${limit}&apikey=${apiKey}`,
          { 
            signal: controller.signal,
            headers: { 'User-Agent': 'Finclue-App/1.0' }
          }
        )
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`News API error: ${response.status}`)
        }
        
        const articles = await response.json()
        
        let ingestedCount = 0
        const maxArticles = Math.min(articles.length, 20) // Limit to prevent overload
        
        for (let i = 0; i < maxArticles; i++) {
          const article = articles[i]
          
          if (article.text && article.text.length > 100) {
            try {
              const document = await DocumentProcessor.processNewsArticle({
                id: article.url.replace(/[^a-zA-Z0-9]/g, '_'),
                ticker,
                title: article.title,
                content: article.text,
                published_date: article.publishedDate,
                source: article.site,
                author: '',
                sentiment: null,
                tags: []
              })

              await this.ragSystem.addDocument(document)
              ingestedCount++
              
              // Rate limiting between articles
              if (i < maxArticles - 1) {
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            } catch (articleError) {
              console.warn(`⚠️ Failed to process article ${i} for ${ticker}:`, articleError)
            }
          }
        }
        
        console.log(`✅ Ingested ${ingestedCount} news articles for ${ticker}`)
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      console.error(`❌ Error ingesting news for ${ticker}:`, error)
      throw error
    }
  }

  async batchIngest(tickers: string[], options: {
    earningsQuarters?: number
    newsLimit?: number
    maxConcurrency?: number
  } = {}): Promise<void> {
    const { earningsQuarters = 4, newsLimit = 20, maxConcurrency = 2 } = options
    
    console.log(`🚀 Starting batch ingestion for ${tickers.length} tickers (concurrency: ${maxConcurrency})`)
    
    // Process tickers with controlled concurrency
    for (let i = 0; i < tickers.length; i += maxConcurrency) {
      const batch = tickers.slice(i, i + maxConcurrency)
      
      await Promise.allSettled(
        batch.map(async (ticker) => {
          try {
            console.log(`📈 Processing ${ticker}...`)
            
            // Ingest earnings calls
            const currentYear = new Date().getFullYear()
            const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
            
            for (let q = 0; q < earningsQuarters; q++) {
              let year = currentYear
              let quarter = currentQuarter - q
              
              if (quarter <= 0) {
                quarter += 4
                year -= 1
              }
              
              if (year >= 2022) {
                try {
                  await this.ingestEarningsCall(ticker, year, quarter)
                } catch (earningsError) {
                  console.warn(`⚠️ Earnings call failed for ${ticker} Q${quarter} ${year}`)
                }
              }
            }

            // Ingest news
            try {
              await this.ingestNews(ticker, newsLimit)
            } catch (newsError) {
              console.warn(`⚠️ News ingestion failed for ${ticker}`)
            }
            
            console.log(`✅ Completed processing ${ticker}`)
          } catch (error) {
            console.error(`❌ Batch processing failed for ${ticker}:`, error)
          }
        })
      )
      
      // Pause between batches
      if (i + maxConcurrency < tickers.length) {
        console.log('⏳ Pausing between batches...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
    console.log('🎉 Batch ingestion completed')
  }
}

// Document Processors
export class DocumentProcessor {
  
  // Process SEC 10-K filing
  static async process10K(filing: {
    ticker: string
    company_name: string
    year: number
    filing_date: string
    cik: string
    business_section?: string
    risk_factors?: string
    financial_statements?: string
    md_a?: string
  }): Promise<FinancialDocument> {
    // Extract key sections from 10-K
    const sections = {
      business: filing.business_section || "",
      risk_factors: filing.risk_factors || "",
      financial_statements: filing.financial_statements || "",
      management_discussion: filing.md_a || ""
    }

    const content = Object.values(sections).join("\n\n")
    
    return {
      id: `10k_${filing.ticker}_${filing.year}`,
      type: 'sec_filing',
      ticker: filing.ticker,
      title: `10-K Filing - ${filing.company_name} (${filing.year})`,
      content,
      date: filing.filing_date,
      source: `SEC EDGAR - 10-K`,
      metadata: {
        year: filing.year,
        filing_type: '10-K',
        cik: filing.cik
      }
    }
  }

  // Process earnings call transcript
  static async processEarningsCall(transcript: {
    ticker: string
    company_name: string
    quarter: number
    year: number
    call_date: string
    management_remarks: string
    qa_session: string
    participants: string[]
  }): Promise<FinancialDocument> {
    // Structure: Management Remarks + Q&A
    const content = `
MANAGEMENT REMARKS:
${transcript.management_remarks}

Q&A SESSION:
${transcript.qa_session}
    `.trim()

    return {
      id: `earnings_${transcript.ticker}_${transcript.quarter}_${transcript.year}`,
      type: 'earnings_call',
      ticker: transcript.ticker,
      title: `Earnings Call - ${transcript.company_name} Q${transcript.quarter} ${transcript.year}`,
      content,
      date: transcript.call_date,
      source: `Earnings Call Transcript`,
      metadata: {
        quarter: `Q${transcript.quarter}`,
        year: transcript.year,
        participants: transcript.participants
      }
    }
  }

  // Process news article
  static async processNewsArticle(article: {
    id: string
    ticker?: string
    title: string
    content: string
    published_date: string
    source: string
    author?: string
    sentiment?: string | null
    tags?: string[]
  }): Promise<FinancialDocument> {
    return {
      id: `news_${article.id}`,
      type: 'news',
      ticker: article.ticker || '',
      title: article.title,
      content: article.content,
      date: article.published_date,
      source: article.source,
      metadata: {
        author: article.author,
        sentiment: article.sentiment,
        tags: article.tags || []
      }
    }
  }
}

// Export optimized versions
export { SimpleCache, CircuitBreaker }