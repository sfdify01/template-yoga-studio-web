/**
 * OneSignal Web Push Notification Client
 *
 * Handles web push notification setup for admin dashboard.
 * When admins enable notifications, they receive push alerts for new orders
 * even when the browser tab is closed or in background.
 */
import OneSignal from 'react-onesignal';

// OneSignal App ID for Shahirizada
const ONESIGNAL_APP_ID = '02131d59-ddb7-42f0-a1f7-0cb8b2d512e7';

let isInitialized = false;

/**
 * Initialize OneSignal SDK
 * Should be called once when the app loads
 */
export async function initOneSignal(): Promise<void> {
  if (isInitialized) {
    console.log('[OneSignal] Already initialized');
    return;
  }

  // Don't initialize during SSR
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true, // Enable for local development
      notifyButton: {
        enable: false, // We use custom UI instead
      },
      serviceWorkerParam: {
        scope: '/',
      },
      serviceWorkerPath: '/OneSignalSDKWorker.js',
    });

    isInitialized = true;
    console.log('[OneSignal] Initialized successfully');
  } catch (error) {
    console.error('[OneSignal] Initialization failed:', error);
    throw error;
  }
}

/**
 * Subscribe an admin user to push notifications
 * Sets up external user ID and tags for targeting
 */
export async function subscribeAdminToPush(
  userId: string,
  email: string
): Promise<boolean> {
  if (!isInitialized) {
    console.warn('[OneSignal] Not initialized, initializing now...');
    await initOneSignal();
  }

  try {
    // Set external user ID (Supabase auth user ID)
    await OneSignal.login(userId);

    // Add email for additional targeting
    if (email) {
      await OneSignal.User.addEmail(email);
    }

    // Tag user as admin for notification targeting
    await OneSignal.User.addTag('role', 'admin');

    // Request notification permission
    const permission = await OneSignal.Notifications.requestPermission();

    console.log('[OneSignal] Admin subscribed, permission:', permission);
    return permission;
  } catch (error) {
    console.error('[OneSignal] Failed to subscribe admin:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isInitialized) return;

  try {
    await OneSignal.logout();
    console.log('[OneSignal] User logged out');
  } catch (error) {
    console.error('[OneSignal] Failed to unsubscribe:', error);
    throw error;
  }
}

/**
 * Get current notification permission status
 */
export async function getPermissionStatus(): Promise<'default' | 'granted' | 'denied'> {
  if (!isInitialized || typeof window === 'undefined') {
    return 'default';
  }

  try {
    const permission = await OneSignal.Notifications.permission;
    return permission ? 'granted' : 'default';
  } catch {
    return 'default';
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Check if user is subscribed to push
 */
export async function isSubscribed(): Promise<boolean> {
  if (!isInitialized) return false;

  try {
    const permission = await OneSignal.Notifications.permission;
    return permission === true;
  } catch {
    return false;
  }
}

// Re-export OneSignal for advanced usage
export { OneSignal };
