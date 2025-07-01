// src/app/api/portfolio/[id]/route.ts - Individual Position CRUD
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface PortfolioPosition {
  id?: number
  ticker?: string
  company_name?: string
  shares?: number
  avg_price?: number
  currency?: string
  purchase_date?: string
  purchase_notes?: string
}

// ✅ PUT - Update position
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Auth check
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const positionId = parseInt(params.id)
    const body: Partial<PortfolioPosition> = await request.json()

    if (isNaN(positionId)) {
      return NextResponse.json({ error: 'Invalid position ID' }, { status: 400 })
    }

    // Verify ownership
    const { data: existingPosition, error: fetchError } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingPosition) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    // Build update object
    const updateData: any = {}
    
    if (body.shares !== undefined) {
      if (body.shares <= 0) {
        return NextResponse.json({ error: 'Shares must be positive' }, { status: 400 })
      }
      updateData.shares = body.shares
    }
    
    if (body.avg_price !== undefined) {
      if (body.avg_price <= 0) {
        return NextResponse.json({ error: 'Average price must be positive' }, { status: 400 })
      }
      updateData.avg_price = body.avg_price
    }

    if (body.purchase_date !== undefined) {
      updateData.purchase_date = body.purchase_date
    }

    if (body.purchase_notes !== undefined) {
      updateData.purchase_notes = body.purchase_notes
    }

    // Update position
    const { data: updatedPosition, error: updateError } = await supabase
      .from('portfolio_positions')
      .update(updateData)
      .eq('id', positionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Position update error:', updateError)
      return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      position: updatedPosition,
      message: 'Position updated successfully'
    })

  } catch (error) {
    console.error('Portfolio PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ✅ DELETE - Remove position
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Auth check
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const positionId = parseInt(params.id)

    if (isNaN(positionId)) {
      return NextResponse.json({ error: 'Invalid position ID' }, { status: 400 })
    }

    // Verify ownership and delete
    const { error: deleteError } = await supabase
      .from('portfolio_positions')
      .delete()
      .eq('id', positionId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Position delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Position deleted successfully'
    })

  } catch (error) {
    console.error('Portfolio DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}