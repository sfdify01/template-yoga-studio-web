/**
 * Admin Notification Settings Component
 *
 * Allows admin users to enable/disable push notifications for new orders.
 * Uses OneSignal Web SDK for browser push notifications.
 */
import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, BellRing, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  pushPermissionAtom,
  pushSupportedAtom,
  pushSubscribedAtom,
  pushLoadingAtom,
  pushErrorAtom,
  initPushAtom,
  subscribeToPushAtom,
  unsubscribeFromPushAtom,
} from '../../atoms/admin/notificationAtoms';

interface NotificationSettingsProps {
  userId: string;
  email: string;
  brandColor?: string;
}

export function NotificationSettings({
  userId,
  email,
  brandColor = '#6B0F1A',
}: NotificationSettingsProps) {
  const permission = useAtomValue(pushPermissionAtom);
  const isSupported = useAtomValue(pushSupportedAtom);
  const isSubscribed = useAtomValue(pushSubscribedAtom);
  const isLoading = useAtomValue(pushLoadingAtom);
  const error = useAtomValue(pushErrorAtom);

  const initPush = useSetAtom(initPushAtom);
  const subscribeToPush = useSetAtom(subscribeToPushAtom);
  const unsubscribeFromPush = useSetAtom(unsubscribeFromPushAtom);

  // Initialize push state on mount
  useEffect(() => {
    initPush();
  }, [initPush]);

  const handleEnableNotifications = async () => {
    await subscribeToPush({ userId, email });
  };

  const handleDisableNotifications = async () => {
    await unsubscribeFromPush();
  };

  // Browser doesn't support push
  if (!isSupported) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <BellOff className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Push Notifications</CardTitle>
              <CardDescription className="text-amber-700">
                Not supported in this browser
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-amber-800">
            Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge for the best experience.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <BellOff className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base">Push Notifications Blocked</CardTitle>
              <CardDescription className="text-red-700">
                You've blocked notifications for this site
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-red-800 mb-3">
            To receive new order alerts, you need to allow notifications in your browser settings:
          </p>
          <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
            <li>Click the lock icon in your browser's address bar</li>
            <li>Find "Notifications" and change it to "Allow"</li>
            <li>Refresh this page</li>
          </ol>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}15` }}
            >
              {isSubscribed ? (
                <BellRing className="w-5 h-5" style={{ color: brandColor }} />
              ) : (
                <Bell className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">Order Notifications</CardTitle>
              <CardDescription>
                Get notified instantly when new orders arrive
              </CardDescription>
            </div>
          </div>

          {/* Status Badge */}
          <AnimatePresence mode="wait">
            {isSubscribed ? (
              <motion.div
                key="enabled"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge
                  className="gap-1.5"
                  style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Enabled
                </Badge>
              </motion.div>
            ) : (
              <motion.div
                key="disabled"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge variant="outline" className="gap-1.5 text-gray-500">
                  <BellOff className="w-3 h-3" />
                  Disabled
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Box */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            {isSubscribed
              ? "You'll receive push notifications for new orders even when this tab is closed or minimized."
              : 'Enable notifications to receive instant alerts when customers place orders.'}
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        {isSubscribed ? (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleDisableNotifications}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
            Disable Notifications
          </Button>
        ) : (
          <Button
            className="w-full gap-2 text-white"
            style={{ backgroundColor: brandColor }}
            onClick={handleEnableNotifications}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Enable Push Notifications
          </Button>
        )}

        {/* Additional context when enabled */}
        {isSubscribed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-500 text-center"
          >
            Notifications will be sent to this device. Enable on other devices to receive alerts there too.
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
}
