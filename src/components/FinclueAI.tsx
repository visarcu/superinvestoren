// src/components/FinclueAI.tsx - FIXED VERSION mit grünem Button
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
  ragSources?: string[] // NEW: RAG sources
  ragEnabled?: boolean   // NEW: Whether RAG was used
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

interface FinClueAIProps {
  ticker?: string | null
  isPremium: boolean
}

const quickPrompts: QuickPrompt[] = [
  {
    id: '1',
    title: 'Fundamentalanalyse',
    prompt: 'Analysiere die fundamentalen Kennzahlen von {ticker} und bewerte die Investmentqualität.',
    icon: ChartBarIcon,
    category: 'analysis'
  },
  {
    id: '2', 
    title: 'Marktvergleich',
    prompt: 'Vergleiche {ticker} mit den direkten Konkurrenten und bewerte die relative Stärke.',
    icon: ArrowTrendingUpIcon,
    category: 'comparison'
  },
  {
    id: '3',
    title: 'Dividendenanalyse', 
    prompt: 'Bewerte die Dividendenpolitik und -nachhaltigkeit von {ticker}.',
    icon: CurrencyDollarIcon,
    category: 'analysis'
  },
  {
    id: '4',
    title: 'Risiko-Assessment',
    prompt: 'Welche Hauptrisiken und Chancen siehst du bei einer Investition in {ticker}?',
    icon: ExclamationTriangleIcon,
    category: 'analysis'
  },
  {
    id: '5',
    title: 'Quartalszahlen-Review',
    prompt: 'Analysiere die letzten Quartalszahlen von {ticker} und erkläre die wichtigsten Entwicklungen.',
    icon: DocumentTextIcon,
    category: 'analysis'
  },
  {
    id: '6',
    title: 'Multi-Aktien Vergleich',
    prompt: 'Vergleiche {ticker} mit Apple, Microsoft und Google in allen wichtigen Kennzahlen.',
    icon: ArrowTrendingUpIcon,
    category: 'comparison'
  }
]

// NEW: RAG Sources Display Component
function RAGSourcesDisplay({ sources, ragEnabled }: { sources?: string[], ragEnabled?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!ragEnabled) {
    return null
  }

  return (
    <div className="mt-3 p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
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
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
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
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff'
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
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
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
                backgroundColor: '#1f2937', 
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff'
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
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <h3 className="text-white font-semibold mb-4">{chart.title}</h3>
      <p className="text-gray-400">Chart type: {chart.type} (Coming soon)</p>
    </div>
  )
}

