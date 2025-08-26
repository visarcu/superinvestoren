// src/components/FinclueAI.tsx - COMPLETE ENHANCED UNIFIED VERSION
import React, { useState, useRef, useEffect } from 'react'
import {
  PaperAirplaneIcon,
  SparklesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  charts?: ChartData[]
  actions?: QuickAction[]
  ragSources?: string[]
  ragEnabled?: boolean
}

interface ChartData {
  type: 'line' | 'bar' | 'comparison' | 'volume'
  title: string
  ticker: string
  period: string
  data: any[]
}

interface QuickAction {
  label: string
  action: string
  ticker?: string
  prompt: string
}

interface QuickPrompt {
  id: string
  title: string
  prompt: string
  icon: React.ComponentType<any>
  category: 'analysis' | 'market' | 'comparison'
}

// ✅ ENHANCED INTERFACE für Unified AI
interface FinClueAIProps {
  ticker?: string | null
  investor?: string | null
  portfolioData?: any
  initialMessage?: string
  showQuickPrompts?: boolean
  compactMode?: boolean
  isPremium: boolean
}

// ✅ ENHANCED SMART TICKER DETECTION FUNCTION
function extractTickerFromMessage(message: string): string | null {
  // Enhanced mapping von Unternehmensnamen zu Tickers
  const companyToTicker: Record<string, string> = {
    'apple': 'AAPL',
    'microsoft': 'MSFT', 
    'google': 'GOOGL',
    'alphabet': 'GOOGL',
    'amazon': 'AMZN',
    'tesla': 'TSLA',
    'nvidia': 'NVDA',
    'meta': 'META',
    'facebook': 'META',
    'netflix': 'NFLX',
    'adobe': 'ADBE',
    'salesforce': 'CRM',
    'oracle': 'ORCL',
    'intel': 'INTC',
    // ✅ ADDED: More comprehensive mapping
    'aapl': 'AAPL',
    'msft': 'MSFT',
    'tsla': 'TSLA',
    'nvda': 'NVDA',
    'googl': 'GOOGL',
    'amzn': 'AMZN',
    'nflx': 'NFLX'
  }

  // Teste Unternehmensnamen
  const lowerMessage = message.toLowerCase()
  for (const [company, ticker] of Object.entries(companyToTicker)) {
    if (lowerMessage.includes(company)) {
      console.log(`🎯 Smart Detection: ${company} -> ${ticker}`)
      return ticker
    }
  }

  // Teste direkte Ticker mit verbesserter Regex
  const tickerMatch = message.match(/\b([A-Z]{1,5})\b/g)
  if (tickerMatch) {
    const commonTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC']
    for (const ticker of tickerMatch) {
      if (commonTickers.includes(ticker)) {
        console.log(`🎯 Smart Detection: Direct ticker -> ${ticker}`)
        return ticker
      }
    }
  }

  return null
}

// ✅ ENHANCED INVESTOR DETECTION FUNCTION - Fixed to use correct API slugs
function extractInvestorFromMessage(message: string): string | null {
  const investorMentions: Record<string, string> = {
    'warren buffett': 'buffett',
    'buffett': 'buffett',
    'berkshire hathaway': 'buffett',
    'berkshire': 'buffett',
    'bill ackman': 'ackman',
    'ackman': 'ackman',
    'pershing square': 'ackman',
    'pershing': 'ackman',
    'ray dalio': 'dalio',
    'dalio': 'dalio',
    'bridgewater': 'dalio',
    'ken fisher': 'fisher',
    'fisher': 'fisher',
    'bill gates': 'gates',
    'gates': 'gates',
    'gates foundation': 'gates',
    'michael burry': 'burry',
    'burry': 'burry',
    'scion': 'burry',
    'carl icahn': 'icahn',
    'icahn': 'icahn'
  }

  const lowerMessage = message.toLowerCase()
  
  // Sort by length (longest first) to prioritize full names over partial matches
  const sortedMentions = Object.entries(investorMentions)
    .sort(([a], [b]) => b.length - a.length)
  
  for (const [mention, slug] of sortedMentions) {
    if (lowerMessage.includes(mention)) {
      console.log(`🎯 Smart Detection: ${mention} -> ${slug}`)
      return slug
    }
  }

  return null
}

