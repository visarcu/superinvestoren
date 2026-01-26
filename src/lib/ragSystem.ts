// src/lib/ragSystem.ts - Complete Financial RAG System Implementation

import { OpenAIEmbeddings } from "@langchain/openai"
import { PineconeStore } from "@langchain/pinecone"
import { Pinecone } from "@pinecone-database/pinecone"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { Document } from "@langchain/core/documents"
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manual .env.local loading für Scripts (nicht für Next.js)
function loadEnvIfNeeded() {
  // Only load if running from scripts (not Next.js)
  if (typeof window === 'undefined' && !process.env.NEXT_RUNTIME) {
    try {
      const envPath = resolve(process.cwd(), '.env.local')
      const envContent = readFileSync(envPath, 'utf8')

      const lines = envContent.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const equalIndex = trimmed.indexOf('=')
          const key = trimmed.substring(0, equalIndex).trim()
          const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '')

          if (key && value && !process.env[key]) {
            process.env[key] = value
          }
        }
      }
    } catch (error) {
      // Ignore - Next.js will handle env loading in app context
    }
  }
}

// Load environment if needed
loadEnvIfNeeded()

// Types
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

interface DocumentChunk {
  pageContent: string
  metadata: Record<string, any>
}

interface SearchResult {
  document: DocumentChunk
  score: number
}

// RAG System Class
export class FinancialRAGSystem {
  private pinecone: Pinecone
  private embeddings: OpenAIEmbeddings
  private vectorStore: PineconeStore | null = null
  private textSplitter: RecursiveCharacterTextSplitter

