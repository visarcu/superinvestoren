// src/app/api/admin/newsletter/subscribers/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    const { data: subscribers, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, created_at, status')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Subscribers fetch error:', error)
      return NextResponse.json({ error: 'Fehler beim Laden der Abonnenten' }, { status: 500 })
    }

    return NextResponse.json({ success: true, subscribers })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}