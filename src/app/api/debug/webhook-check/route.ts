import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const testEvent = {
      id: 'evt_test_webhook_check',
      object: 'event',
      type: 'webhook.check',
      created: Date.now(),
    };

    console.log('✅ Webhook-Check empfangen:', testEvent);
    return NextResponse.json({ status: 'ok', received_event: testEvent });

  } catch (err) {
    console.error('❌ Fehler beim Webhook-Check:', err);
    return NextResponse.json({ error: 'Webhook check failed' }, { status: 500 });
  }
}