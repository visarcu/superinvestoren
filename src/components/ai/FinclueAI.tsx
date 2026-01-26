// src/components/ai/FinclueAI.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

import { Message, QuickPrompt } from './types'
import AIChatMessage from './AIChatMessage'
import AIChatInput from './AIChatInput'
import AIChatPrompts from './AIChatPrompts'
import {
    getInitialWelcomeMessage,
    getHybridContext,
    getContextualQuickPrompts
} from './utils'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface FinclueAIProps {
    ticker?: string | null
    investor?: string | null
    portfolioData?: any
    initialMessage?: string
    showQuickPrompts?: boolean
    compactMode?: boolean
    isPremium: boolean
}

export default function FinclueAI({
    ticker,
    investor,
    portfolioData,
    initialMessage,
    showQuickPrompts = true,
    compactMode = false,
    isPremium
}: FinclueAIProps) {

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
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

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

            const hybrid = getHybridContext(ticker, investor, messageText)

            const requestBody = {
                message: messageText,
                context: messages.map(m => ({
                    role: m.type === 'user' ? 'user' : 'assistant',
                    content: m.content
                })).slice(-6),
                analysisType: hybrid.contextType,
                primaryContext: hybrid.primaryContext,
                ticker: hybrid.effectiveTicker || undefined,
                investor: hybrid.effectiveInvestor || undefined,
                portfolioData: portfolioData || undefined,
                compareWith: compareTickers.length > 0 ? compareTickers : undefined,
                contextHints: {
                    isHybridQuery: hybrid.contextType === 'hybrid',
                    hasExplicitTicker: !!ticker,
                    hasExplicitInvestor: !!investor,
                    messageContainsPortfolioTerms: /portfolio|käufe|verkäufe|holdings/i.test(messageText),
                    messageContainsStockTerms: /quartal|earnings|umsatz|kuv/i.test(messageText)
                }
            }

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                if (response.status === 403) throw new Error('Premium subscription required')
                throw new Error(`API request failed: ${response.status}`)
            }

            const responseData = await response.json()

            if (responseData.success && responseData.response) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    type: 'assistant',
                    content: responseData.response.content,
                    timestamp: new Date(),
                    charts: responseData.response.charts || [],
                    actions: responseData.response.actions || [],
                    ragSources: responseData.response.metadata?.ragSources || [],
                    ragEnabled: responseData.ragEnabled
                }])
            } else {
                throw new Error('Invalid response format')
            }
        } catch (error) {
            console.error('AI Error:', error)
            const errorContent = error instanceof Error && error.message === 'Premium subscription required'
                ? 'Für Finclue AI wird ein Premium-Abonnement benötigt.'
                : 'Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Anfrage.'

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: errorContent,
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuickPrompt = (prompt: QuickPrompt) => {
        let finalPrompt = prompt.prompt
        if (ticker) finalPrompt = finalPrompt.replace('{ticker}', ticker.toUpperCase())
        if (investor) finalPrompt = finalPrompt.replace('{investor}', investor)
        setInput(finalPrompt)
    }

    return (
        <div className={`flex flex-col h-full bg-theme-bg overflow-hidden ${compactMode ? 'rounded-xl border border-theme' : ''}`}>
            {/* Header */}
            {!compactMode && (
                <div className="p-4 border-b border-theme flex items-center justify-between bg-theme-secondary/30 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center border border-brand/20">
                            <div className="w-4 h-4 rounded-full bg-brand animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-theme-primary leading-none">Finclue AI Analyst</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                    Live Market Data
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-medium text-blue-400 uppercase tracking-widest bg-blue-400/10 px-1.5 py-0.5 rounded">
                                    RAG Analytics
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                <div className="max-w-4xl mx-auto py-4">
                    {showQuickPrompts && messages.length === 1 && (
                        <AIChatPrompts
                            prompts={getContextualQuickPrompts(ticker, investor)}
                            onSelect={handleQuickPrompt}
                        />
                    )}

                    {messages.map((m) => (
                        <AIChatMessage
                            key={m.id}
                            message={m}
                            onExecuteAction={(prompt) => sendMessage(prompt)}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <AIChatInput
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                onSend={() => sendMessage()}
            />
        </div>
    )
}
