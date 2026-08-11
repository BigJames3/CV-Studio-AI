import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import type { EditorStackParamList, RootStackParamList } from '../../navigation/types';
import { useEditorUiStore } from '../../stores/editor-ui-store';
import { CvPreview } from '../../components/cv-preview/CvPreview';
import { colors, spacing, radii, typography } from '../../theme/tokens';

type Props = NativeStackScreenProps<EditorStackParamList, 'EditorHome'>;

export function EditorHomeScreen({ navigation }: Props) {
  const rootRoute = useRoute<RouteProp<RootStackParamList, 'Editor'>>();
  const route = useRoute<RouteProp<EditorStackParamList, 'EditorHome'>>();
  const cvId = route.params?.cvId ?? rootRoute.params?.cvId ?? 'unknown';

  const pane = useEditorUiStore((s) => s.activePane);
  const setPane = useEditorUiStore((s) => s.setPane);
  const saveStatus = useEditorUiStore((s) => s.saveStatus);
  const setDirty = useEditorUiStore((s) => s.setDirty);
  const setSaveStatus = useEditorUiStore((s) => s.setSaveStatus);

  const [title, setTitle] = useState('Untitled CV');
  const [summary, setSummary] = useState('');

  const previewModel = useMemo(
    () => ({ title, summary, experience: [] as { role: string; company: string }[] }),
    [title, summary]
  );

  function onChangeSummary(v: string) {
    setSummary(v);
    setDirty(true);
    setSaveStatus('pending');
    // Production: write WatermelonDB + enqueue sync (debounced push ≤5s)
  }

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {(['content', 'preview', 'tools'] as const).map((p) => (
          <Pressable
            key={p}
            style={[styles.tab, pane === p && styles.tabActive]}
            onPress={() => setPane(p)}
          >
            <Text style={[styles.tabText, pane === p && styles.tabTextActive]}>
              {p === 'content' ? 'Contenu' : p === 'preview' ? 'Aperçu' : 'Outils'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.save}>{saveStatus}</Text>

      {pane === 'content' ? (
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Summary</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            value={summary}
            onChangeText={onChangeSummary}
            placeholder="2–3 lines tailored to the role"
          />
          <Pressable
            style={styles.linkBtn}
            onPress={() => navigation.navigate('SectionEdit', { cvId, section: 'experience' })}
          >
            <Text style={styles.linkBtnText}>Edit experience →</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {pane === 'preview' ? <CvPreview model={previewModel} /> : null}

      {pane === 'tools' ? (
        <View style={styles.form}>
          <Pressable style={styles.tool} onPress={() => navigation.navigate('AtsResult', { cvId })}>
            <Text style={styles.toolTitle}>ATS check</Text>
            <Text style={styles.caption}>Requires network</Text>
          </Pressable>
          <Pressable
            style={styles.tool}
            onPress={() => navigation.navigate('ExportStatus', { cvId, jobId: 'pending' })}
          >
            <Text style={styles.toolTitle}>Export PDF</Text>
            <Text style={styles.caption}>Server render · share sheet</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate50 },
  tabs: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.slate700, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  save: { ...typography.caption, color: colors.slate500, paddingHorizontal: spacing.md },
  form: { padding: spacing.md, gap: spacing.sm },
  label: { ...typography.caption, color: colors.slate500, fontWeight: '600' },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate100,
    padding: spacing.md,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  linkBtn: { paddingVertical: spacing.md },
  linkBtnText: { color: colors.primary, fontWeight: '600' },
  tool: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate100,
    marginBottom: spacing.sm,
  },
  toolTitle: { ...typography.headline },
  caption: { ...typography.caption, color: colors.slate500 },
});
