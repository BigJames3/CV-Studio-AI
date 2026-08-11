import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuthStore } from '../../stores/auth-store';
import { colors, spacing, typography, radii } from '../../theme/tokens';

export function AccountScreen() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.root}>
      <Text style={styles.body}>Profile, billing, notification preferences.</Text>
      <Pressable style={styles.cta} onPress={() => void logout()}>
        <Text style={styles.ctaText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50, gap: spacing.md },
  body: { ...typography.body, color: colors.slate700 },
  cta: {
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.danger, fontWeight: '700' },
});
