import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.brand}>CV Studio AI</Text>
      <Text style={styles.sub}>
        Build ATS-ready resumes. Edit offline. Sync when you reconnect.
      </Text>
      <Pressable style={styles.cta} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.ctaText}>Get started</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>I already have an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.slate900,
    padding: spacing.lg,
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  brand: { ...typography.title, color: colors.white, fontSize: 36 },
  sub: { ...typography.body, color: colors.slate100, marginBottom: spacing.xl },
  cta: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  link: { color: colors.slate100, textAlign: 'center', padding: spacing.sm },
});
