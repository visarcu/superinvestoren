import { useState, useEffect } from 'react'

interface ExchangeRateData {
  from: string
  to: string
  rate: number
  timestamp: number
}

export function useExchangeRate(fromCurrency: string = 'USD', toCurrency: string = 'EUR') {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

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
  }, [fromCurrency, toCurrency])

  // Helper function to format price with EUR equivalent
  const formatPriceWithExchangeInfo = (usdAmount: number): { primary: string; equivalent: string | null } => {
    const primary = `${usdAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
    
    if (!exchangeRate || loading || error) {
      return { primary, equivalent: null }
    }

    const eurAmount = usdAmount * exchangeRate
    const equivalent = `≈ ${eurAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € (bei ${exchangeRate.toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} USD/EUR)`

    return { primary, equivalent }
  }

  return {
    exchangeRate,
    loading,
    error,
    formatPriceWithExchangeInfo
  }
}