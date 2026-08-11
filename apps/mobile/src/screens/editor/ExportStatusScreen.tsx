import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

export function ExportStatusScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Export</Text>
      <Text style={styles.body}>
        Poll export job · push notification `export.ready` · Share sheet when URL ready.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50 },
  title: { ...typography.headline, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.slate700 },
});
