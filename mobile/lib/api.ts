const BASE_URL = 'https://finclue.de';

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// Quotes
export async function getQuote(ticker: string) {
  return apiFetch(`/api/quote/${ticker}`);
}

export async function getMultipleQuotes(tickers: string[]) {
  return apiFetch(`/api/quotes?symbols=${tickers.join(',')}`);
}

// Company
export async function getCompanyProfile(ticker: string) {
  return apiFetch(`/api/company-profile/${ticker}`);
}

// Search
export async function searchStocks(query: string) {
  return apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
}

// Watchlist (authenticated)
export async function getWatchlist(token: string) {
  return apiFetch('/api/watchlist', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function addToWatchlist(ticker: string, token: string) {
  return apiFetch('/api/watchlist', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ticker }),
  });
}

// Portfolio (authenticated)
export async function getPortfolio(token: string) {
  return apiFetch('/api/portfolio', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Superinvestors
export async function getSuperinvestors() {
  return apiFetch('/api/investor/list');
}

export async function getInvestorPortfolio(slug: string) {
  return apiFetch(`/api/investor/${slug}`);
}

// Market Overview
export async function getMarketQuotes() {
  return apiFetch('/api/quotes?symbols=SPY,QQQ,DIA,BTC/USD');
}
