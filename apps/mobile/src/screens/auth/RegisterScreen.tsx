import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { authApi } from '../../api';
import { useAuthStore } from '../../stores/auth-store';
import { colors, spacing, radii } from '../../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen(_props: Props) {
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.register(email.trim(), password, name.trim() || undefined);
      await setSession(res.accessToken, res.refreshToken, res.user.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Register failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.cta} onPress={onSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>Create account</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.slate50 },
  input: {
    borderWidth: 1,
    borderColor: colors.slate100,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  cta: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, fontWeight: '700' },
  error: { color: colors.danger },
});
