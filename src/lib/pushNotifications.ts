// src/lib/pushNotifications.ts
// Server-seitiger Util zum Senden von Push Notifications
// Verwendet Firebase Cloud Messaging (FCM) für Android und APNs für iOS
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Sendet eine Push Notification an alle Geräte eines Users.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const { data: tokens, error } = await supabaseAdmin
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  if (error || !tokens?.length) return;

  const fcmKey = process.env.FCM_SERVER_KEY;
  if (!fcmKey) {
    console.error('FCM_SERVER_KEY not set');
    return;
  }

  const sendPromises = tokens.map(({ token, platform }) =>
    sendFCMNotification(token, platform, payload, fcmKey)
  );

  await Promise.allSettled(sendPromises);
}

async function sendFCMNotification(
  token: string,
  platform: string,
  payload: PushPayload,
  fcmKey: string
) {
  try {
    const message = {
      to: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      // Android-spezifisch
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      // iOS-spezifisch
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${fcmKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`FCM send failed for ${platform} token: ${text}`);
    }
  } catch (error) {
    console.error('FCM send error:', error);
  }
}

/**
 * Benachrichtigt einen User über eine Preisänderung.
 */
export async function sendPriceAlert(userId: string, ticker: string, change: number) {
  const sign = change >= 0 ? '+' : '';
  await sendPushToUser(userId, {
    title: `${ticker} ${sign}${change.toFixed(2)}%`,
    body: `Deine Watchlist-Aktie hat sich heute verändert.`,
    data: { type: 'price_alert', ticker, url: `/analyse/stocks/${ticker}` },
  });
}

/**
 * Benachrichtigt einen User über neue Earnings.
 */
export async function sendEarningsAlert(userId: string, ticker: string, companyName: string) {
  await sendPushToUser(userId, {
    title: `${companyName} Earnings`,
    body: `${ticker} meldet heute seine Quartalszahlen.`,
    data: { type: 'earnings', ticker, url: `/analyse/stocks/${ticker}/earnings` },
  });
}
