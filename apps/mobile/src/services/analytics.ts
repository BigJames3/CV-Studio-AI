import { Platform } from 'react-native';

type Props = Record<string, string | number | boolean | null | undefined>;

let enabled = false;
let userId: string | null = null;

export function enableMobileAnalytics() {
  enabled = true;
  // TODO: Amplitude React Native init
}

export function identifyMobile(id: string, traits?: Props) {
  userId = id;
  if (!enabled) return;
  if (__DEV__) console.debug('[analytics] identify', id, traits);
}

export function trackMobile(event: string, properties: Props = {}) {
  if (!enabled) return;
  const payload = {
    event,
    user_id: userId,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    timestamp: new Date().toISOString(),
    properties,
  };
  if (__DEV__) console.debug('[analytics]', payload);
}
