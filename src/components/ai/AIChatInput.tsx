// src/components/ai/AIChatInput.tsx
import React, { useRef } from 'react'
import { PaperAirplaneIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface AIChatInputProps {
    input: string
    setInput: (value: string) => void
    isLoading: boolean
    onSend: () => void
    placeholder?: string
}

export default function AIChatInput({ input, setInput, isLoading, onSend, placeholder }: AIChatInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }

    const adjustHeight = () => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
        }
    }

    return (
        <div className="relative p-4 border-t border-theme bg-theme-bg/50 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto flex gap-3 items-end">
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                            adjustHeight()
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        placeholder={placeholder || 'Stelle eine Frage zu Aktien oder Investoren...'}
                        className="w-full bg-theme-tertiary border border-theme rounded-xl px-4 py-3 pr-12 text-theme-primary placeholder-theme-muted focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all resize-none shadow-inner"
                    />
                </div>
                <button
                    onClick={onSend}
                    disabled={!input.trim() || isLoading}
                    className={`p-3 rounded-xl flex items-center justify-center transition-all ${!input.trim() || isLoading
                            ? 'bg-theme-secondary text-theme-muted cursor-not-allowed'
                            : 'bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/20'
                        }`}
                >
                    {isLoading ? (
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    ) : (
                        <PaperAirplaneIcon className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    )
}
