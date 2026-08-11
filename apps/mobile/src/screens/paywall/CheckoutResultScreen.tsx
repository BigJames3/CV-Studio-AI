import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography, radii } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'CheckoutResult'>;

export function CheckoutResultScreen({ route, navigation }: Props) {
  const ok = route.params.status === 'success';
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{ok ? 'You are Pro' : 'Checkout cancelled'}</Text>
      <Text style={styles.body}>
        {ok
          ? 'Entitlements refresh via GET /subscriptions/me after webhook.'
          : 'No charge was made.'}
      </Text>
      <Pressable style={styles.cta} onPress={() => navigation.navigate('MainTabs')}>
        <Text style={styles.ctaText}>Back home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50, gap: spacing.md },
  title: { ...typography.title },
  body: { ...typography.body, color: colors.slate700 },
  cta: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, fontWeight: '700' },
});
