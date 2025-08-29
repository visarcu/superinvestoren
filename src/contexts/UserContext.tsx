// User Context - Eliminates redundant auth calls across pages
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_status?: string
  is_premium?: boolean
  created_at: string
}

interface UserContextType {
  // Auth state
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  isPremium: boolean
  
  // Auth functions
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  
  // Profile functions
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ SINGLE AUTH CHECK ON APP START
  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
        }

        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            await loadUserProfile(session.user.id)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // ✅ LISTEN TO AUTH CHANGES
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            await loadUserProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ✅ LOAD USER PROFILE DATA
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Profile loading error:', error)
        return
      }

      if (data) {
        setProfile({
          ...data,
          is_premium: data.subscription_status === 'active'
        })
        console.log(`✅ Loaded user profile for ${data.full_name || data.email}`)
      } else {
        // Create default profile if none exists
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: '',
            subscription_status: 'inactive'
          })
          .select()
          .single()

        if (!createError && newProfile) {
          setProfile({
            ...newProfile,
            is_premium: false
          })
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // ✅ AUTH FUNCTIONS
  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setLoading(false)
  }

  const refreshUser = async () => {
    if (!user) return
    await loadUserProfile(user.id)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) {
      setProfile({ ...profile, ...data, is_premium: data.subscription_status === 'active' })
    }

    return { error }
  }

  const value: UserContextType = {
    // State
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isPremium: profile?.is_premium || false,
    
    // Functions
    signIn,
    signOut,
    refreshUser,
    updateProfile
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

// ✅ CUSTOM HOOK
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// ✅ UTILITY HOOKS FOR SPECIFIC USE CASES
export function useAuth() {
  const { user, isAuthenticated, loading, signIn, signOut } = useUser()
  return { user, isAuthenticated, loading, signIn, signOut }
}

export function useProfile() {
  const { profile, isPremium, updateProfile, refreshUser } = useUser()
  return { profile, isPremium, updateProfile, refreshUser }
}