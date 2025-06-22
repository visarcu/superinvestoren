// scripts/loadEnv.ts - Gemeinsame Environment Loading Utility
import { readFileSync } from 'fs'
import { resolve } from 'path'

export function loadEnvFile(verbose: boolean = false) {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    
    if (verbose) {
      console.log('📁 Loading .env.local manually...')
    }
    
    let loaded = 0
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const equalIndex = trimmed.indexOf('=')
        const key = trimmed.substring(0, equalIndex).trim()
        const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '')
        
        if (key && value) {
          process.env[key] = value
          loaded++
        }
      }
    }
    
    if (verbose) {
      console.log(`✅ Loaded ${loaded} environment variables`)
    }
    
    return true
  } catch (error: any) {
    if (verbose) {
      console.log('❌ Could not load .env.local:', error?.message || error)
    }
    return false
  }
}

// Check if all required environment variables are available
export function checkRequiredEnvVars(): { missing: string[], available: string[] } {
  const required = ['OPENAI_API_KEY', 'PINECONE_API_KEY']
  const optional = ['FMP_API_KEY', 'NEXT_PUBLIC_FMP_API_KEY']
  
  const missing: string[] = []
  const available: string[] = []
  
  // Check required
  required.forEach(key => {
    if (process.env[key]) {
      available.push(key)
    } else {
      missing.push(key)
    }
  })
  
  // Check optional (FMP key in either location)
  const hasFmpKey = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY
  if (hasFmpKey) {
    available.push('FMP_API_KEY')
  } else {
    missing.push('FMP_API_KEY')
  }
  
  return { missing, available }
}

// Auto-load on import (with error handling)
loadEnvFile(false)