// ✅ NEW: HYBRID CONTEXT DETECTION
function getHybridContext(ticker?: string | null, investor?: string | null, message?: string): {
  contextType: 'stock' | 'superinvestor' | 'hybrid' | 'general',
  detectedTicker: string | null,
  detectedInvestor: string | null,
  primaryContext: 'stock' | 'superinvestor' | 'general',
  effectiveTicker: string | null,
  effectiveInvestor: string | null
} {
  const detectedTicker = extractTickerFromMessage(message || '')
  const detectedInvestor = extractInvestorFromMessage(message || '')
  
  const effectiveTicker = ticker || detectedTicker
  const effectiveInvestor = investor || detectedInvestor
  
  // Determine context type
  let contextType: 'stock' | 'superinvestor' | 'hybrid' | 'general'
  let primaryContext: 'stock' | 'superinvestor' | 'general'
  
  if (effectiveTicker && effectiveInvestor) {
    contextType = 'hybrid'
    // Determine primary context based on explicit props vs detected
    if (ticker && !investor) {
      primaryContext = 'stock'
    } else if (investor && !ticker) {
      primaryContext = 'superinvestor'
    } else {
      // Both detected from message - analyze message intent
      const lowerMessage = (message || '').toLowerCase()
      if (lowerMessage.includes('portfolio') || lowerMessage.includes('käufe') || lowerMessage.includes('verkäufe') || 
          lowerMessage.includes('holdings') || lowerMessage.includes('positionen') || lowerMessage.includes('13f')) {
        primaryContext = 'superinvestor'
      } else if (lowerMessage.includes('quartal') || lowerMessage.includes('earnings') || lowerMessage.includes('umsatz') || 
                 lowerMessage.includes('kuv') || lowerMessage.includes('p/e') || lowerMessage.includes('bewertung')) {
        primaryContext = 'stock'
      } else {
        primaryContext = 'superinvestor' // Default for hybrid when unclear
      }
    }
  } else if (effectiveTicker) {
    contextType = 'stock'
    primaryContext = 'stock'
  } else if (effectiveInvestor) {
    contextType = 'superinvestor' 
    primaryContext = 'superinvestor'
  } else {
    contextType = 'general'
    primaryContext = 'general'
  }
  
  return {
    contextType,
    detectedTicker,
    detectedInvestor,
    primaryContext,
    effectiveTicker,
    effectiveInvestor
  }
}

// ✅ ENHANCED CONTEXT TYPE DETECTION
function getContextType(ticker?: string | null, investor?: string | null, message?: string): 'stock' | 'superinvestor' | 'general' {
  const hybridContext = getHybridContext(ticker, investor, message)
  
  // For compatibility, return single context
  if (hybridContext.contextType === 'hybrid') {
    return hybridContext.primaryContext as 'stock' | 'superinvestor' | 'general'
  }
  
  return hybridContext.contextType === 'general' ? 'general' : 
         hybridContext.contextType === 'stock' ? 'stock' : 'superinvestor'
}

