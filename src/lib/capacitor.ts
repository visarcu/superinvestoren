import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/**
 * Initialisiert alle nativen Capacitor-Plugins.
 * Wird einmalig beim App-Start aufgerufen (nur auf nativen Plattformen).
 */
export async function initCapacitor() {
  if (!isNativeApp()) return;

  const platform = getPlatform();

  // Status Bar
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    }
  } catch (e) {
    console.error('StatusBar init failed:', e);
  }

  // Keyboard
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch (e) {
    console.error('Keyboard init failed:', e);
  }

  // Back Button (Android)
  if (platform === 'android') {
    try {
      const { App } = await import('@capacitor/app');
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    } catch (e) {
      console.error('App backButton init failed:', e);
    }
  }

  // Splash Screen ausblenden nach Initialisierung
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) {
    console.error('SplashScreen hide failed:', e);
  }
}

/**
 * Push Notification Permission anfragen und Token registrieren.
 * Wird nach dem Login aufgerufen.
 */
export async function registerPushNotifications(userId: string) {
  if (!isNativeApp()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      try {
        await fetch('/api/notifications/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: getPlatform(),
            userId,
          }),
        });
      } catch (e) {
        console.error('Push token registration failed:', e);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });
  } catch (e) {
    console.error('Push notifications init failed:', e);
  }
}

/**
 * Haptic Feedback für Touch-Interaktionen.
 */
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!isNativeApp()) return;

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[style] });
  } catch (e) {
    // Silent fail
  }
}
