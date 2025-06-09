// src/components/OAuthDebugTest.tsx - Temporäres Debug Tool
'use client'
import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function OAuthDebugTest() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testOAuth = async () => {
    setLogs([])
    setLoading(true)
    
    try {
      addLog('🔍 Starting OAuth test...')
      
      // 1. Environment Check
      addLog(`📍 Current URL: ${window.location.origin}`)
      addLog(`📍 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
      
      // 2. Redirect URL Test
      const redirectTo = window.location.origin + '/auth/callback'
      addLog(`📍 Redirect URL: ${redirectTo}`)
      
      // 3. Session Check vor OAuth
      const { data: sessionBefore } = await supabase.auth.getSession()
      addLog(`👤 Current session: ${sessionBefore.session ? 'Logged in' : 'Not logged in'}`)
      
      // 4. OAuth Request
      addLog('🚀 Initiating Google OAuth...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        addLog(`❌ OAuth Error: ${error.message}`)
        addLog(`❌ Error Code: ${error.name}`)
        addLog(`❌ Error Details: ${JSON.stringify(error)}`)
      } else {
        addLog('✅ OAuth request initiated successfully')
        addLog(`📦 OAuth Data: ${JSON.stringify(data)}`)
        addLog('⏳ Redirecting to Google...')
      }
      
    } catch (error) {
      addLog(`💥 Catch Error: ${error}`)
      addLog(`💥 Error Type: ${typeof error}`)
      if (error instanceof Error) {
        addLog(`💥 Error Message: ${error.message}`)
        addLog(`💥 Error Stack: ${error.stack}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const checkSupabaseConnection = async () => {
    setLogs([])
    
    try {
      addLog('🔍 Testing Supabase connection...')
      
      // Test basic connection
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        addLog(`❌ Connection Error: ${error.message}`)
      } else {
        addLog('✅ Supabase connection OK')
        addLog(`📦 Session data: ${JSON.stringify(data.session ? 'Session exists' : 'No session')}`)
      }
      
      // Test environment
      addLog(`🔧 Supabase URL set: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`)
      addLog(`🔧 Supabase Key set: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`)
      
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
        addLog(`🔧 Supabase Domain: ${url.hostname}`)
        addLog(`🔧 Supabase Project: ${url.hostname.split('.')[0]}`)
      }
      
    } catch (error) {
      addLog(`💥 Connection test failed: ${error}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🔬 OAuth Debug Tool</h2>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={checkSupabaseConnection}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-4"
        >
          Test Supabase Connection
        </button>
        
        <button
          onClick={testOAuth}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 mr-4"
        >
          {loading ? 'Testing OAuth...' : 'Test Google OAuth'}
        </button>
        
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear Logs
        </button>
      </div>

      {/* Logs Display */}
      <div className="bg-black p-4 rounded-lg h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">Debug Logs:</h3>
        {logs.length === 0 ? (
          <p className="text-gray-400">No logs yet. Click a test button above.</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Environment Info */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Current Environment:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'SSR'}
          </div>
          <div>
            <strong>Timestamp:</strong> {new Date().toLocaleString()}
          </div>
          <div>
            <strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'Unknown'}
          </div>
          <div>
            <strong>Supabase URL Set:</strong> {!!process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}
          </div>
        </div>
      </div>
    </div>
  )
}