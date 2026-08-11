import { Platform } from 'react-native';

export function isIos() {
  return Platform.OS === 'ios';
}

export function coalesceSaveDelayMs() {
  return 5000;
}

export function previewDebounceMs() {
  return 150;
}
