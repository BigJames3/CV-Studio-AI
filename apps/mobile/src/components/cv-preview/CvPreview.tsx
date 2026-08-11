import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

export type PreviewModel = {
  title: string;
  summary: string;
  experience: { role: string; company: string }[];
};

/** Phase M9–10 native simplified preview (HTML WebView later). */
export function CvPreview({ model }: { model: PreviewModel }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{model.title || 'Untitled'}</Text>
      {model.summary ? <Text style={styles.summary}>{model.summary}</Text> : null}
      <View style={styles.rule} />
      <Text style={styles.section}>Experience</Text>
      {model.experience.length === 0 ? (
        <Text style={styles.empty}>Add roles in Contenu</Text>
      ) : (
        model.experience.map((e, i) => (
          <Text key={i} style={styles.item}>
            {e.role} · {e.company}
          </Text>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.lg },
  name: { ...typography.title, color: colors.slate900 },
  summary: { ...typography.body, color: colors.slate700, marginTop: spacing.sm },
  rule: { height: 2, backgroundColor: colors.primary, marginVertical: spacing.md, width: 48 },
  section: { ...typography.headline, color: colors.slate900, marginBottom: spacing.sm },
  empty: { ...typography.caption, color: colors.slate500 },
  item: { ...typography.body, marginBottom: spacing.xs },
});
