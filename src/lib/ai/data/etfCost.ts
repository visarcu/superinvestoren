// src/lib/ai/data/etfCost.ts
// Laufende Kosten (TER) eines ETFs. Anbieter senken sie immer wieder, deshalb
// zuerst die Live-Angabe, dann die gepflegten Listen.

import { xetraETFs } from '@/data/xetraETFsComplete'
import { getETFBySymbol } from '@/lib/etfUtils'
import { finite, fmpList } from './fmp'

const plausible = (v: number | null | undefined): v is number => v != null && v > 0 && v < 5

export async function etfCost(symbol: string, isin: string | null): Promise<number | null> {
  const live = await fmpList<any>('/api/v4/etf-info', { symbol }, { revalidate: 7 * 86400 })
  const ter = finite(live[0]?.expenseRatio)
  // Nur, wenn die Angabe sicher denselben Fonds meint
  if (plausible(ter) && (!isin || !live[0]?.isin || live[0].isin === isin)) return ter
  const listed = (isin && xetraETFs.find(e => e.isin === isin)) || xetraETFs.find(e => e.symbol === symbol)
  if (listed && plausible(listed.ter)) return listed.ter
  const known = getETFBySymbol(symbol)?.ter
  return plausible(known) ? known : null
}
