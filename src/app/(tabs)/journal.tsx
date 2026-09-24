import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, ErrorState, Loading, Row, Screen, Section, TextField } from '@/components/ui';
import { useJournal, useJournalActions } from '@/hooks/use-duo';
import { useNames } from '@/hooks/use-names';
import { journalSummary } from '@/lib/describe';
import { journalSchemas, MOOD_EMOJIS, parseDecimal } from '@/lib/journal';
import { parseFrenchDate, toISODate } from '@/lib/pregnancy';
import { useMembership } from '@/providers/AuthProvider';
import { spacing, usePalette } from '@/theme';
import type { JournalKind, Json } from '@/types/models';

const FORM_KINDS: Exclude<JournalKind, 'mood'>[] = ['symptom', 'weight', 'appointment', 'note'];

type Draft = { label: string; intensity: number; kg: string; title: string; date: string; location: string; text: string };
const EMPTY_DRAFT: Draft = { label: '', intensity: 1, kg: '', title: '', date: '', location: '', text: '' };

function buildPayload(kind: Exclude<JournalKind, 'mood'>, draft: Draft): unknown {
  switch (kind) {
    case 'symptom':
      return { label: draft.label, intensity: draft.intensity };
    case 'weight':
      return { kg: parseDecimal(draft.kg) };
    case 'appointment': {
      const date = parseFrenchDate(draft.date);
      return {
        title: draft.title,
        date: date ? toISODate(date) : '',
        ...(draft.location.trim() ? { location: draft.location } : {}),
      };
    }
    case 'note':
      return { text: draft.text };
  }
}

export default function JournalScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { userId } = useMembership();
  const journal = useJournal();
  const { add, remove } = useJournalActions();
  const { partnerName, nameOf } = useNames();
  const [kind, setKind] = useState<Exclude<JournalKind, 'mood'>>('symptom');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [moodNote, setMoodNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  async function save(entryKind: JournalKind, raw: unknown) {
    const parsed = journalSchemas[entryKind].safeParse(raw);
    if (!parsed.success) {
      setError(t('journal.invalid'));
      return false;
    }
    setError(null);
    try {
      await add.mutateAsync({ kind: entryKind, payload: parsed.data as Json });
      return true;
    } catch {
      setError(t('common.error'));
      return false;
    }
  }

  async function saveMood(score: number) {
    const ok = await save('mood', moodNote.trim() ? { score, note: moodNote } : { score });
    if (ok) setMoodNote('');
  }

  async function saveEntry() {
    if (await save(kind, buildPayload(kind, draft))) setDraft(EMPTY_DRAFT);
  }

  if (journal.isPending) return <Loading />;

  return (
    <Screen refreshing={journal.isRefetching} onRefresh={() => journal.refetch()}>
      <AppText variant="title">{t('journal.title')}</AppText>
      <AppText muted>{t('journal.subtitle', { name: partnerName })}</AppText>

      <Card tone="alt">
        <AppText variant="heading">{t('journal.moodQuestion')}</AppText>
        <Row style={styles.moods}>
          {MOOD_EMOJIS.map((emoji, index) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`${t('journal.kinds.mood')} ${index + 1}/5`}
              disabled={add.isPending}
              onPress={() => saveMood(index + 1)}
              style={({ pressed }) => [styles.mood, { opacity: pressed ? 0.6 : 1 }]}>
              <AppText style={styles.moodEmoji}>{emoji}</AppText>
            </Pressable>
          ))}
        </Row>
        <TextField label={t('journal.fields.note')} value={moodNote} onChangeText={setMoodNote} maxLength={280} />
      </Card>

      <Card>
        <Row>
          {FORM_KINDS.map((k) => (
            <Chip key={k} label={t(`journal.kinds.${k}`)} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </Row>
        {kind === 'symptom' ? (
          <>
            <TextField label={t('journal.fields.symptom')} value={draft.label} onChangeText={(label) => update({ label })} maxLength={80} />
            <AppText variant="caption" muted>
              {t('journal.fields.intensity')}
            </AppText>
            <Row>
              {[1, 2, 3].map((level) => (
                <Chip
                  key={level}
                  label={t(`journal.intensity.${level}`)}
                  selected={draft.intensity === level}
                  onPress={() => update({ intensity: level })}
                />
              ))}
            </Row>
          </>
        ) : null}
        {kind === 'weight' ? (
          <TextField label={t('journal.fields.weight')} value={draft.kg} onChangeText={(kg) => update({ kg })} keyboardType="decimal-pad" />
        ) : null}
        {kind === 'appointment' ? (
          <>
            <TextField label={t('journal.fields.title')} value={draft.title} onChangeText={(title) => update({ title })} maxLength={80} />
            <TextField
              label={t('journal.fields.date')}
              placeholder="JJ/MM/AAAA"
              value={draft.date}
              onChangeText={(date) => update({ date })}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <TextField label={t('journal.fields.location')} value={draft.location} onChangeText={(location) => update({ location })} maxLength={120} />
          </>
        ) : null}
        {kind === 'note' ? (
          <TextField label={t('journal.fields.text')} value={draft.text} onChangeText={(text) => update({ text })} multiline maxLength={1000} />
        ) : null}
        {error ? <AppText color={palette.danger}>{error}</AppText> : null}
        <Button label={t('journal.add')} onPress={saveEntry} loading={add.isPending} />
      </Card>

      <Section title={t('journal.title')}>
        {journal.isError ? <ErrorState onRetry={() => journal.refetch()} /> : null}
        {journal.data?.length === 0 ? <AppText muted>{t('journal.empty')}</AppText> : null}
        {journal.data?.map((entry) => (
          <Card key={entry.id}>
            <View style={styles.entryHeader}>
              <AppText variant="caption" muted style={styles.flex}>
                {t(`journal.kinds.${entry.kind}`)} ·{' '}
                {t('journal.by', {
                  name: entry.author_id === userId ? t('common.you') : nameOf(entry.author_id),
                  date: format(new Date(entry.occurred_at), 'd MMM, HH:mm', { locale: fr }),
                })}
              </AppText>
              {entry.author_id === userId ? (
                <Pressable accessibilityRole="button" onPress={() => remove.mutate(entry.id)} hitSlop={8}>
                  <AppText variant="caption" color={palette.danger}>
                    {t('journal.delete')}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
            <AppText>{journalSummary(t, entry.kind, entry.payload)}</AppText>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  moods: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  mood: { padding: spacing.xs },
  moodEmoji: { fontSize: 36, lineHeight: 44 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
