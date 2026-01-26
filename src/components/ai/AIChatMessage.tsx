// src/components/ai/AIChatMessage.tsx
import React from 'react'
import { Message } from './types'
import AIChart from './AIChart'
import AIActionButton from './AIActionButton'
import RAGSourcesDisplay from './RAGSourcesDisplay'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AIChatMessageProps {
    message: Message
    onExecuteAction: (prompt: string) => void
}

export default function AIChatMessage({ message, onExecuteAction }: AIChatMessageProps) {
    const isAssistant = message.type === 'assistant'

    return (
        <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-6`}>
            <div className={`max-w-[85%] ${isAssistant ? 'bg-theme-card border border-theme' : 'bg-brand/20 border border-brand/30'} rounded-2xl p-4 shadow-sm`}>
                <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider font-bold">
                    {isAssistant ? (
                        <span className="flex items-center gap-1.5 text-brand-light">
                            <div className="w-1.5 h-1.5 bg-brand-light rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                            Finclue AI
                        </span>
                    ) : (
                        <span className="text-gray-400">Du</span>
                    )}
                    <span className="text-theme-muted">•</span>
                    <span className="text-theme-muted">{message.timestamp.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="leading-relaxed space-y-2">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ children }) => <p className="text-[15.5px] leading-relaxed text-gray-100 font-medium">{children}</p>,
                            strong: ({ children }) => <strong className="text-white font-bold brightness-125 border-b border-brand-light/30">{children}</strong>,
                            a: ({ children, href }) => (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-light font-bold underline underline-offset-4 decoration-brand-light/50 hover:text-white transition-all"
                                >
                                    {children}
                                </a>
                            ),
                            ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 text-gray-100">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 text-gray-100">{children}</ol>,
                            li: ({ children }) => <li className="text-[15px]">{children}</li>,
                            h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-3 mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-bold text-white mt-2 mb-1">{children}</h3>,
                            code: ({ children }) => <code className="bg-theme-tertiary px-1.5 py-0.5 rounded text-brand-light font-mono text-sm">{children}</code>
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>

                {/* Charts */}
                {message.charts && message.charts.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {message.charts.map((chart, idx) => (
                            <AIChart key={idx} chart={chart} />
                        ))}
                    </div>
                )}

                {/* RAG Sources */}
                {isAssistant && message.ragSources && (
                    <RAGSourcesDisplay
                        sources={message.ragSources || []}
                        ragEnabled={message.ragEnabled}
                    />
                )}

                {/* Quick Actions */}
                {isAssistant && message.actions && message.actions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {message.actions.map((action, idx) => (
                            <AIActionButton
                                key={idx}
                                action={action}
                                onExecute={onExecuteAction}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