// Quick Action Button
function ActionButton({ action, onExecute }: { action: QuickAction, onExecute: (prompt: string) => void }) {
  return (
    <button
      onClick={() => onExecute(action.prompt)}
      className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 hover:text-green-300 rounded-lg transition-all duration-200 text-sm font-medium"
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
    <div className="border-t border-gray-700 pt-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-400">Vergleiche mit:</span>
        {compareTickers.map(ticker => (
          <div key={ticker} className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-600/30 rounded text-xs text-blue-400">
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
          className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={addTicker}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
        >
          <PlusIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export default function FinClueAI({ ticker, isPremium }: FinClueAIProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hallo! Ich bin FinClue AI, dein KI-Finanzassistent mit Zugriff auf aktuelle Finanzdokumente. ${ticker ? `Lass uns über ${ticker.toUpperCase()} sprechen.` : 'Wie kann ich dir bei deiner Aktienanalyse helfen?'} 

Stelle mir Fragen zu:
• Fundamentalanalyse & Bewertung
• Quartalszahlen & Trends  
• Risiken & Chancen
• Dividenden & Ausschüttungen
• Branchenvergleiche
• Multi-Aktien Analysen

💡 **Neu:** Ich nutze jetzt echte Earnings Calls, News und SEC-Filings für noch genauere Analysen!`,
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
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // BUILD CORRECT REQUEST BODY
      const requestBody = {
        message: messageText,
        context: messages.map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        })).slice(-6), // Last 6 messages for context
        analysisType: ticker ? 'stock' : 'general', // ✅ Set based on ticker presence
        ticker: ticker || undefined, // ✅ Use actual ticker prop
        compareWith: compareTickers.length > 0 ? compareTickers : undefined
      }

      console.log('Sending AI request:', requestBody)

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody) // ✅ USE THE CORRECT REQUEST BODY!
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Premium subscription required')
        }
        throw new Error(`API request failed: ${response.status}`)
      }

      const responseData = await response.json()
      console.log('AI response received:', responseData)

      if (responseData.success && responseData.response) {
        // Update RAG status
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
    const finalPrompt = ticker ? prompt.prompt.replace('{ticker}', ticker.toUpperCase()) : prompt.prompt
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
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center max-w-md mx-auto p-8">
          {/* ✅ UPDATED: Grüner Button statt Orange */}
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <SparklesIcon className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Premium Feature</h3>
          <p className="text-gray-400 mb-6 leading-relaxed">
            FinClue AI ist ein Premium-Feature. Upgrade jetzt und erhalte Zugang zu unserem 
            KI-Finanzassistenten für detaillierte Aktienanalysen.
          </p>
          {/* ✅ UPDATED: Grüner Button statt Orange/Gelb Gradient */}
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

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  FinClue AI
                  {ragStatus.enabled && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-600/30 rounded-full">
                      <DocumentDuplicateIcon className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-blue-400">RAG</span>
                    </div>
                  )}
                </h2>
                <p className="text-sm text-gray-400">
                  {ticker ? `Aktienanalyse für ${ticker.toUpperCase()}` : 'KI-Finanzassistent'}
                  {compareTickers.length > 0 && ` • Vergleich mit ${compareTickers.join(', ')}`}
                  {ragStatus.enabled && ` • Dokumentenbasierte Analyse`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setMessages(messages.slice(0, 1))
                setCompareTickers([])
              }}
              className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span className="text-sm">Neuer Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/30">
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Schnellstart:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickPrompts.map((prompt) => {
                const Icon = prompt.icon
                return (
                  <button
                    key={prompt.id}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg transition-all duration-200 text-left group"
                  >
                    <div className="w-8 h-8 bg-gray-700 group-hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">
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
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`${message.type === 'user' ? 'max-w-[80%]' : 'flex-1'}`}>
                {/* Message Content */}
                <div
                  className={`rounded-lg px-4 py-3 mb-4 ${
                    message.type === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-100 border border-gray-700'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-green-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('de-DE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {/* RAG Sources Display */}
                {message.type === 'assistant' && (
                  <RAGSourcesDisplay 
                    sources={message.ragSources} 
                    ragEnabled={message.ragEnabled}
                  />
                )}

                {/* Charts */}
                {message.charts && message.charts.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {message.charts.map((chart, index) => (
                      <AIChart key={index} chart={chart} />
                    ))}
                  </div>
                )}

                {/* Quick Actions */}
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
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">Du</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="ml-2 text-sm">
                    FinClue AI analysiert{ragStatus.enabled ? ' mit Dokumenten' : ''}...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
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
              placeholder={ticker 
                ? `Frage etwas über ${ticker.toUpperCase()}...`
                : "Stelle eine Frage zu Aktien, Märkten oder Unternehmen..."
              }
              className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none min-h-[48px] max-h-[120px]"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 w-8 h-8 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
            >
              <PaperAirplaneIcon className="w-4 h-4 text-white" />
            </button>
            
            {/* Multi-Ticker Selector */}
            {ticker && (
              <MultiTickerSelector 
                compareTickers={compareTickers}
                setCompareTickers={setCompareTickers}
                mainTicker={ticker}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>Shift + Enter für neue Zeile</span>
            <div className="flex items-center gap-3">
              {ragStatus.enabled && (
                <span className="flex items-center gap-1 text-blue-400">
                  <DocumentDuplicateIcon className="w-3 h-3" />
                  RAG System aktiv
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