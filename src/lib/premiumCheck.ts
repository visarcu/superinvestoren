// src/lib/premiumCheck.ts
import { supabase } from '@/lib/supabaseClient'

export interface UserPremiumStatus {
  isPremium: boolean
  userId: string
}

export const checkUserPremiumStatus = async (): Promise<UserPremiumStatus | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Check premium status from profiles table (same as other portfolio pages)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error checking premium status from profiles:', error)
      // Fallback: try User table with isPremium
      const { data: userData, error: userError } = await supabase
        .from('User')
        .select('isPremium')
        .eq('id', user.id)
        .single()
      
      if (userError) {
        console.error('Error checking premium status from User table:', userError)
        return { isPremium: false, userId: user.id }
      }
      
      return {
        isPremium: userData?.isPremium || false,
        userId: user.id
      }
    }

    return {
      isPremium: profile?.is_premium || false,
      userId: user.id
    }
  } catch (error) {
    console.error('Error in checkUserPremiumStatus:', error)
    return null
  }
}

export const getPortfolioLimits = (isPremium: boolean) => {
  return {
    maxPortfolios: isPremium ? 999 : 1, // Unlimited vs 1 portfolio
    canAccessMultiPortfolio: isPremium,
    canAccessAdvancedAnalytics: isPremium,
    canExportData: isPremium
  }
}