// src/hooks/useChartPresets.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChartPreset, CreateChartPresetRequest, UpdateChartPresetRequest, LegacyCustomPreset } from '@/types/chartPresets'
import { supabase } from '@/lib/supabaseClient'

interface UseChartPresetsReturn {
  presets: ChartPreset[]
  loading: boolean
  error: string | null
  createPreset: (preset: CreateChartPresetRequest) => Promise<ChartPreset | null>
  updatePreset: (update: UpdateChartPresetRequest) => Promise<ChartPreset | null>
  deletePreset: (id: string) => Promise<boolean>
  refreshPresets: () => Promise<void>
}

export function useChartPresets(userId: string | null, isPremium: boolean): UseChartPresetsReturn {
  const [presets, setPresets] = useState<ChartPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session?.access_token) {
      throw new Error('No valid session')
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }, [])

  // Migrate legacy localStorage presets to Supabase
  const migrateLegacyPresets = useCallback(async () => {
    if (!userId || !isPremium) return

    try {
      const legacyKey = `chartPresets_${userId}`
      const legacyData = localStorage.getItem(legacyKey)
      
      if (!legacyData) return

      const legacyPresets: LegacyCustomPreset[] = JSON.parse(legacyData)
      
      if (legacyPresets.length === 0) return

      console.log(`🔄 Migrating ${legacyPresets.length} legacy presets to Supabase...`)

      // Migrate each preset
      for (const legacy of legacyPresets) {
        try {
          await createPreset({
            name: legacy.name,
            charts: legacy.charts
          })
        } catch (err) {
          console.warn(`Failed to migrate preset "${legacy.name}":`, err)
        }
      }

      // Remove legacy data after successful migration
      localStorage.removeItem(legacyKey)
      console.log('✅ Legacy presets migrated and removed from localStorage')
      
    } catch (err) {
      console.error('Failed to migrate legacy presets:', err)
    }
  }, [userId, isPremium])

  // Fetch presets from API or localStorage
  const fetchPresets = useCallback(async () => {
    if (!userId) {
      setPresets([])
      setLoading(false)
      return
    }

    try {
      setError(null)

      if (isPremium) {
        // Premium users: fetch from Supabase
        const headers = await getAuthHeaders()
        const response = await fetch('/api/chart-presets', {
          headers
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data = await response.json()
        setPresets(data)
      } else {
        // Free users: use localStorage
        const legacyKey = `chartPresets_${userId}`
        const legacyData = localStorage.getItem(legacyKey)
        
        if (legacyData) {
          const legacyPresets: LegacyCustomPreset[] = JSON.parse(legacyData)
          // Convert legacy format to new format
          const convertedPresets: ChartPreset[] = legacyPresets.map(legacy => ({
            id: legacy.id,
            user_id: userId,
            name: legacy.name,
            charts: legacy.charts,
            created_at: legacy.createdAt,
            updated_at: legacy.createdAt,
            last_used: legacy.lastUsed || null
          }))
          setPresets(convertedPresets)
        } else {
          setPresets([])
        }
      }
    } catch (err) {
      console.error('Failed to fetch presets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load presets')
      setPresets([])
    } finally {
      setLoading(false)
    }
  }, [userId, isPremium])

  // Create new preset
  const createPreset = useCallback(async (preset: CreateChartPresetRequest): Promise<ChartPreset | null> => {
    if (!userId) return null

    console.log('🔍 [createPreset] userId:', userId, 'isPremium:', isPremium)

    try {
      if (isPremium) {
        console.log('💾 [createPreset] Using Supabase for Premium user')
        // Premium users: save to Supabase
        const headers = await getAuthHeaders()
        const response = await fetch('/api/chart-presets', {
          method: 'POST',
          headers,
          body: JSON.stringify(preset)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const newPreset = await response.json()
        setPresets(prev => [newPreset, ...prev])
        return newPreset
      } else {
        console.log('💾 [createPreset] Using localStorage for Free user')
        // Free users: save to localStorage
        const newPreset: ChartPreset = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          user_id: userId,
          name: preset.name,
          charts: preset.charts,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        }

        const legacyKey = `chartPresets_${userId}`
        const existing = localStorage.getItem(legacyKey)
        const existingPresets: LegacyCustomPreset[] = existing ? JSON.parse(existing) : []
        
        const legacyPreset: LegacyCustomPreset = {
          id: newPreset.id,
          name: newPreset.name,
          charts: newPreset.charts,
          createdAt: newPreset.created_at,
          lastUsed: newPreset.last_used || undefined
        }

        const updatedPresets = [legacyPreset, ...existingPresets]
        localStorage.setItem(legacyKey, JSON.stringify(updatedPresets))
        
        setPresets(prev => [newPreset, ...prev])
        return newPreset
      }
    } catch (err) {
      console.error('Failed to create preset:', err)
      setError(err instanceof Error ? err.message : 'Failed to create preset')
      return null
    }
  }, [userId, isPremium])

  // Update preset
  const updatePreset = useCallback(async (update: UpdateChartPresetRequest): Promise<ChartPreset | null> => {
    if (!userId) return null

    try {
      if (isPremium) {
        // Premium users: update in Supabase
        const headers = await getAuthHeaders()
        const response = await fetch('/api/chart-presets', {
          method: 'PUT',
          headers,
          body: JSON.stringify(update)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const updatedPreset = await response.json()
        setPresets(prev => prev.map(p => p.id === update.id ? updatedPreset : p))
        return updatedPreset
      } else {
        // Free users: update in localStorage
        const legacyKey = `chartPresets_${userId}`
        const existing = localStorage.getItem(legacyKey)
        const existingPresets: LegacyCustomPreset[] = existing ? JSON.parse(existing) : []
        
        const updatedPresets = existingPresets.map(p => {
          if (p.id === update.id) {
            return {
              ...p,
              ...(update.name && { name: update.name }),
              ...(update.charts && { charts: update.charts }),
              ...(update.lastUsed && { lastUsed: update.lastUsed })
            }
          }
          return p
        })

        localStorage.setItem(legacyKey, JSON.stringify(updatedPresets))
        
        // Update local state
        setPresets(prev => prev.map(p => {
          if (p.id === update.id) {
            return {
              ...p,
              ...(update.name && { name: update.name }),
              ...(update.charts && { charts: update.charts }),
              ...(update.lastUsed && { last_used: update.lastUsed }),
              updated_at: new Date().toISOString()
            }
          }
          return p
        }))

        return presets.find(p => p.id === update.id) || null
      }
    } catch (err) {
      console.error('Failed to update preset:', err)
      setError(err instanceof Error ? err.message : 'Failed to update preset')
      return null
    }
  }, [userId, isPremium, presets])

  // Delete preset
  const deletePreset = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false

    try {
      if (isPremium) {
        // Premium users: delete from Supabase
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/chart-presets?id=${id}`, {
          method: 'DELETE',
          headers
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        setPresets(prev => prev.filter(p => p.id !== id))
        return true
      } else {
        // Free users: delete from localStorage
        const legacyKey = `chartPresets_${userId}`
        const existing = localStorage.getItem(legacyKey)
        const existingPresets: LegacyCustomPreset[] = existing ? JSON.parse(existing) : []
        
        const updatedPresets = existingPresets.filter(p => p.id !== id)
        localStorage.setItem(legacyKey, JSON.stringify(updatedPresets))
        
        setPresets(prev => prev.filter(p => p.id !== id))
        return true
      }
    } catch (err) {
      console.error('Failed to delete preset:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete preset')
      return false
    }
  }, [userId, isPremium])

  // Initial load and migration
  useEffect(() => {
    const init = async () => {
      await fetchPresets()
      if (isPremium) {
        await migrateLegacyPresets()
      }
    }
    init()
  }, [fetchPresets, migrateLegacyPresets, isPremium])

  return {
    presets,
    loading,
    error,
    createPreset,
    updatePreset,
    deletePreset,
    refreshPresets: fetchPresets
  }
}