// ✅ ENHANCED DYNAMIC QUICK PROMPTS based on context
function getContextualQuickPrompts(ticker?: string | null, investor?: string | null): QuickPrompt[] {
  const contextType = getContextType(ticker, investor)
  
  switch (contextType) {
    case 'stock':
      return [
        {
          id: 'stock-fundamentals',
          title: 'Fundamentalanalyse',
          prompt: ticker ? `Analysiere die fundamentalen Kennzahlen von ${ticker} und bewerte die Investmentqualität.` : 'Analysiere die fundamentalen Kennzahlen von {ticker} und bewerte die Investmentqualität.',
          icon: ChartBarIcon,
          category: 'analysis'
        },
        {
          id: 'stock-quarterly',
          title: 'Quartalszahlen',
          prompt: ticker ? `Wie waren die letzten Quartalsergebnisse von ${ticker}? Analyse der wichtigsten Entwicklungen.` : 'Analysiere die letzten Quartalszahlen von {ticker} und erkläre die wichtigsten Entwicklungen.',
          icon: DocumentTextIcon,
          category: 'analysis'
        },
        {
          id: 'stock-comparison',
          title: 'Marktvergleich',
          prompt: ticker ? `Vergleiche ${ticker} mit direkten Konkurrenten in der Branche.` : 'Vergleiche {ticker} mit den direkten Konkurrenten und bewerte die relative Stärke.',
          icon: ArrowTrendingUpIcon,
          category: 'comparison'
        },
        {
          id: 'stock-valuation',
          title: 'Bewertung',
          prompt: ticker ? `Ist ${ticker} aktuell fair bewertet? KUV, P/E, und andere Bewertungskennzahlen.` : 'Welche Hauptrisiken und Chancen siehst du bei einer Investition in {ticker}?',
          icon: CurrencyDollarIcon,
          category: 'analysis'
        }
      ]

    case 'superinvestor':
      return [
        {
          id: 'investor-strategy',
          title: 'Investment-Strategie',
          prompt: investor ? `Analysiere ${investor}s aktuelle Investmentstrategie basierend auf dem Portfolio.` : 'Analysiere die aktuelle Investmentstrategie des Investors.',
          icon: ChartBarIcon,
          category: 'analysis'
        },
        {
          id: 'investor-changes',
          title: 'Portfolio-Änderungen',
          prompt: investor ? `Was waren die wichtigsten Portfolio-Änderungen von ${investor} im letzten Quartal?` : 'Was waren die wichtigsten Portfolio-Änderungen im letzten Quartal?',
          icon: ArrowTrendingUpIcon,
          category: 'analysis'
        },
        {
          id: 'investor-holdings',
          title: 'Top Holdings',
          prompt: investor ? `Analysiere die größten Positionen im ${investor} Portfolio.` : 'Analysiere die größten Positionen im Portfolio.',
          icon: DocumentTextIcon,
          category: 'analysis'
        },
        {
          id: 'investor-risk',
          title: 'Risiko-Analyse',
          prompt: investor ? `Wie ist die Diversifikation und das Risikoprofil von ${investor}s Portfolio?` : 'Wie ist die Diversifikation und das Risikoprofil des Portfolios?',
          icon: ExclamationTriangleIcon,
          category: 'analysis'
        }
      ]

    default:
      return [
        {
          id: 'general-stock',
          title: 'Aktienanalyse',
          prompt: 'Analysiere Apple (AAPL) - Fundamentaldaten, Bewertung und Aussichten.',
          icon: ChartBarIcon,
          category: 'analysis'
        },
        {
          id: 'general-comparison',
          title: 'Marktvergleich',
          prompt: 'Vergleiche Microsoft, Apple und Google - welche ist die beste Investition?',
          icon: ArrowTrendingUpIcon,
          category: 'comparison'
        },
        {
          id: 'general-investor',
          title: 'Super-Investor',
          prompt: 'Was kauft Warren Buffett aktuell? Analysiere seine neuesten Portfolio-Bewegungen.',
          icon: DocumentTextIcon,
          category: 'analysis'
        },
        {
          id: 'general-market',
          title: 'Markt-Trends',
          prompt: 'Welche Sektoren und Trends dominieren den Markt 2025?',
          icon: SparklesIcon,
          category: 'market'
        }
      ]
  }
}

