import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography, radii } from '../../theme/tokens';

export function AIHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.root}>
      <Text style={styles.body}>AI tools require network + Pro entitlements.</Text>
      <Pressable
        style={styles.cta}
        onPress={() => navigation.navigate('Paywall', { reason: 'ai' })}
      >
        <Text style={styles.ctaText}>View Pro</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50, gap: spacing.md },
  body: { ...typography.body, color: colors.slate700 },
  cta: {
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, fontWeight: '700' },
});
