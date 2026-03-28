import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './auth';

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Skipping: not a real device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'finclue',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22C55E',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'ce42e19f-edb6-4f85-a93b-87a1ec42d03c',
    });
    const token = tokenData.data;
    console.log('📱 Push Token:', token);
    await saveDeviceToken(token);
    return token;
  } catch (e) {
    // Expo Go doesn't support push tokens without a projectId — skip silently
    return null;
  }
}

async function saveDeviceToken(token: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert into device_tokens table (unique per token)
    await supabase.from('device_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      },
      { onConflict: 'token' }
    );

    console.log('[Push] Token saved');
  } catch (e) {
    console.error('[Push] Failed to save token:', e);
  }
}

export function addNotificationListeners(
  onNotification?: (n: Notifications.Notification) => void,
  onResponse?: (r: Notifications.NotificationResponse) => void,
): () => void {
  const n = Notifications.addNotificationReceivedListener(notification => {
    onNotification?.(notification);
  });
  const r = Notifications.addNotificationResponseReceivedListener(response => {
    onResponse?.(response);
  });
  return () => {
    Notifications.removeNotificationSubscription(n);
    Notifications.removeNotificationSubscription(r);
  };
}
