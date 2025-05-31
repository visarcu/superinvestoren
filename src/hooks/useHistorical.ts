// src/hooks/useHistorical.ts
import useSWR from 'swr'

// Ein einfacher Fetcher, der per fetch() Daten abruft und als JSON zurückgibt:
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error(`Fehler beim Laden von ${url}: ${res.statusText}`)
  }
  return res.json()
})

export function useHistorical(symbol: string) {
  // SWR‐Key: hier rufen wir unsere eigene API‐Route /api/historical/[symbol] auf.
  // Der fetcher wandelt die Antwort in ein Array von { date: string; close: number } um.
  return useSWR<{ date: string; close: number }[]>(
    `/api/historical/${symbol}`,
    fetcher,
    {
      // Revalidiere alle 6 Stunden automatisch
      refreshInterval: 1000 * 60 * 60 * 6,
    }
  )
}