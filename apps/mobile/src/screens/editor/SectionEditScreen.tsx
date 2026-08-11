import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EditorStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme/tokens';

type Props = NativeStackScreenProps<EditorStackParamList, 'SectionEdit'>;

export function SectionEditScreen({ route }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.body}>
        Section editor: {route.params.section} · CV {route.params.cvId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.slate50 },
  body: { ...typography.body, color: colors.slate700 },
});
