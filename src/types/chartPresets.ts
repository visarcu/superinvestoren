// src/types/chartPresets.ts

export interface ChartPreset {
  id: string
  user_id: string
  name: string
  charts: string[]
  created_at: string
  updated_at: string
  last_used: string | null
}

export interface CreateChartPresetRequest {
  name: string
  charts: string[]
}

export interface UpdateChartPresetRequest {
  id: string
  name?: string
  charts?: string[]
  lastUsed?: string
}

// Legacy interface für LocalStorage Kompatibilität
export interface LegacyCustomPreset {
  id: string
  name: string
  charts: string[]
  createdAt: string
  lastUsed?: string
}