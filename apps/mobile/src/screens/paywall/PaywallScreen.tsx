import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { billingApi, type BillingInterval, type BillingPlanDto, type PlanTier } from '../../api';
import { useNativeCheckout } from '../../services/payments';
import { colors, spacing, typography, radii } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const TIER_LABELS: Record<PlanTier, string> = { free: 'Gratuit', pro: 'Pro', business: 'Business' };

/** App Store rule 3.1.1: no external purchase (nor link to one) for digital plans on iOS. */
const PURCHASE_ENABLED = Platform.OS !== 'ios';

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function PaywallScreen({ route, navigation }: Props) {
  const [tier, setTier] = useState<PlanTier | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [pro, setPro] = useState<BillingPlanDto | null>(null);
  const [loading, setLoading] = useState<BillingInterval | 'confirm' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const reason = route.params?.reason;

  const refresh = useCallback(async () => {
    try {
      const me = await billingApi.me();
      setTier(me.tier);
      setPeriodEnd(
        me.tier !== 'free' && me.subscription?.currentPeriodEnd
          ? new Date(me.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')
          : null
      );
    } catch {
      // Keep the last known plan.
    }
  }, []);

  const { startCheckout, confirmPending } = useNativeCheckout((result) => {
    setLoading(null);
    if (result.confirmed) {
      setAwaitingPayment(false);
      void refresh();
      navigation.replace('CheckoutResult', { status: 'success' });
    }
  });

  useEffect(() => {
    void refresh();
    if (!PURCHASE_ENABLED) return;
    billingApi
      .plans()
      .then((plans) => setPro(plans.find((p) => p.id === 'pro') ?? null))
      .catch(() => undefined);
  }, [refresh]);

  async function onPay(interval: BillingInterval) {
    setLoading(interval);
    setError(null);
    const res = await startCheckout('pro', interval);
    setLoading(null);
    if (res.ok) {
      setAwaitingPayment(true);
    } else {
      setError(res.error ?? 'Paiement indisponible pour le moment.');
    }
  }

  async function onCheckPayment() {
    setLoading('confirm');
    setError(null);
    const result = await confirmPending();
    setLoading(null);
    if (result?.confirmed) {
      setAwaitingPayment(false);
      await refresh();
      navigation.replace('CheckoutResult', { status: 'success' });
    } else {
      setError('Paiement pas encore confirmé. Réessayez dans un instant.');
    }
  }

  const currentPlan = tier ? (
    <Text style={styles.current}>
      Formule actuelle : {TIER_LABELS[tier]}
      {periodEnd ? ` · valable jusqu’au ${periodEnd}` : ''}
    </Text>
  ) : null;

  if (!PURCHASE_ENABLED) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Votre formule</Text>
        {currentPlan}
        <Text style={styles.body}>
          La formule se gère depuis votre compte CV Studio AI.
          {reason ? ` Fonctionnalité concernée : ${reason}.` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>CV Studio Pro</Text>
      {currentPlan}
      <Text style={styles.body}>
        Plus de CV, outils IA, export PDF et templates premium
        {reason ? ` · débloque : ${reason}` : ''}.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {(['month', 'year'] as const).map((interval) => {
        const amount = interval === 'month' ? pro?.priceMonthly : pro?.priceAnnual;
        const label = interval === 'month' ? '1 mois' : '1 an';
        return (
          <Pressable
            key={interval}
            style={styles.cta}
            onPress={() => void onPay(interval)}
            disabled={loading !== null}
          >
            {loading === interval ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {tier === 'pro' ? 'Prolonger' : 'Passer à Pro'} · {label}
                {pro && amount ? ` · ${formatPrice(amount, pro.currency)}` : ''}
              </Text>
            )}
          </Pressable>
        );
      })}
      {awaitingPayment ? (
        <Pressable
          style={styles.secondary}
          onPress={() => void onCheckPayment()}
          disabled={loading !== null}
        >
          {loading === 'confirm' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryText}>J’ai payé, vérifier</Text>
          )}
        </Pressable>
      ) : null}
      <Text style={styles.legal}>
        Paiement unique via Paystack (Orange Money, MTN Mobile Money, Wave ou carte), sans
        renouvellement automatique : la formule reste active jusqu’à la fin de la période payée.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50, gap: spacing.md },
  title: { ...typography.title, color: colors.slate900 },
  current: { ...typography.headline, color: colors.slate900 },
  body: { ...typography.body, color: colors.slate700 },
  cta: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, fontWeight: '700', textAlign: 'center' },
  secondary: {
    borderColor: colors.primary,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  secondaryText: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
  error: { color: colors.danger },
  legal: { ...typography.caption, color: colors.slate500 },
});
