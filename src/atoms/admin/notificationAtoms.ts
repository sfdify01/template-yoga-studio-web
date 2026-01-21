/**
 * Admin Push Notification State Atoms
 *
 * Manages state for admin push notification subscriptions.
 * Uses Jotai for reactive state management following project patterns.
 */
import { atom } from 'jotai';
import {
  initOneSignal,
  subscribeAdminToPush,
  unsubscribeFromPush,
  getPermissionStatus,
  isPushSupported,
  isSubscribed,
} from '../../lib/onesignal/client';

// Permission state: 'default' | 'granted' | 'denied'
export const pushPermissionAtom = atom<'default' | 'granted' | 'denied'>('default');

// Whether push is supported in this browser
export const pushSupportedAtom = atom<boolean>(false);

// Whether user is currently subscribed
export const pushSubscribedAtom = atom<boolean>(false);

// Loading state for subscription actions
export const pushLoadingAtom = atom<boolean>(false);

// Error state
export const pushErrorAtom = atom<string | null>(null);

// Whether OneSignal has been initialized
export const oneSignalInitializedAtom = atom<boolean>(false);

/**
 * Initialize OneSignal and check current state
 */
export const initPushAtom = atom(null, async (_get, set) => {
  try {
    // Check if push is supported
    const supported = isPushSupported();
    set(pushSupportedAtom, supported);

    if (!supported) {
      console.log('[Push] Not supported in this browser');
      return;
    }

    // Initialize OneSignal
    await initOneSignal();
    set(oneSignalInitializedAtom, true);

    // Get current permission status
    const permission = await getPermissionStatus();
    set(pushPermissionAtom, permission);

    // Check if already subscribed
    const subscribed = await isSubscribed();
    set(pushSubscribedAtom, subscribed);

    console.log('[Push] Initialized, permission:', permission, 'subscribed:', subscribed);
  } catch (error) {
    console.error('[Push] Initialization error:', error);
    set(pushErrorAtom, 'Failed to initialize notifications');
  }
});

/**
 * Subscribe admin to push notifications
 */
export const subscribeToPushAtom = atom(
  null,
  async (get, set, params: { userId: string; email: string }) => {
    const initialized = get(oneSignalInitializedAtom);
    if (!initialized) {
      await set(initPushAtom);
    }

    set(pushLoadingAtom, true);
    set(pushErrorAtom, null);

    try {
      const granted = await subscribeAdminToPush(params.userId, params.email);

      set(pushPermissionAtom, granted ? 'granted' : 'denied');
      set(pushSubscribedAtom, granted);

      if (granted) {
        console.log('[Push] Admin subscribed successfully');
      } else {
        console.log('[Push] Permission denied by user');
      }

      return granted;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enable notifications';
      set(pushErrorAtom, message);
      console.error('[Push] Subscription error:', error);
      return false;
    } finally {
      set(pushLoadingAtom, false);
    }
  }
);

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushAtom = atom(null, async (_get, set) => {
  set(pushLoadingAtom, true);
  set(pushErrorAtom, null);

  try {
    await unsubscribeFromPush();
    set(pushSubscribedAtom, false);
    console.log('[Push] Unsubscribed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disable notifications';
    set(pushErrorAtom, message);
    console.error('[Push] Unsubscribe error:', error);
  } finally {
    set(pushLoadingAtom, false);
  }
});

/**
 * Refresh permission status
 */
export const refreshPushStatusAtom = atom(null, async (_get, set) => {
  try {
    const permission = await getPermissionStatus();
    const subscribed = await isSubscribed();

    set(pushPermissionAtom, permission);
    set(pushSubscribedAtom, subscribed);
  } catch (error) {
    console.error('[Push] Status refresh error:', error);
  }
});
