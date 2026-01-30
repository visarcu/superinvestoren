import { NextResponse } from 'next/server'
import { getEnhancedPortfolioData } from '@/lib/superinvestorDataService'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from "@langchain/core/output_parsers"
import { stocks } from '@/data/stocks'

// --- CONSTANTS ---
const SUPERINVESTORS_TO_COMPARE = [
    { slug: 'buffett', name: 'Warren Buffett', style: 'Value & Quality' },
    { slug: 'burry', name: 'Michael Burry', style: 'Deep Value & Contrarian' },
    { slug: 'ackman', name: 'Bill Ackman', style: 'Activist Concentration' },
    { slug: 'dalio', name: 'Ray Dalio', style: 'Macro Diversification' },
    { slug: 'tepper', name: 'David Tepper', style: 'Distressed & Macro' },
    { slug: 'druckenmiller', name: 'Stanley Druckenmiller', style: 'Growth & Macro' }
]

// --- HELPER: Calculate Similarity ---
function calculateSimilarity(userHoldings: any[], investorHoldings: any[]) {
    // 1. Ticker Overlap (Jaccard Index-ish)
    const userTickers = new Set(userHoldings.map(h => h.symbol.toUpperCase()))
    const investorTickers = new Set(investorHoldings.map(h => h.ticker?.toUpperCase() || h.name.toUpperCase())) // Fallback name if ticker missing

    let sharedCount = 0
    userTickers.forEach(t => {
        if (investorTickers.has(t)) sharedCount++
    })

    const tickerSimilarity = (sharedCount / Math.max(userTickers.size, 1)) * 100

    // 2. Sector Overlap
    // Normalize user sectors
    const userSectors: Record<string, number> = {}
    userHoldings.forEach(h => {
        // Simple lookup from our stocks DB
        const stock = stocks.find(s => s.ticker === h.symbol)
        const sector = stock?.sector || 'Other'
        userSectors[sector] = (userSectors[sector] || 0) + (h.value || 0)
    })

    // Convert to percentages
    const userTotalValue = Object.values(userSectors).reduce((a, b) => a + b, 0)
    const userSectorPcts: Record<string, number> = {}
    Object.keys(userSectors).forEach(k => {
        userSectorPcts[k] = (userSectors[k] / userTotalValue) * 100
    })

    // Investor sectors (already computed in service)
    // We need to fetch this from the enhanced data call
    // For now, let's assume we pass the sectorAllocation object

    return { tickerSimilarity, sharedCount }
}

// --- HELPER: Cosine Similarity for Sectors ---
function calculateSectorSimilarity(userSectors: Record<string, number>, investorSectors: Record<string, number>) {
    const allSectors = new Set([...Object.keys(userSectors), ...Object.keys(investorSectors)])
    let dotProduct = 0
    let magA = 0
    let magB = 0

    allSectors.forEach(sector => {
        const valA = userSectors[sector] || 0
        const valB = investorSectors[sector] || 0
        dotProduct += valA * valB
        magA += valA * valA
        magB += valB * valB
    })

    if (magA === 0 || magB === 0) return 0
    return (dotProduct / (Math.sqrt(magA) * Math.sqrt(magB))) * 100 // 0-100 score
}


