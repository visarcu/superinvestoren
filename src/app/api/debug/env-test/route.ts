import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlPreview: process.env.SUPABASE_URL?.substring(0, 30) + '...',
    serviceRolePreview: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
    timestamp: new Date().toISOString()
  });
}