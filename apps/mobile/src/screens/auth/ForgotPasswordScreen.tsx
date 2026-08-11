import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

export function ForgotPasswordScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.body}>
        Password reset is handled via the web flow for now. Open app.cvstudio.ai/forgot-password.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50 },
  body: { ...typography.body, color: colors.slate700 },
});