export async function POST(req: Request) {
    try {
        const { holdings, totalValue } = await req.json() // Expects list of { symbol, value, quantity }

        if (!holdings || holdings.length === 0) {
            return NextResponse.json({ error: 'No holdings provided' }, { status: 400 })
        }

        // 1. Analyze User Portfolio Basics
        // Calculate User Sector Allocation on the fly
        const userSectors: Record<string, number> = {}
        holdings.forEach((h: any) => {
            const stock = stocks.find(s => s.ticker === h.symbol)
            const sector = stock?.sector || 'Unknown'
            // Map generic sectors to match our Superinvestor data if needed, or keep broad
            userSectors[sector] = (userSectors[sector] || 0) + (h.value || 0)
        })

        // Normalize to %
        const userSectorPcts: Record<string, number> = {}
        Object.keys(userSectors).forEach(k => {
            userSectorPcts[k] = (userSectors[k] / totalValue) * 100
        })


        // 2. Compare against Superinvestors
        const comparisons = []

        for (const investor of SUPERINVESTORS_TO_COMPARE) {
            const data = getEnhancedPortfolioData(investor.slug)

            if (data) {
                // Ticker Overlap
                const { tickerSimilarity, sharedCount } = calculateSimilarity(holdings, data.topHoldings)

                // Sector Similarity
                const sectorSim = calculateSectorSimilarity(userSectorPcts, data.sectorAllocation)

                // Weighted Score: 40% Ticker Match, 60% Style/Sector Match
                // We give more weight to sector style because exact stock picking is rare
                const totalScore = (tickerSimilarity * 0.4) + (sectorSim * 0.6)

                comparisons.push({
                    investor: investor,
                    score: Math.round(totalScore),
                    details: {
                        sharedStocks: sharedCount,
                        sectorMatch: Math.round(sectorSim),
                        tickerMatch: Math.round(tickerSimilarity)
                    }
                })
            }
        }

        // Sort by match score
        comparisons.sort((a, b) => b.score - a.score)
        const bestMatch = comparisons[0]

        // 3. Generate AI "Roast" / Critique
        let aiParsed = {
            realityCheck: "Portfolio analysis unavailable.",
            verdict: "We matched your data, but our AI judge is currently on a coffee break.",
            tips: ["Check your API setup", "Review diversification manually", "Hold tight"]
        }

        try {
            // We want a persona: "Ruthless Wall Street Mentor"
            const openAI = new ChatOpenAI({
                openAIApiKey: process.env.OPENAI_API_KEY,
                temperature: 0.7,
                modelName: 'gpt-4o',
            })

            // Fetch full data for the best match to get detailed activity
            const matchData = getEnhancedPortfolioData(bestMatch.investor.slug)
            let sharedHoldingsContext = "No specific shared high-conviction plays found."

            if (matchData && matchData.topHoldings) {
                const shared = holdings.filter((h: any) =>
                    matchData.topHoldings.some((mh: any) => mh.ticker === h.symbol || mh.name === h.name)
                )

                if (shared.length > 0) {
                    sharedHoldingsContext = shared.map((h: any) => {
                        const matchHolding = matchData.topHoldings.find((mh: any) => mh.ticker === h.symbol || mh.name === h.name)
                        if (!matchHolding) return ''

                        let activity = "unchanged"
                        if (matchHolding.quarterlyChange) {
                            const { type, percentChange } = matchHolding.quarterlyChange
                            activity = `${type} by ${Math.abs(percentChange).toFixed(1)}%`
                        }

                        return `${h.symbol}: User holds it. ${bestMatch.investor.name} holds ${matchHolding.portfolioPercentage.toFixed(1)}% of their portfolio in it. Recent move: ${activity}.`
                    }).join('\n')
                }
            }

            const prompt = PromptTemplate.fromTemplate(`
          You are a ruthless, highly successful Wall Street hedge fund mentor. You do not mince words. You are analyzing a retail investor's portfolio.
          
          USER CONTEXT:
          - Portfolio Value: {totalValue} EUR
          - Top Positions: {topPositions}
          - Sector Allocation: {userSectors}
          
          COMPARISON:
          - The user's style is most similar to: {matchName} ({matchScore}% match).
          - Why? They share {sharedCount} stocks and have a {sectorMatch}% sector correlation.
          
          SHARED HOLDINGS INTEL (Use this strictly for factual accuracy):
          {sharedHoldingsContext}
          
          TASK:
          1. Give a "Brutal Reality Check" (1 sentence summary of their risk/style).
          2. Provide a "Superinvestor Verdict": Compare them to {matchName}. Are they a cheap knock-off or a worthy apprentice?
             IMPORTANT: If mentioning shared stocks like {sharedHoldingsContext}, refer to the "Recent move" data. If the superinvestor sold/reduced, MENTION IT. Do not say they bought if they sold.
          3. Give 3 bullet point actionable tips to improve (e.g. increase diversification, cut losers, buy more quality).
          
          TONE: Professional but sharp, witty, slightly arrogant but helpful. Like "Billions" or "Succession".
          OUTPUT FORMAT: JSON with keys: "realityCheck", "verdict", "tips" (array of strings).
        `)

            const topPosString = holdings
                .sort((a: any, b: any) => b.value - a.value)
                .slice(0, 5)
                .map((h: any) => `${h.symbol} (${((h.value / totalValue) * 100).toFixed(1)}%)`)
                .join(', ')

            const sectorString = Object.entries(userSectorPcts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([k, v]) => `${k}: ${v.toFixed(1)}%`)
                .join(', ')

            const chain = prompt.pipe(openAI).pipe(new StringOutputParser())
            const aiResponse = await chain.invoke({
                totalValue: Math.round(totalValue).toString(),
                topPositions: topPosString,
                userSectors: sectorString,
                matchName: bestMatch.investor.name,
                matchScore: bestMatch.score.toString(),
                sharedCount: bestMatch.details.sharedStocks.toString(),
                sectorMatch: bestMatch.details.sectorMatch.toString(),
                sharedHoldingsContext: sharedHoldingsContext
            })

            // Parse AI response
            const jsonMatch = aiResponse.toString().match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                aiParsed = JSON.parse(jsonMatch[0])
            }
        } catch (aiError) {
            console.warn('AI Roast Generation failed (falling back to static):', aiError)
            // Keep default aiParsed
        }

        return NextResponse.json({
            match: bestMatch,
            allComparisons: comparisons.slice(0, 3), // Return top 3 matches
            analysis: aiParsed
        })

    } catch (error: any) {
        console.error('Portfolio Audit Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
