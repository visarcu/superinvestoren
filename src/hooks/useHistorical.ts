// hooks/useHistorical.ts
import useSWR from 'swr'

export function useHistorical(symbol: string) {
  return useSWR<{ date: string; close: number }[]>(
    `/api/historical/${symbol}`,
    fetcher,
    { refreshInterval: 1000 * 60 * 60 * 6 }
  )
}