  constructor() {
    // Check for required environment variables
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required')
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required')
    }

    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    })

    // Initialize OpenAI Embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-large", // Best embedding model
    })

    // Text splitter for chunking documents
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ".", "!", "?", ",", " ", ""],
    })
  }

  // Initialize vector store
  async initialize(indexName: string = "finclue-financial-docs"): Promise<void> {
    try {
      const pineconeIndex = this.pinecone.Index(indexName)

      this.vectorStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex,
          textKey: "text",
          namespace: "financial-documents", // Separate namespace for financial docs
        }
      )

      console.log(`RAG System initialized with index: ${indexName}`)
    } catch (error) {
      console.error('Error initializing RAG system:', error)
      throw error
    }
  }

  // Add document to vector store
  async addDocument(doc: FinancialDocument): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('RAG System not initialized. Call initialize() first.')
    }

    try {
      // Split document into chunks
      const chunks: string[] = await this.textSplitter.splitText(doc.content)

      // Create Langchain documents
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
          total_chunks: chunks.length
        }
      }))

      // Add to vector store
      await this.vectorStore.addDocuments(documents)

      console.log(`Added ${documents.length} chunks for document ${doc.id}`)
    } catch (error) {
      console.error(`Error adding document ${doc.id}:`, error)
      throw error
    }
  }

  // Search for relevant documents
  async search(query: RAGQuery): Promise<RAGResult[]> {
    if (!this.vectorStore) {
      throw new Error('RAG System not initialized. Call initialize() first.')
    }

    try {
      const { query: searchQuery, ticker, document_types, date_range, limit = 10 } = query

      // Build metadata filter
      const filter: Record<string, any> = {}

      if (ticker) {
        filter.ticker = { $eq: ticker }
      }

      if (document_types && document_types.length > 0) {
        filter.type = { $in: document_types }
      }

      if (date_range) {
        filter.date = {
          $gte: date_range.start,
          $lte: date_range.end
        }
      }

      // Perform similarity search
      const results = await this.vectorStore.similaritySearchWithScore(
        searchQuery,
        limit,
        Object.keys(filter).length > 0 ? filter : undefined
      )

      // Format results with proper typing
      return results.map(([doc, score]: [Document, number]): RAGResult => ({
        content: doc.pageContent,
        source: `${doc.metadata.title} - ${doc.metadata.source}`,
        relevance_score: score,
        metadata: doc.metadata
      }))

    } catch (error) {
      console.error('Error searching RAG system:', error)
      throw error
    }
  }

  // Get context for AI prompt
  async getContextForPrompt(query: string, ticker?: string): Promise<string> {
    const ragQuery: RAGQuery = {
      query,
      ticker,
      limit: 5 // Top 5 most relevant chunks
    }

    const results = await this.search(ragQuery)

    if (results.length === 0) {
      return "No relevant documents found."
    }

    let context = "RELEVANTE DOKUMENTE UND INFORMATIONEN:\n\n"

    results.forEach((result: RAGResult, index: number) => {
      context += `${index + 1}. Quelle: ${result.source}\n`
      context += `   Relevanz: ${(result.relevance_score * 100).toFixed(1)}%\n`
      context += `   Inhalt: ${result.content}\n\n`
    })

    return context
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

// RAG-Enhanced AI Prompt Builder
export class RAGPromptBuilder {
  private ragSystem: FinancialRAGSystem

  constructor(ragSystem: FinancialRAGSystem) {
    this.ragSystem = ragSystem
  }

  async buildEnhancedPrompt(
    originalPrompt: string,
    ticker?: string,
    analysisType: 'stock' | 'superinvestor' | 'general' = 'stock'
  ): Promise<string> {
    try {
      // Extract key queries from the user message
      const queries = this.extractQueries(originalPrompt)

      let ragContext = ""

      // Get relevant context for each query
      for (const query of queries) {
        const context = await this.ragSystem.getContextForPrompt(query, ticker)
        if (context && context !== "No relevant documents found.") {
          ragContext += context + "\n"
        }
      }

      // If we have relevant context, prepend it to the original prompt
      if (ragContext.trim()) {
        return `${ragContext}\n--- ORIGINAL PROMPT ---\n${originalPrompt}\n\nINSTRUCTIONS: Use the provided document context to give accurate, source-backed answers. Always cite sources when using information from the documents above.`
      }

      return originalPrompt
    } catch (error) {
      console.error('Error building RAG-enhanced prompt:', error)
      return originalPrompt // Fallback to original prompt
    }
  }

  private extractQueries(prompt: string): string[] {
    // Simple query extraction - could be enhanced with NLP
    const queries: string[] = []

    // Extract ticker mentions
    const tickerMatches = prompt.match(/\b[A-Z]{1,5}\b/g)
    if (tickerMatches) {
      queries.push(...tickerMatches.map((ticker: string) => `${ticker} company information`))
    }

    // Extract question patterns
    const questionWords = ['what', 'why', 'how', 'when', 'where', 'who']
    const sentences = prompt.split(/[.!?]+/)

    sentences.forEach((sentence: string) => {
      const lower = sentence.toLowerCase().trim()
      if (questionWords.some((word: string) => lower.startsWith(word))) {
        queries.push(sentence.trim())
      }
    })

    // Add the full prompt as a query
    queries.push(prompt)

    return queries.slice(0, 3) // Limit to 3 queries to avoid too many API calls
  }
}

// Usage in API Route
export async function enhancePromptWithRAG(
  originalPrompt: string,
  ticker?: string,
  analysisType: 'stock' | 'superinvestor' | 'general' = 'stock'
): Promise<string> {
  try {
    // Initialize RAG system
    const ragSystem = new FinancialRAGSystem()
    await ragSystem.initialize()

    // Build enhanced prompt
    const promptBuilder = new RAGPromptBuilder(ragSystem)
    const enhancedPrompt = await promptBuilder.buildEnhancedPrompt(
      originalPrompt,
      ticker,
      analysisType
    )

    return enhancedPrompt
  } catch (error) {
    console.error('RAG enhancement failed:', error)
    return originalPrompt // Fallback
  }
}

// Data Ingestion Service
export class DataIngestionService {
  private ragSystem: FinancialRAGSystem

  constructor(ragSystem: FinancialRAGSystem) {
    this.ragSystem = ragSystem
  }

  // Get FMP API Key (flexible - checks both locations)
  private getFmpApiKey(): string {
    const key = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY
    if (!key) {
      throw new Error('FMP API Key not found. Set FMP_API_KEY environment variable')
    }
    return key
  }

  // Ingest earnings calls from FMP
  async ingestEarningsCall(ticker: string, year: number, quarter: number): Promise<void> {
    try {
      const apiKey = this.getFmpApiKey()
      const response = await fetch(
        `https://financialmodelingprep.com/api/v4/earning_call_transcript/${ticker}?year=${year}&quarter=${quarter}&apikey=${apiKey}`
      )

      if (!response.ok) {
        console.warn(`No earnings call data for ${ticker} Q${quarter} ${year}`)
        return
      }

      const data = await response.json()
      if (data && data[0] && data[0].content) {
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
      }
    } catch (error) {
      console.error(`Error ingesting earnings call for ${ticker}:`, error)
    }
  }

  // Ingest recent news
  async ingestNews(ticker: string, limit: number = 50): Promise<void> {
    try {
      const apiKey = this.getFmpApiKey()
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/stock_news?tickers=${ticker}&limit=${limit}&apikey=${apiKey}`
      )

      if (!response.ok) {
        console.warn(`No news data for ${ticker}`)
        return
      }

      const articles = await response.json()

      let ingestedCount = 0
      for (const article of articles.slice(0, 20)) { // Limit to prevent quota issues
        if (article.text && article.text.length > 100) { // Only meaningful articles
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
        }
      }

      console.log(`✅ Ingested ${ingestedCount} news articles for ${ticker}`)
    } catch (error) {
      console.error(`Error ingesting news for ${ticker}:`, error)
    }
  }

  // Ingest SEC Filings from FMP
  async ingestSECFilings(ticker: string, limit: number = 3): Promise<void> {
    try {
      const apiKey = this.getFmpApiKey()
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/sec_filings/${ticker}?type=10-K&limit=${limit}&apikey=${apiKey}`
      )

      if (!response.ok) {
        console.warn(`No SEC filings found for ${ticker}`)
        return
      }

      const filings = await response.json()
      for (const filing of filings) {
        if (filing.fillingDate) {
          const document = await DocumentProcessor.process10K({
            ticker,
            company_name: ticker,
            year: new Date(filing.fillingDate).getFullYear(),
            filing_date: filing.fillingDate,
            cik: filing.cik,
            business_section: `Filing Link: ${filing.finalLink}\n\nSEC Filing Type: ${filing.type}`
          })

          await this.ragSystem.addDocument(document)
          console.log(`✅ Ingested SEC Filing: ${ticker} ${filing.type} (${filing.fillingDate})`)
        }
      }
    } catch (error) {
      console.error(`Error ingesting SEC filings for ${ticker}:`, error)
    }
  }

  // Batch ingestion for multiple tickers
  async batchIngest(tickers: string[]): Promise<void> {
    const currentYear = new Date().getFullYear()
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)

    for (const ticker of tickers) {
      console.log(`📈 Processing ${ticker}...`)

      // 1. Ingest recent earnings calls
      for (let i = 0; i < 4; i++) {
        let year = currentYear
        let quarter = currentQuarter - i
        if (quarter <= 0) {
          quarter += 4
          year -= 1
        }
        await this.ingestEarningsCall(ticker, year, quarter)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // 2. Ingest SEC Filings
      await this.ingestSECFilings(ticker, 1)

      // 3. Ingest recent news
      await this.ingestNews(ticker)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}