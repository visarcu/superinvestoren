// lib/widget-helpers.ts
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface WidgetApiKey {
  id: string
  user_id: string
  api_key: string
  tier: 'basic' | 'pro' | 'enterprise'
  usage_count: number
  monthly_limit: number
  last_used: string | null
  created_at: string
  is_active: boolean
  allowed_domains: string[]
}

export interface ApiKeyValidationResult {
  isValid: boolean
  keyData?: WidgetApiKey
  error?: string
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  const prefix = 'fw_' // finclue widget
  const randomBytes = crypto.randomBytes(32).toString('hex')
  return `${prefix}${randomBytes}`
}

/**
 * Validate API key and check rate limits
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  try {
    if (!apiKey || !apiKey.startsWith('fw_')) {
      return { isValid: false, error: 'Invalid API key format' }
    }

    // Handle demo API key for development/demo purposes
    if (apiKey === 'fw_demo_1234567890abcdef') {
      return {
        isValid: true,
        keyData: {
          id: 'demo',
          user_id: 'demo-user',
          api_key: apiKey,
          tier: 'pro',
          usage_count: 0,
          monthly_limit: 10000,
          last_used: null,
          created_at: new Date().toISOString(),
          is_active: true,
          allowed_domains: [] // No domain restrictions for demo
        }
      }
    }

    const { data: keyData, error } = await supabaseAdmin
      .from('widget_api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (error || !keyData) {
      return { isValid: false, error: 'API key not found or inactive' }
    }

    // Check monthly limit
    if (keyData.usage_count >= keyData.monthly_limit) {
      return { isValid: false, error: 'Monthly usage limit exceeded' }
    }

    // Check rate limiting (30 requests per minute)
    if (keyData.last_used) {
      const lastUsed = new Date(keyData.last_used)
      const now = new Date()
      const timeDiff = now.getTime() - lastUsed.getTime()
      const minutesDiff = timeDiff / (1000 * 60)

      // Simple rate limiting: if last request was less than 2 seconds ago, reject
      if (timeDiff < 2000) {
        return { isValid: false, error: 'Rate limit exceeded. Please wait a moment.' }
      }
    }

    return { isValid: true, keyData }
  } catch (error) {
    console.error('Error validating API key:', error)
    return { isValid: false, error: 'Internal server error' }
  }
}

/**
 * Increment usage count for API key
 */
export async function incrementUsage(apiKey: string): Promise<void> {
  try {
    // Skip usage increment for demo API key
    if (apiKey === 'fw_demo_1234567890abcdef') {
      return
    }

    const { error } = await supabaseAdmin.rpc('widget_increment_usage', { 
      api_key_param: apiKey 
    })
    
    if (error) {
      console.error('Error incrementing usage:', error)
    }
  } catch (error) {
    console.error('Error incrementing usage:', error)
  }
}

/**
 * Check domain whitelist
 */
export function isDomainAllowed(allowedDomains: string[], requestDomain: string): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true // No restrictions
  }

  // Extract domain from URL
  try {
    const domain = new URL(requestDomain).hostname
    return allowedDomains.some(allowed => 
      allowed === '*' || 
      domain === allowed || 
      domain.endsWith('.' + allowed)
    )
  } catch {
    return false
  }
}

/**
 * Rate limiting with in-memory cache (for production, use Redis)
 */
const rateLimitCache = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(apiKey: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = `rate_limit:${apiKey}`
  
  let rateLimitData = rateLimitCache.get(key)
  
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitData = { count: 0, resetTime: now + windowMs }
  }
  
  rateLimitData.count++
  rateLimitCache.set(key, rateLimitData)
  
  return rateLimitData.count <= maxRequests
}

/**
 * Get tier limits
 */
export function getTierLimits(tier: string) {
  const limits = {
    basic: { monthlyLimit: 1000, rateLimit: 30 },
    pro: { monthlyLimit: 10000, rateLimit: 100 },
    enterprise: { monthlyLimit: 100000, rateLimit: 500 }
  }
  
  return limits[tier as keyof typeof limits] || limits.basic
}