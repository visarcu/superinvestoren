// src/components/ai/AIActionButton.tsx
import React from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { AIQuickAction } from './types'

export default function AIActionButton({ action, onExecute }: { action: AIQuickAction, onExecute: (prompt: string) => void }) {
    return (
        <button
            onClick={() => onExecute(action.prompt)}
            className="flex items-center gap-2 px-3 py-2 bg-brand/20 hover:bg-brand/30 border border-green-500/30 text-brand-light hover:text-green-300 rounded-lg transition-all duration-200 text-sm font-medium"
        >
            <SparklesIcon className="w-3 h-3" />
            {action.label}
        </button>
    )
}