// ✅ ENHANCED INITIAL WELCOME MESSAGE based on context
function getInitialWelcomeMessage(ticker?: string | null, investor?: string | null, customMessage?: string): string {
  if (customMessage) return customMessage
  
  const contextType = getContextType(ticker, investor)
  
  switch (contextType) {
    case 'stock':
      return `Hallo! Ich bin FinClue AI. Lass uns über ${ticker!.toUpperCase()} sprechen. Ich habe Zugriff auf aktuelle Finanzdaten, Quartalszahlen, News und SEC-Filings.

Frag mich nach:
• Quartalszahlen & Kennzahlen
• Bewertung & Vergleiche  
• Risiken & Chancen
• Branchenanalyse

💡 **Smart Detection aktiv**: Erwähne einfach andere Ticker oder Investoren wie "Buffett" und ich erkenne sie automatisch!

Was möchtest du über ${ticker!.toUpperCase()} wissen?`

    case 'superinvestor':
      return `Hallo! Ich bin dein AI-Assistent für ${investor} Portfolio-Analyse. Ich habe Zugriff auf die neuesten Portfolio-Daten und Filings.

Ich kann dir helfen bei:
• Portfolio-Strategie Analyse
• Holdings & Änderungen
• Sektor-Diversifikation  
• Investment-Philosophie

💡 **Smart Detection aktiv**: Erwähne einfach Aktien-Ticker und ich analysiere sie im Kontext!

Was möchtest du über ${investor}s Portfolio wissen?`

    default:
      return `Hallo! Ich bin FinClue AI, dein intelligenter Finanzassistent. Ich erkenne automatisch, worüber du sprechen möchtest und lade die entsprechenden Daten.

Frag mich nach:
• Jeder Aktie (z.B. "Apple Quartalszahlen")
• Super-Investoren (z.B. "Warren Buffett Portfolio")  
• Marktvergleichen & Analysen
• Hybrid-Fragen (z.B. "Buffett Microsoft Position")

💡 **Smart Detection**: Ich nutze echte Finanzdaten, SEC-Filings und Earnings Calls!

Stelle einfach deine Frage - ich erkenne automatisch den Kontext!`
  }
}

// ✅ COMPLETE RAG SOURCES DISPLAY COMPONENT
function RAGSourcesDisplay({ sources, ragEnabled }: { sources?: string[], ragEnabled?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!ragEnabled) {
    return null
  }

  return (
    <div className="mt-3 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentDuplicateIcon className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-blue-400 font-medium">
            {sources && sources.length > 0 
              ? `${sources.length} Dokument${sources.length > 1 ? 'e' : ''} verwendet`
              : 'RAG-System aktiv'
            }
          </span>
        </div>
        {sources && sources.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isExpanded ? 'Weniger' : 'Details'}
          </button>
        )}
      </div>
      
      {isExpanded && sources && sources.length > 0 && (
        <div className="mt-2 space-y-1">
          {sources.map((source, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-blue-300">
              <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
              <span>{source}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Chart Komponente
function AIChart({ chart }: { chart: ChartData }) {
  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toFixed(2)
    }
    return value
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (chart.type === 'line') {
    return (
      <div className="bg-theme-secondary border border-theme rounded-lg p-4">
        <h3 className="text-theme-primary font-semibold mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-green-400" />
          {chart.title}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chart.data}>
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={formatDate}
            />
            <YAxis 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={formatValue}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--theme-secondary)', 
                border: '1px solid var(--theme-border)',
                borderRadius: '8px',
                color: 'var(--theme-primary)'
              }}
              labelFormatter={(value) => formatDate(value as string)}
              formatter={(value) => [formatValue(value), 'Kurs']}
            />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chart.type === 'volume') {
    return (
      <div className="bg-theme-secondary border border-theme rounded-lg p-4">
        <h3 className="text-theme-primary font-semibold mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-blue-400" />
          {chart.title}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart.data}>
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={formatDate}
            />
            <YAxis 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--theme-secondary)', 
                border: '1px solid var(--theme-border)',
                borderRadius: '8px',
                color: 'var(--theme-primary)'
              }}
              formatter={(value) => [`${(Number(value) / 1000000).toFixed(1)}M`, 'Volumen']}
            />
            <Bar dataKey="volume" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="bg-theme-secondary border border-theme rounded-lg p-4">
      <h3 className="text-theme-primary font-semibold mb-4">{chart.title}</h3>
      <p className="text-theme-secondary">Chart type: {chart.type} (Coming soon)</p>
    </div>
  )
}

// Quick Action Button
function ActionButton({ action, onExecute }: { action: QuickAction, onExecute: (prompt: string) => void }) {
  return (
    <button
      onClick={() => onExecute(action.prompt)}
      className="flex items-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 hover:text-green-300 rounded-lg transition-all duration-200 text-sm font-medium"
    >
      <SparklesIcon className="w-3 h-3" />
      {action.label}
    </button>
  )
}

