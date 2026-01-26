// src/components/ai/AIChatPrompts.tsx
import React from 'react'
import { QuickPrompt } from './types'

interface AIChatPromptsProps {
    prompts: QuickPrompt[]
    onSelect: (prompt: QuickPrompt) => void
}

export default function AIChatPrompts({ prompts, onSelect }: AIChatPromptsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {prompts.map((prompt) => {
                const Icon = prompt.icon
                return (
                    <button
                        key={prompt.id}
                        onClick={() => onSelect(prompt)}
                        className="flex items-start gap-4 p-4 bg-theme-secondary hover:bg-theme-tertiary border border-theme hover:border-brand/40 rounded-xl transition-all group text-left shadow-sm"
                    >
                        <div className={`p-2 rounded-lg bg-theme-tertiary text-theme-muted group-hover:bg-brand/10 group-hover:text-brand-light transition-colors`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-theme-primary group-hover:text-brand-light transition-colors">
                                {prompt.title}
                            </h4>
                            <p className="text-xs text-theme-muted mt-1 line-clamp-2 leading-relaxed">
                                {prompt.prompt.replace('{ticker}', '').replace('{investor}', '').trim() || prompt.title}
                            </p>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
