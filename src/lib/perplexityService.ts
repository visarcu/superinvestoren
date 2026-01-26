// src/lib/perplexityService.ts
export interface PerplexityResponse {
    content: string
    source: string
}

export async function queryPerplexity(ticker: string, query: string): Promise<PerplexityResponse | null> {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) return null

    try {
        const prompt = `Aktuelle Marktsituation für ${ticker}: ${query}\n\nFasse die neuesten Entwicklungen der letzten 24-48 Stunden kurz zusammen. Konzentriere dich auf Fakten, Preisbewegungen und offizielle Ankündigungen. Antworte auf Deutsch.`

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    { role: 'system', content: 'Du bist ein Finanzmarkt-Analyst. Antworte präzise, faktenbasiert und auf Deutsch.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        })

        if (!response.ok) return null

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''

        return {
            content: content.replace(/\[\d+\]/g, '').trim(),
            source: 'Perplexity AI (Echtzeit-Websuche)'
        }
    } catch (error) {
        console.error('Perplexity Service Error:', error)
        return null
    }
}
