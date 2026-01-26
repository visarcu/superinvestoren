// src/components/ai/RAGSourcesDisplay.tsx
import React, { useState } from 'react'
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'

export default function RAGSourcesDisplay({ sources, ragEnabled }: { sources?: string[], ragEnabled?: boolean }) {
    const [isExpanded, setIsExpanded] = useState(false)

    if (!ragEnabled) {
        return null
    }

    return (
        <div className="mt-3 p-3 bg-brand/5 border border-brand/20 rounded-lg shadow-inner">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DocumentDuplicateIcon className="w-4 h-4 text-brand-light shadow-sm" />
                    <span className="text-sm text-brand-light font-semibold uppercase tracking-tight">
                        {sources && sources.length > 0
                            ? `${sources.length} Dokument${sources.length > 1 ? 'e' : ''} verwendet`
                            : 'RAG-System aktiv'
                        }
                    </span>
                </div>
                {sources && sources.length > 0 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-brand-light/80 hover:text-brand-light transition-colors underline decoration-brand/30"
                    >
                        {isExpanded ? 'Weniger' : 'Details'}
                    </button>
                )}
            </div>

            {isExpanded && sources && sources.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-brand/10 pt-2">
                    {sources.map((source, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-gray-200">
                            <div className="w-1 h-1 bg-brand-light rounded-full"></div>
                            <span>{source}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