// Multi-Ticker Selector
function MultiTickerSelector({ 
  compareTickers, 
  setCompareTickers, 
  mainTicker 
}: { 
  compareTickers: string[], 
  setCompareTickers: (tickers: string[]) => void,
  mainTicker?: string 
}) {
  const [newTicker, setNewTicker] = useState('')

  const addTicker = () => {
    if (newTicker.trim() && !compareTickers.includes(newTicker.toUpperCase()) && newTicker.toUpperCase() !== mainTicker?.toUpperCase()) {
      setCompareTickers([...compareTickers, newTicker.toUpperCase()])
      setNewTicker('')
    }
  }

  const removeTicker = (ticker: string) => {
    setCompareTickers(compareTickers.filter(t => t !== ticker))
  }

  return (
    <div className="border-t border-theme pt-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-theme-muted">Vergleiche mit:</span>
        {compareTickers.map(ticker => (
          <div key={ticker} className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-400">
            {ticker}
            <button onClick={() => removeTicker(ticker)} className="hover:text-blue-300">
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="MSFT, GOOGL..."
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTicker()}
          className="flex-1 px-2 py-1 text-xs bg-theme-tertiary border border-theme rounded text-theme-primary placeholder-theme-muted focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={addTicker}
          className="px-2 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded text-xs transition-colors"
        >
          <PlusIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ✅ MAIN ENHANCED UNIFIED COMPONENT
export default function FinClueAI({ 
  ticker, 
  investor,
  portfolioData,
  initialMessage,
  showQuickPrompts = true,
  compactMode = false,
  isPremium 
}: FinClueAIProps) {
  
  // ✅ ENHANCED INITIAL STATE mit Dynamic Welcome Message
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: getInitialWelcomeMessage(ticker, investor, initialMessage),
      timestamp: new Date(),
      ragEnabled: true
    }
  ])
  
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [compareTickers, setCompareTickers] = useState<string[]>([])
  const [ragStatus, setRagStatus] = useState<{ enabled: boolean, sourcesCount: number }>({ enabled: false, sourcesCount: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  // ✅ ENHANCED SEND MESSAGE mit Smart Hybrid Detection
  const sendMessage = async (customPrompt?: string) => {
    const messageText = customPrompt || input
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // ✅ HYBRID CONTEXT DETECTION
      const hybridContext = getHybridContext(ticker, investor, messageText)
      
      console.log('🎯 Enhanced Hybrid Context Detection:', {
        originalMessage: messageText.substring(0, 50) + '...',
        propTicker: ticker,
        propInvestor: investor,
        detectedTicker: hybridContext.detectedTicker,
        detectedInvestor: hybridContext.detectedInvestor,
        contextType: hybridContext.contextType,
        primaryContext: hybridContext.primaryContext,
        effectiveTicker: hybridContext.effectiveTicker,
        effectiveInvestor: hybridContext.effectiveInvestor
      })

      // ✅ ENHANCED REQUEST BODY mit Hybrid Support
      const requestBody = {
        message: messageText,
        context: messages.map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        })).slice(-6),
        
        // ✅ NEW: Hybrid context support
        analysisType: hybridContext.contextType,
        primaryContext: hybridContext.primaryContext,
        
        // ✅ ENHANCED: Support both ticker and investor simultaneously
        ticker: hybridContext.effectiveTicker || undefined,
        investor: hybridContext.effectiveInvestor || undefined,
        portfolioData: portfolioData || undefined,
        
        compareWith: compareTickers.length > 0 ? compareTickers : undefined,
        
        // ✅ NEW: Additional context hints
        contextHints: {
          isHybridQuery: hybridContext.contextType === 'hybrid',
          hasExplicitTicker: !!ticker,
          hasExplicitInvestor: !!investor,
          messageContainsPortfolioTerms: /portfolio|käufe|verkäufe|holdings|positionen|13f/i.test(messageText),
          messageContainsStockTerms: /quartal|earnings|umsatz|kuv|p\/e|bewertung|fundamentals/i.test(messageText)
        }
      }

      console.log('📤 Enhanced AI request with hybrid support:', requestBody)

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Premium subscription required')
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const responseData = await response.json()
      console.log('📥 Enhanced Hybrid AI response:', {
        success: responseData.success,
        contextType: hybridContext.contextType,
        isHybrid: responseData.isHybrid,
        contentLength: responseData.response?.content?.length || 0,
        ragSourcesCount: responseData.ragSourcesCount
      })

      if (responseData.success && responseData.response) {
        setRagStatus({
          enabled: responseData.ragEnabled || false,
          sourcesCount: responseData.ragSourcesCount || 0
        })

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: responseData.response.content,
          timestamp: new Date(),
          charts: responseData.response.charts || [],
          actions: responseData.response.actions || [],
          ragSources: responseData.response.metadata?.ragSources || [],
          ragEnabled: responseData.ragEnabled
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error:', error)
      
      let errorContent = 'Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Anfrage.'
      if (error instanceof Error) {
        if (error.message === 'Premium subscription required') {
          errorContent = 'Für FinClue AI wird ein Premium-Abonnement benötigt. Bitte upgrade dein Konto.'
        } else if (error.message === 'Not authenticated') {
          errorContent = 'Du musst angemeldet sein, um FinClue AI zu verwenden.'
        }
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickPrompt = (prompt: QuickPrompt) => {
    let finalPrompt = prompt.prompt
    
    // Replace placeholders
    if (ticker) {
      finalPrompt = finalPrompt.replace('{ticker}', ticker.toUpperCase())
    }
    if (investor) {
      finalPrompt = finalPrompt.replace('{investor}', investor)
    }
    
    setInput(finalPrompt)
    adjustTextareaHeight()
  }

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isPremium) {
    return (
      <div className="h-full flex items-center justify-center bg-theme-primary">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <SparklesIcon className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-2xl font-bold text-theme-primary mb-4">Premium Feature</h3>
          <p className="text-theme-secondary mb-6 leading-relaxed">
            FinClue AI ist ein Premium-Feature. Upgrade jetzt und erhalte Zugang zu unserem 
            KI-Finanzassistenten für detaillierte Aktienanalysen.
          </p>
          <button 
            onClick={() => window.location.href = '/pricing'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <SparklesIcon className="w-4 h-4" />
            Premium upgraden
          </button>
        </div>
      </div>
    )
  }

  const hybridContext = getHybridContext(ticker, investor)
  const quickPrompts = getContextualQuickPrompts(ticker, investor)

  return (
    <div className="h-full flex flex-col bg-theme-primary">
      {/* Enhanced Header */}
      <div className="flex-shrink-0 border-b border-theme bg-theme-secondary">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-500 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
                  FinClue AI
                  {ragStatus.enabled && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                      <DocumentDuplicateIcon className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-blue-400">RAG</span>
                    </div>
                  )}
                  {hybridContext.contextType === 'hybrid' && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                      <SparklesIcon className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-purple-400">HYBRID</span>
                    </div>
                  )}
                </h2>
                <p className="text-sm text-theme-secondary">
                  {ticker && investor ? `Hybrid-Analyse: ${ticker.toUpperCase()} + ${investor}` :
                   ticker ? `Aktienanalyse für ${ticker.toUpperCase()}` :
                   investor ? `Portfolio-Analyse für ${investor}` :
                   'Smart Detection aktiv - Erwähne Ticker oder Investoren'}
                  {compareTickers.length > 0 && ` • Vergleich mit ${compareTickers.join(', ')}`}
                  {ragStatus.enabled && ` • ${ragStatus.sourcesCount} Dokumente verfügbar`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setMessages([{
                  id: '1',
                  type: 'assistant',
                  content: getInitialWelcomeMessage(ticker, investor, initialMessage),
                  timestamp: new Date(),
                  ragEnabled: true
                }])
                setCompareTickers([])
              }}
              className="flex items-center gap-2 px-3 py-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span className="text-sm">Neuer Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED Quick Prompts */}
      {showQuickPrompts && messages.length <= 1 && (
        <div className="flex-shrink-0 border-b border-theme bg-theme-secondary/50">
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-theme-primary mb-3">
              {hybridContext.contextType === 'hybrid' ? `Hybrid-Analyse (${ticker} + ${investor}):` :
               hybridContext.contextType === 'stock' ? `${ticker} Quick-Analyse:` :
               hybridContext.contextType === 'superinvestor' ? `${investor} Schnellzugriff:` :
               'Smart-Analyse - Erwähne Ticker oder Investoren:'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickPrompts.map((prompt) => {
                const Icon = prompt.icon
                return (
                  <button
                    key={prompt.id}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="flex items-center gap-3 p-3 bg-theme-tertiary/50 hover:bg-theme-tertiary border border-theme hover:border-green-500/30 rounded-lg transition-all duration-200 text-left group"
                  >
                    <div className="w-8 h-8 bg-theme-tertiary group-hover:bg-green-500/20 rounded-lg flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4 text-theme-muted group-hover:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-theme-primary group-hover:text-green-400 transition-colors">
                        {prompt.title}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`${message.type === 'user' ? 'max-w-[80%]' : 'flex-1'}`}>
                <div
                  className={`rounded-lg px-4 py-3 mb-4 ${
                    message.type === 'user'
                      ? 'bg-green-500 text-black'
                      : 'bg-theme-secondary text-theme-primary border border-theme'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-black/70' : 'text-theme-muted'
                  }`}>
                    {message.timestamp.toLocaleTimeString('de-DE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {message.type === 'assistant' && (
                  <RAGSourcesDisplay 
                    sources={message.ragSources} 
                    ragEnabled={message.ragEnabled}
                  />
                )}

                {message.charts && message.charts.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {message.charts.map((chart, index) => (
                      <AIChart key={index} chart={chart} />
                    ))}
                  </div>
                )}

                {message.actions && message.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {message.actions.map((action, index) => (
                      <ActionButton 
                        key={index} 
                        action={action} 
                        onExecute={handleQuickAction}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {message.type === 'user' && (
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-black text-sm font-semibold">Du</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-green-500 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div className="bg-theme-secondary border border-theme rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-theme-secondary">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="ml-2 text-sm">
                    FinClue AI analysiert{ragStatus.enabled ? ' mit Dokumenten' : ''}
                    {hybridContext.contextType === 'hybrid' ? ' (Hybrid-Kontext)' : ''}...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Enhanced Input */}
      <div className="flex-shrink-0 border-t border-theme bg-theme-secondary">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                adjustTextareaHeight()
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                ticker && investor ? `Hybrid-Frage zu ${ticker.toUpperCase()} oder ${investor}...` :
                ticker ? `Frage etwas über ${ticker.toUpperCase()} oder erwähne Investoren...` :
                investor ? `Frage etwas über ${investor}s Portfolio oder erwähne Ticker...` :
                "Smart Detection aktiv: Erwähne Ticker (z.B. 'Apple') oder Investoren (z.B. 'Buffett')..."
              }
              className="w-full px-4 py-3 pr-12 bg-theme-tertiary border border-theme rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none min-h-[48px] max-h-[120px]"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 w-8 h-8 bg-green-500 hover:bg-green-400 disabled:bg-theme-muted disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
            >
              <PaperAirplaneIcon className="w-4 h-4 text-white" />
            </button>
            
            {ticker && (
              <MultiTickerSelector 
                compareTickers={compareTickers}
                setCompareTickers={setCompareTickers}
                mainTicker={ticker}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-theme-muted">
            <span>Shift + Enter für neue Zeile • Smart Detection aktiv</span>
            <div className="flex items-center gap-3">
              {ragStatus.enabled && (
                <span className="flex items-center gap-1 text-blue-400">
                  <DocumentDuplicateIcon className="w-3 h-3" />
                  RAG System aktiv
                </span>
              )}
              {hybridContext.contextType === 'hybrid' && (
                <span className="flex items-center gap-1 text-purple-400">
                  <SparklesIcon className="w-3 h-3" />
                  Hybrid Mode
                </span>
              )}
              <span className="flex items-center gap-1">
                <SparklesIcon className="w-3 h-3" />
                Powered by FinClue AI
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}