import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSyncStore } from '../../stores/sync-store';
import { colors, spacing, typography } from '../../theme/tokens';

export function OfflineBanner() {
  const status = useSyncStore((s) => s.status);
  const pending = useSyncStore((s) => s.pendingCount);

  if (status !== 'offline' && status !== 'error') return null;

  const label =
    status === 'offline'
      ? `Offline${pending ? ` · ${pending} pending` : ''}`
      : 'Sync error — will retry';

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.caption,
    color: colors.slate900,
    textAlign: 'center',
    fontWeight: '600',
  },
});
