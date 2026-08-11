import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography, radii } from '../../theme/tokens';

const SEED = [
  { id: 'atlas', name: 'Atlas', premium: false },
  { id: 'nova', name: 'Nova', premium: true },
  { id: 'helix', name: 'Helix', premium: false },
];

export function TemplatesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      data={SEED}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={
        <Text style={styles.header}>Templates cache locally (WatermelonDB · TTL 24h).</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => {
            if (item.premium) navigation.navigate('Paywall', { reason: 'template' });
          }}
        >
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.premium ? 'Pro' : 'Free'}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  header: { ...typography.caption, color: colors.slate500, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate100,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: { ...typography.headline },
  meta: { ...typography.caption, color: colors.slate500, alignSelf: 'center' },
});
