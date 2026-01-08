// src/components/ChatModal.tsx - Mit Markdown-Rendering
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  XMarkIcon, 
  PaperAirplaneIcon, 
  SparklesIcon,
  ChartBarIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { preparePortfolioDataForAI } from '@/lib/superinvestorDataService'

// Simple Markdown renderer component
// REPLACE the MarkdownRenderer in ChatModal.tsx:

function MarkdownRenderer({ content }: { content: string }) {
  const renderContent = (text: string) => {
    return text
      // Headers - less prominent
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-medium text-white mt-3 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-white mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-white mt-4 mb-3">$1</h1>')
      
      // Bold text - more subtle
      .replace(/\*\*(.*?)\*\*/g, '<span class="font-medium text-brand-light">$1</span>')
      
      // Remove bullet points for cleaner look
      .replace(/^• (.*$)/gm, '<div class="mb-1 text-gray-200">$1</div>')
      .replace(/^- (.*$)/gm, '<div class="mb-1 text-gray-200">$1</div>')
      
      // Better line breaks
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
      
      // Financial metrics highlighting
      .replace(/(\d+,?\d*\.?\d*%)/g, '<span class="text-brand-light font-medium">$1</span>')
      .replace(/(\$\d+\.?\d*[BMK]?)/g, '<span class="text-blue-400 font-medium">$1</span>')
      
      // Emojis with better spacing
      .replace(/📈/g, '<span class="text-brand-light mr-1">📈</span>')
      .replace(/📉/g, '<span class="text-red-400 mr-1">📉</span>')
      .replace(/🆕/g, '<span class="text-blue-400 mr-1">🆕</span>')
      .replace(/❌/g, '<span class="text-red-400 mr-1">❌</span>')
      .replace(/✅/g, '<span class="text-brand-light mr-1">✅</span>')
  }

  return (
    <div 
      className="prose prose-invert max-w-none leading-relaxed"
      dangerouslySetInnerHTML={{ 
        __html: renderContent(content) 
      }} 
    />
  )
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface QuickAction {
  label: string
  action: string
  ticker?: string
  investor?: string
  prompt: string
}

interface ChartData {
  type: 'line' | 'bar' | 'comparison' | 'volume' | 'portfolio_allocation'
  title: string
  ticker?: string
  investor?: string
  period: string
  data: any[]
}

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  investorName: string
  investorSlug: string
  holdings: Array<{
    name: string
    ticker?: string
    value: number
    shares: number
  }>
  portfolioValue: number
}

export default function ChatModal({
  isOpen,
  onClose,
  investorName,
  investorSlug,
  holdings,
  portfolioValue
}: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickActions, setQuickActions] = useState<QuickAction[]>([])
  const [charts, setCharts] = useState<ChartData[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      // Willkommensnachricht
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `Hallo! Ich bin dein AI-Assistent für ${investorName}s Portfolio-Analyse. Du kannst mich alles über die Investmentstrategie, Portfolio-Bewegungen oder spezifische Holdings fragen.

Aktuelles Portfolio: ${formatCurrency(portfolioValue)} mit ${holdings.length} Positionen.

Was möchtest du wissen?`,
          timestamp: Date.now()
        }])
        
        // Standard Quick Actions
        setQuickActions([
          {
            label: 'Portfolio-Strategie',
            action: 'strategy',
            investor: investorSlug,
            prompt: `Analysiere ${investorName}s aktuelle Investmentstrategie basierend auf dem Portfolio. Was sind die Kernprinzipien?`
          },
          {
            label: 'Letzte Änderungen',
            action: 'changes',
            investor: investorSlug,
            prompt: `Was waren die wichtigsten Portfolio-Änderungen im letzten Quartal? Neue Positionen, Verkäufe, Erhöhungen?`
          },
          {
            label: 'Top-Holdings',
            action: 'top-holdings',
            investor: investorSlug,
            prompt: `Analysiere die Top 10 Holdings von ${investorName}. Was sagt das über die aktuelle Marktsicht aus?`
          },
          {
            label: 'Risiko-Bewertung',
            action: 'risk',
            investor: investorSlug,
            prompt: `Wie ist die Risiko-Diversifikation im Portfolio von ${investorName}? Sektor-Konzentration und Einzelrisiken?`
          }
        ])
      }
    }
  }, [isOpen, investorName, investorSlug, portfolioValue, holdings.length])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSendMessage = async (messageText: string = input) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText.trim(),
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Hole erweiterte Portfolio-Daten
      const portfolioData = preparePortfolioDataForAI(investorSlug)
      
      // Hole Auth Token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Du musst angemeldet sein, um die AI zu nutzen')
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: messageText,
          context: messages.slice(-6), // Letzte 6 Messages für Kontext
          analysisType: 'superinvestor',
          investor: investorSlug,
          portfolioData: portfolioData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Unbekannter Fehler')
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response.content,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Update Charts und Actions falls vorhanden
      if (data.response.charts && data.response.charts.length > 0) {
        setCharts(data.response.charts)
      }

      if (data.response.actions && data.response.actions.length > 0) {
        setQuickActions(data.response.actions)
      }

    } catch (err) {
      console.error('Chat error:', err)
      setError(err instanceof Error ? err.message : 'Verbindungsfehler')
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Entschuldigung, da ist ein Fehler aufgetreten: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}. Bitte versuche es nochmal.`,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.prompt)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[80vh] mx-4 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                FinClue AI Chat
              </h2>
              <p className="text-sm text-gray-400">
                {investorName} Portfolio-Analyse
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-4 h-4 text-purple-400" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] px-4 py-3 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-brand text-black'
                    : 'bg-gray-800 text-white border border-gray-700'
                }`}
              >
                {/* UPDATED: Use MarkdownRenderer for assistant messages */}
                {message.role === 'assistant' ? (
                  <MarkdownRenderer content={message.content} />
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                )}
                
                <div className="mt-2 text-xs opacity-60">
                  {new Date(message.timestamp).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 bg-brand/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-brand-light" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <span className="text-gray-400 ml-2">AI analysiert...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
            <div className="flex flex-wrap gap-2">
              {quickActions.slice(0, 4).map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action)}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 rounded-lg transition-all disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Charts Display */}
        {charts.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/30">
            <div className="flex items-center gap-2 mb-3">
              <ChartBarIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Generierte Charts:</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {charts.slice(0, 4).map((chart, index) => (
                <div key={index} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">{chart.type}</div>
                  <div className="text-sm text-white font-medium">{chart.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 border-t border-red-900/50 bg-red-900/20">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-6 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Frage mich etwas über ${investorName}s Portfolio...`}
              disabled={isLoading}
              className="flex-1 resize-none px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              rows={2}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center min-w-[60px]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-500 text-center">
            Powered by FinClue AI • Drücke Enter zum Senden • Keine Anlageberatung
          </div>
        </div>
      </div>
    </div>
  )
}