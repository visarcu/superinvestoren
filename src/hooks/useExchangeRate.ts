import { useState, useEffect } from 'react'
import { currencySymbol } from '@/lib/displayFormat'

interface ExchangeRateData {
  from: string
  to: string
  rate: number
  timestamp: number
}

// Umrechnungskurs für die Nebenzeile unter dem Kurs ("≈ 43,10 € bei 0,862
// USD/EUR"). Die Ausgangswährung ist die Handelswährung des Tickers; früher
// war sie fest USD, sodass bei SAP.DE oder ULVR.L ein Euro-Gegenwert mit
// USD/EUR-Kurs stand.
export function useExchangeRate(fromCurrency: string = 'USD', toCurrency: string = 'EUR') {
  const sameCurrency = fromCurrency === toCurrency
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(!sameCurrency)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    if (sameCurrency) {
      setExchangeRate(1)
      setLoading(false)
      setError(null)
      return () => { mounted = false }
    }

    async function fetchExchangeRate() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/exchange-rate?from=${fromCurrency}&to=${toCurrency}`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data: ExchangeRateData = await response.json()

        if (mounted) {
          setExchangeRate(data.rate)
        }
      } catch (err) {
        if (mounted) {
          console.warn('Could not fetch exchange rate:', err)
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchExchangeRate()

    return () => {
      mounted = false
    }
  }, [fromCurrency, toCurrency, sameCurrency])

  const formatAmount = (value: number, digits: number) =>
    value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })

  /** Kurs in der Ausgangswährung plus Gegenwert in der Zielwährung; kein Gegenwert bei gleicher Währung oder fehlendem Kurs. */
  const formatPriceWithExchangeInfo = (amount: number): { primary: string; equivalent: string | null } => {
    const primary = `${formatAmount(amount, 2)} ${currencySymbol(fromCurrency)}`

    if (sameCurrency || !exchangeRate || loading || error) {
      return { primary, equivalent: null }
    }

    const converted = amount * exchangeRate
    const equivalent = `≈ ${formatAmount(converted, 2)} ${currencySymbol(toCurrency)} (bei ${formatAmount(exchangeRate, 3)} ${fromCurrency}/${toCurrency})`

    return { primary, equivalent }
  }

  return {
    exchangeRate,
    loading,
    error,
    formatPriceWithExchangeInfo
  }
}
