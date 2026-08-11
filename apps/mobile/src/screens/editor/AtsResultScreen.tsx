import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

export function AtsResultScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>ATS score</Text>
      <Text style={styles.body}>Results stream from POST /ai/ats when online.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50 },
  title: { ...typography.headline, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.slate700 },
});
