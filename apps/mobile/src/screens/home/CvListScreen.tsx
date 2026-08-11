import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

/** Full list — observers WatermelonDB in production. */
export function CvListScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.body}>CV list binds to WatermelonDB `cvs` collection (observe).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50 },
  body: { ...typography.body, color: colors.slate700 },
});
