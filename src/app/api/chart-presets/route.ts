// src/app/api/chart-presets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify JWT token
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Fetch user's chart presets
    const { data: presets, error } = await supabaseService
      .from('chart_presets')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching chart presets:', error)
      return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 })
    }

    return NextResponse.json(presets || [])
  } catch (error) {
    console.error('Chart presets GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify JWT token
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { name, charts } = await request.json()

    if (!name || !charts || !Array.isArray(charts) || charts.length === 0) {
      return NextResponse.json({ error: 'Name and charts array required' }, { status: 400 })
    }

    console.log('🔍 [POST] Creating preset for userId:', user.id)

    // Create new preset
    const { data: preset, error } = await supabaseService
      .from('chart_presets')
      .insert({
        user_id: user.id,
        name: name.trim(),
        charts,
        last_used: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating chart preset:', error)
      return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 })
    }

    return NextResponse.json(preset)
  } catch (error) {
    console.error('Chart presets POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify JWT token
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id, name, charts, lastUsed } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Preset ID required' }, { status: 400 })
    }

    // Build update object
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (charts !== undefined) updateData.charts = charts
    if (lastUsed !== undefined) updateData.last_used = lastUsed

    // Update preset (RLS ensures user can only update their own)
    const { data: preset, error } = await supabaseService
      .from('chart_presets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Extra security check
      .select()
      .single()

    if (error) {
      console.error('Error updating chart preset:', error)
      return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 })
    }

    return NextResponse.json(preset)
  } catch (error) {
    console.error('Chart presets PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify JWT token
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Preset ID required' }, { status: 400 })
    }

    // Delete preset (RLS ensures user can only delete their own)
    const { error } = await supabaseService
      .from('chart_presets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Extra security check

    if (error) {
      console.error('Error deleting chart preset:', error)
      return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chart presets DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}