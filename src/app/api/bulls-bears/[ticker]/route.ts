
// src/app/api/bulls-bears/[ticker]/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FinancialData {
  ticker: string;
  marketCap: number;
  pe: number;
  profitMargin: number;
  revenueGrowth: number;
  grossMargin: number;
  debtToEquity: number;
  sector: string;
  beta: number;
  dividendYield?: number;
  currentRatio: number;
}

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();

  try {
    // 1. Sammle Finanzdaten (nutzt eure bestehende FMP API)
    const financialData = await gatherFinancialData(ticker);
    
    // 2. Generiere Bulls/Bears mit OpenAI
    const bullsBears = await generateBullsBearsWithAI(financialData);

    return NextResponse.json({
      ticker,
      bulls: bullsBears.bulls,
      bears: bullsBears.bears,
      lastUpdated: new Date().toISOString(),
      source: 'openai_generated'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400' // 7 days cache
      }
    });

  } catch (error) {
    console.error('Bulls/Bears generation error:', error);
    
    // Fallback: Einfache regel-basierte Generierung
    const fallback = generateSimpleFallback(ticker);
    return NextResponse.json(fallback);
  }
}

async function gatherFinancialData(ticker: string): Promise<FinancialData> {
  const baseUrl = 'https://financialmodelingprep.com/api/v3';
  const apiKey = process.env.FMP_API_KEY;

  try {
    // Parallel alle benötigten Daten holen (nutzt eure bestehende API-Struktur)
    const [profileRes, ratiosRes, metricsRes, quoteRes] = await Promise.all([
      fetch(`${baseUrl}/profile/${ticker}?apikey=${apiKey}`, { cache: 'force-cache' }),
      fetch(`${baseUrl}/ratios/${ticker}?period=annual&limit=1&apikey=${apiKey}`, { cache: 'force-cache' }),
      fetch(`${baseUrl}/key-metrics/${ticker}?period=annual&limit=1&apikey=${apiKey}`, { cache: 'force-cache' }),
      fetch(`${baseUrl}/quote/${ticker}?apikey=${apiKey}`)
    ]);

    const [profileData] = await profileRes.json();
    const [ratioData] = await ratiosRes.json();
    const [metricData] = await metricsRes.json();
    const [quoteData] = await quoteRes.json();

    return {
      ticker,
      marketCap: quoteData?.marketCap || 0,
      pe: ratioData?.priceEarningsRatio || 0,
      profitMargin: ratioData?.netProfitMargin || 0,
      revenueGrowth: metricData?.revenueGrowth || 0,
      grossMargin: ratioData?.grossProfitMargin || 0,
      debtToEquity: ratioData?.debtEquityRatio || 0,
      sector: profileData?.sector || 'Unknown',
      beta: profileData?.beta || 1,
      currentRatio: ratioData?.currentRatio || 0,
      dividendYield: metricData?.dividendYield || 0
    };
  } catch (error) {
    console.error('Failed to gather financial data:', error);
    throw error;
  }
}

