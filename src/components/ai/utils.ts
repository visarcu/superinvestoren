import { ChartBarIcon, DocumentTextIcon, ArrowTrendingUpIcon, CurrencyDollarIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { QuickPrompt } from './types'
import { investors as allInvestors } from '@/data/investors'

export function extractTickerFromMessage(message: string): string | null {
    const companyToTicker: Record<string, string> = {
        'apple': 'AAPL', 'microsoft': 'MSFT', 'google': 'GOOGL', 'alphabet': 'GOOGL',
        'amazon': 'AMZN', 'tesla': 'TSLA', 'nvidia': 'NVDA', 'meta': 'META',
        'facebook': 'META', 'netflix': 'NFLX', 'adobe': 'ADBE', 'salesforce': 'CRM',
        'oracle': 'ORCL', 'intel': 'INTC', 'aapl': 'AAPL', 'msft': 'MSFT',
        'tsla': 'TSLA', 'nvda': 'NVDA', 'googl': 'GOOGL', 'amzn': 'AMZN', 'nflx': 'NFLX'
    }

    const lowerMessage = message.toLowerCase()
    for (const [company, ticker] of Object.entries(companyToTicker)) {
        if (lowerMessage.includes(company)) return ticker
    }

    const tickerMatch = message.match(/\b([A-Z]{1,5})\b/g)
    if (tickerMatch) {
        const commonTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC']
        for (const ticker of tickerMatch) {
            if (commonTickers.includes(ticker)) return ticker
        }
    }
    return null
}

export function extractInvestorFromMessage(message: string): string | null {
    const lowerMessage = message.toLowerCase()

    // 1. Check for specific slugs and names from our database
    for (const inv of allInvestors) {
        const nameNode = inv.name.toLowerCase()
        const slugNode = inv.slug.toLowerCase()

        // Match full name (e.g. "Warren Buffett") or slug (e.g. "buffett")
        if (lowerMessage.includes(slugNode) || lowerMessage.includes(nameNode)) {
            return inv.slug
        }

        // Match common name variations (split by space)
        const nameParts = nameNode.split(' ')
        if (nameParts.length > 1) {
            // Check for last name (often used alone)
            const lastName = nameParts[nameParts.length - 1]
            if (lastName.length > 3 && lowerMessage.includes(lastName)) {
                return inv.slug
            }
        }
    }

    return null
}

export function getHybridContext(ticker?: string | null, investor?: string | null, message?: string) {
    const detectedTicker = extractTickerFromMessage(message || '')
    const detectedInvestor = extractInvestorFromMessage(message || '')

    const effectiveTicker = ticker || detectedTicker
    const effectiveInvestor = investor || detectedInvestor

    let contextType: 'stock' | 'superinvestor' | 'hybrid' | 'general'
    let primaryContext: 'stock' | 'superinvestor' | 'general'

    if (effectiveTicker && effectiveInvestor) {
        contextType = 'hybrid'
        if (ticker && !investor) primaryContext = 'stock'
        else if (investor && !ticker) primaryContext = 'superinvestor'
        else {
            const lowerMessage = (message || '').toLowerCase()
            if (lowerMessage.includes('portfolio') || lowerMessage.includes('käufe') || lowerMessage.includes('holdings')) {
                primaryContext = 'superinvestor'
            } else if (lowerMessage.includes('quartal') || lowerMessage.includes('earnings') || lowerMessage.includes('kuv')) {
                primaryContext = 'stock'
            } else {
                primaryContext = 'superinvestor'
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

    return { contextType, detectedTicker, detectedInvestor, primaryContext, effectiveTicker, effectiveInvestor }
}

export function getContextualQuickPrompts(ticker?: string | null, investor?: string | null): QuickPrompt[] {
    const { contextType } = getHybridContext(ticker, investor)

    switch (contextType) {
        case 'stock':
            return [
                { id: 'stock-fundamentals', title: 'Fundamentalanalyse', prompt: ticker ? `Analysiere die fundamentalen Kennzahlen von ${ticker} und bewerte die Investmentqualität.` : 'Analysiere die fundamentalen Kennzahlen von {ticker} und bewerte die Investmentqualität.', icon: ChartBarIcon, category: 'analysis' },
                { id: 'stock-quarterly', title: 'Quartalszahlen', prompt: ticker ? `Wie waren die letzten Quartalsergebnisse von ${ticker}? Analyse der wichtigsten Entwicklungen.` : 'Analysiere die letzten Quartalszahlen von {ticker} und erkläre die wichtigsten Entwicklungen.', icon: DocumentTextIcon, category: 'analysis' },
                { id: 'stock-comparison', title: 'Marktvergleich', prompt: ticker ? `Vergleiche ${ticker} mit direkten Konkurrenten in der Branche.` : 'Vergleiche {ticker} mit den direkten Konkurrenten und bewerte die relative Stärke.', icon: ArrowTrendingUpIcon, category: 'comparison' },
                { id: 'stock-valuation', title: 'Bewertung', prompt: ticker ? `Ist ${ticker} aktuell fair bewertet? KUV, P/E, und andere Bewertungskennzahlen.` : 'Welche Hauptrisiken und Chancen siehst du bei einer Investition in {ticker}?', icon: CurrencyDollarIcon, category: 'analysis' }
            ]
        case 'superinvestor':
            return [
                { id: 'investor-strategy', title: 'Investment-Strategie', prompt: investor ? `Analysiere ${investor}s aktuelle Investmentstrategie basierend auf dem Portfolio.` : 'Analysiere die aktuelle Investmentstrategie des Investors.', icon: ChartBarIcon, category: 'analysis' },
                { id: 'investor-changes', title: 'Portfolio-Änderungen', prompt: investor ? `Was waren die wichtigsten Portfolio-Änderungen von ${investor} im letzten Quartal?` : 'Was waren die wichtigsten Portfolio-Änderungen im letzten Quartal?', icon: ArrowTrendingUpIcon, category: 'analysis' },
                { id: 'investor-holdings', title: 'Top Holdings', prompt: investor ? `Analysiere die größten Positionen im ${investor} Portfolio.` : 'Analysiere die größten Positionen im Portfolio.', icon: DocumentTextIcon, category: 'analysis' },
                { id: 'investor-risk', title: 'Risiko-Analyse', prompt: investor ? `Wie ist die Diversifikation und das Risikoprofil von ${investor}s Portfolio?` : 'Wie ist die Diversifikation und das Risikoprofil des Portfolios?', icon: ExclamationTriangleIcon, category: 'analysis' }
            ]
        default:
            return [
                { id: 'general-stock', title: 'Aktienanalyse', prompt: 'Analysiere Apple (AAPL) - Fundamentaldaten, Bewertung und Aussichten.', icon: ChartBarIcon, category: 'analysis' },
                { id: 'general-comparison', title: 'Marktvergleich', prompt: 'Vergleiche Microsoft, Apple und Google - welche ist die beste Investition?', icon: ArrowTrendingUpIcon, category: 'comparison' },
                { id: 'general-investor', title: 'Super-Investor', prompt: 'Was kauft Warren Buffett aktuell? Analysiere seine neuesten Portfolio-Bewegungen.', icon: DocumentTextIcon, category: 'analysis' },
                { id: 'general-market', title: 'Markt-Trends', prompt: 'Welche Sektoren und Trends dominieren den Markt 2025?', icon: SparklesIcon, category: 'market' }
            ]
    }
}

export function getInitialWelcomeMessage(ticker?: string | null, investor?: string | null, customMessage?: string): string {
    if (customMessage) return customMessage
    const { contextType } = getHybridContext(ticker, investor)

    switch (contextType) {
        case 'stock':
            return `Hallo! Ich bin Finclue AI. Lass uns über ${ticker!.toUpperCase()} sprechen. Ich habe Zugriff auf aktuelle Finanzdaten, Quartalszahlen, News und SEC-Filings.\n\nWas möchtest du über ${ticker!.toUpperCase()} wissen?`
        case 'superinvestor':
            return `Hallo! Ich bin dein AI-Assistent für ${investor} Portfolio-Analyse. Ich habe Zugriff auf die neuesten Portfolio-Daten und Filings.\n\nWas möchtest du über ${investor}s Portfolio wissen?`
        default:
            return `Hallo! Ich bin Finclue AI, dein intelligenter Finanzassistent. Ich erkenne automatisch, worüber du sprechen möchtest und lade die entsprechenden Daten.\n\nStelle einfach deine Frage - ich erkenne automatisch den Kontext!`
    }
}
