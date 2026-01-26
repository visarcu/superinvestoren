// src/components/ai/types.ts

export interface Message {
    id: string
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
    charts?: ChartData[]
    actions?: AIQuickAction[]
    ragSources?: string[]
    ragEnabled?: boolean
}

export interface ChartData {
    type: 'line' | 'bar' | 'comparison' | 'volume'
    title: string
    ticker: string
    period: string
    data: any[]
}

export interface AIQuickAction {
    label: string
    action: string
    ticker?: string
    prompt: string
}

export interface QuickPrompt {
    id: string
    title: string
    prompt: string
    icon: React.ComponentType<any>
    category: 'analysis' | 'market' | 'comparison'
}
