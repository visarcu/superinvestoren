// src/app/api/auth/patreon/refresh/route.ts - Einfache Version
import { NextResponse } from 'next/server';

export async function POST() {
  // Erstmal nicht implementiert
  return NextResponse.json({ 
    message: 'Token refresh not implemented yet' 
  }, { status: 501 });
}