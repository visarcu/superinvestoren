// Currency detection and conversion helpers
// Mirrors the logic in src/lib/fmp.ts and src/hooks/usePortfolio.ts

const BASE_URL = 'https://finclue.de';

export type TickerCurrency = 'EUR' | 'USD' | 'GBP' | 'CAD' | 'JPY' | 'CHF' | 'AUD';

/** Detect the currency a stock is quoted in based on its ticker suffix. */
export function detectTickerCurrency(ticker: string): TickerCurrency {
  if (!ticker) return 'USD';
  if (/\.(DE|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU)$/i.test(ticker)) return 'EUR';
  if (ticker.endsWith('.L')) return 'GBP'; // LSE prices in pence (GBX)
  if (ticker.endsWith('.TO') || ticker.endsWith('.V')) return 'CAD';
  if (ticker.endsWith('.T')) return 'JPY';
  if (ticker.endsWith('.SW') || ticker.endsWith('.S')) return 'CHF';
  if (ticker.endsWith('.AX')) return 'AUD';
  return 'USD';
}

// Module-level cache (5 min TTL, matches web)
let rateCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface ExchangeRates {
  USD: number;
  GBP: number;
  CAD: number;
  JPY: number;
  CHF: number;
  AUD: number;
  EUR: number;
}

/** Fetch all needed exchange rates to EUR. Cached for 5 min. */
export async function getEURRates(): Promise<ExchangeRates> {
  if (rateCache && Date.now() - rateCache.fetchedAt < CACHE_TTL_MS) {
    return rateCache.rates as ExchangeRates;
  }

  const currencies: Array<keyof ExchangeRates> = ['USD', 'GBP', 'CAD', 'JPY', 'CHF', 'AUD'];
  const results = await Promise.all(
    currencies.map(async (from) => {
      try {
        const res = await fetch(`${BASE_URL}/api/exchange-rate?from=${from}&to=EUR`);
        if (!res.ok) return [from, null] as const;
        const data = await res.json();
        return [from, typeof data.rate === 'number' ? data.rate : null] as const;
      } catch {
        return [from, null] as const;
      }
    })
  );

  const rates: ExchangeRates = {
    USD: 0.92, GBP: 1.17, CAD: 0.68, JPY: 0.0062, CHF: 1.05, AUD: 0.61, EUR: 1,
  };
  for (const [cur, rate] of results) {
    if (rate != null) (rates as any)[cur] = rate;
  }

  rateCache = { rates: rates as any, fetchedAt: Date.now() };
  return rates;
}

/** Convert a stock's price (in its native currency) to EUR. */
export function toEUR(price: number, ticker: string, rates: ExchangeRates): number {
  const cur = detectTickerCurrency(ticker);
  if (cur === 'EUR') return price;
  if (cur === 'GBP') return (price / 100) * rates.GBP; // .L prices in pence
  return price * (rates[cur] || 1);
}
