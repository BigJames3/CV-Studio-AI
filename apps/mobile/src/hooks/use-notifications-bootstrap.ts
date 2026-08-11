import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { registerForPushNotifications } from '../services/notifications';
import { devicesApi } from '../api';
import { Platform } from 'react-native';

export function useNotificationsBootstrap() {
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const pushToken = await registerForPushNotifications();
      if (!pushToken || cancelled) return;
      try {
        await devicesApi.register(pushToken, Platform.OS === 'ios' ? 'ios' : 'android');
      } catch {
        // Backend /devices may not be live yet — silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);
}