async function generateBullsBearsWithAI(data: FinancialData) {
  // Formatiere die Finanzdaten für den Prompt
  const formatNumber = (num: number, suffix = '') => 
    num ? `${num.toFixed(2)}${suffix}` : 'N/A';

  const prompt = `
Analysiere die folgenden Finanzdaten für ${data.ticker} und erstelle jeweils 3-4 prägnante Bulls/Bears-Punkte auf Deutsch.

FINANZDATEN:
- Unternehmen: ${data.ticker}
- Sektor: ${data.sector}
- Marktkapitalisierung: $${(data.marketCap / 1e9).toFixed(1)} Milliarden
- KGV (P/E): ${formatNumber(data.pe)}
- Nettogewinnmarge: ${formatNumber(data.profitMargin * 100, '%')}
- Bruttomarge: ${formatNumber(data.grossMargin * 100, '%')}
- Umsatzwachstum: ${formatNumber(data.revenueGrowth * 100, '%')}
- Debt/Equity Ratio: ${formatNumber(data.debtToEquity)}
- Beta: ${formatNumber(data.beta)}
- Current Ratio: ${formatNumber(data.currentRatio)}
${data.dividendYield ? `- Dividendenrendite: ${formatNumber(data.dividendYield * 100, '%')}` : ''}

AUFGABE:
Erstelle Bulls/Bears-Punkte die:
1. Für normale Privatanleger verständlich sind
2. Spezifisch und datenbasiert sind (nutze die konkreten Zahlen!)
3. Aktuelle Markttrends berücksichtigen
4. Jeweils 1-2 prägnante Sätze lang sind
5. Professionell aber zugänglich formuliert sind

ANTWORT-FORMAT (genau so verwenden):
BULLS:
- [Konkreter Bull-Punkt mit Zahlen]
- [Weiterer Bull-Punkt]
- [Dritter Bull-Punkt]

BEARS:
- [Konkreter Bear-Punkt mit Zahlen]  
- [Weiterer Bear-Punkt]
- [Dritter Bear-Punkt]

Verwende keine zusätzlichen Formatierungen oder Erklärungen.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Günstig und hochwertig
      messages: [
        {
          role: "system",
          content: "Du bist ein erfahrener deutscher Finanzanalyst. Erstelle objektive, datenbasierte Bulls/Bears-Analysen auf Deutsch für Privatanleger. Antworte nur mit dem gewünschten Format, ohne zusätzliche Erklärungen."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Konsistent, weniger kreativ
      max_tokens: 800,
      top_p: 0.9
    });

    const response = completion.choices[0].message.content || '';

        // UTF-8 Fix hinzufügen:
const cleanedResponse = response
.replace(/Ã¤/g, 'ä')
.replace(/Ã¼/g, 'ü') 
.replace(/Ã¶/g, 'ö')
.replace(/ÃŸ/g, 'ß');

return parseBullsBearsResponse(cleanedResponse);

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

function parseBullsBearsResponse(response: string) {
  const bulls = [];
  const bears = [];
  
  const lines = response.split('\n').filter(line => line.trim());
  let currentSection = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.toUpperCase().includes('BULLS')) {
      currentSection = 'bulls';
      continue;
    }
    
    if (trimmed.toUpperCase().includes('BEARS')) {
      currentSection = 'bears';
      continue;
    }
    
    if (trimmed.startsWith('-') && trimmed.length > 5) {
      const text = trimmed.substring(1).trim();
      
      if (currentSection === 'bulls' && text) {
        bulls.push({
          id: `bull-${bulls.length + 1}`,
          text,
          category: categorizeBullBear(text)
        });
      } else if (currentSection === 'bears' && text) {
        bears.push({
          id: `bear-${bears.length + 1}`,
          text,
          category: categorizeBullBear(text)
        });
      }
    }
  }
  
  return { bulls, bears };
}

function categorizeBullBear(text: string): 'financial' | 'market' | 'competitive' | 'risk' {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('marge') || lowerText.includes('gewinn') || lowerText.includes('kgv') || lowerText.includes('bilanz') || lowerText.includes('verschuldung')) {
    return 'financial';
  }
  if (lowerText.includes('wachstum') || lowerText.includes('markt') || lowerText.includes('nachfrage') || lowerText.includes('umsatz')) {
    return 'market';
  }
  if (lowerText.includes('konkurrenz') || lowerText.includes('wettbewerb') || lowerText.includes('position') || lowerText.includes('führend')) {
    return 'competitive';
  }
  return 'risk';
}

// Fallback ohne OpenAI (für Fehlerfall)
function generateSimpleFallback(ticker: string) {
  return {
    ticker,
    bulls: [
      {
        id: 'fallback-bull-1',
        text: 'Aktualisierte Analyse wird geladen...',
        category: 'financial'
      }
    ],
    bears: [
      {
        id: 'fallback-bear-1', 
        text: 'Aktualisierte Analyse wird geladen...',
        category: 'risk'
      }
    ],
    source: 'fallback'
  };
}