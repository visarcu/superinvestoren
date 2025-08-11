// src/hooks/useInvestorData.ts
import { useState, useEffect } from 'react'
import holdingsHistory from '@/data/holdings'

export function useInvestorData(slug: string) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simuliere Ladezeit für bessere UX
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Kleine Verzögerung für Loading State (kann später entfernt werden)
        await new Promise(resolve => setTimeout(resolve, 300))
        
        const investorData = holdingsHistory[slug]
        if (!investorData) {
          throw new Error('Investor nicht gefunden')
        }
        
        setData(investorData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [slug])

  return { data, isLoading, error }
}