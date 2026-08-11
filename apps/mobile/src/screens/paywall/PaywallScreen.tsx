import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useNativeCheckout } from '../../services/payments';
import { colors, spacing, typography, radii } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ route, navigation }: Props) {
  const { startProCheckout } = useNativeCheckout();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reason = route.params?.reason;

  async function onPay() {
    setLoading(true);
    setError(null);
    const res = await startProCheckout();
    setLoading(false);
    if (res.ok) {
      navigation.replace('CheckoutResult', { status: 'success' });
    } else {
      setError(res.error ?? 'Payment cancelled');
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>CV Studio Pro</Text>
      <Text style={styles.body}>
        Unlimited CVs, AI tools, premium templates
        {reason ? ` · unlocked for: ${reason}` : ''}.
      </Text>
      <Text style={styles.price}>$9.99 / month</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.cta} onPress={onPay} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>Continue with Apple Pay / Google Pay</Text>
        )}
      </Pressable>
      <Text style={styles.legal}>
        Wallet checkout via Stripe Payment Sheet. Store IAP policy subject to Legal ADR.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50, gap: spacing.md },
  title: { ...typography.title, color: colors.slate900 },
  body: { ...typography.body, color: colors.slate700 },
  price: { ...typography.headline, color: colors.primary },
  cta: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, fontWeight: '700', textAlign: 'center' },
  error: { color: colors.danger },
  legal: { ...typography.caption, color: colors.slate500 },
});
