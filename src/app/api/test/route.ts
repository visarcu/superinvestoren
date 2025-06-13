import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🧪 TEST: API route working');
  return NextResponse.json({ message: 'API working' });
}

export async function POST() {
  console.log('🧪 TEST: POST request received');
  return NextResponse.json({ message: 'POST working' });
}