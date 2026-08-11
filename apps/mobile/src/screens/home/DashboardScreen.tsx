import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps as NSP } from '@react-navigation/native-stack';
import type {
  HomeStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../../navigation/types';
import { useSyncStore } from '../../stores/sync-store';
import { colors, spacing, typography, radii } from '../../theme/tokens';

type Props = CompositeScreenProps<
  NSP<HomeStackParamList, 'Dashboard'>,
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

const MOCK = [
  { id: 'local-1', title: 'Product Manager — 2026' },
  { id: 'local-2', title: 'Startup generalist' },
];

export function DashboardScreen({ navigation }: Props) {
  const status = useSyncStore((s) => s.status);
  const pending = useSyncStore((s) => s.pendingCount);

  return (
    <View style={styles.root}>
      <Text style={styles.meta}>
        Sync: {status}
        {pending ? ` · ${pending} pending` : ''}
      </Text>
      <FlatList
        data={MOCK}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.getParent()?.getParent()?.navigate('Editor', { cvId: item.id })
            }
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.caption}>Tap to edit</Text>
          </Pressable>
        )}
      />
      <Pressable
        style={styles.fab}
        accessibilityLabel="Create CV"
        onPress={() => navigation.getParent()?.getParent()?.navigate('Editor', { cvId: 'new' })}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50, padding: spacing.md },
  meta: { ...typography.caption, color: colors.slate500, marginBottom: spacing.sm },
  row: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  rowTitle: { ...typography.headline, color: colors.slate900 },
  caption: { ...typography.caption, color: colors.slate500, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: colors.white, fontSize: 28, fontWeight: '600', marginTop: -2 },
});
