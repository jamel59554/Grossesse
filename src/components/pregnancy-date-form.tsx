import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Chip, Row, TextField } from '@/components/ui';
import {
  formatFrenchDate,
  getPregnancyProgress,
  lmpFromDueDate,
  parseFrenchDate,
  validateLmp,
} from '@/lib/pregnancy';

type Mode = 'lmp' | 'due';

type Props = {
  submitLabel: string;
  initialLmp?: Date;
  /** Renvoie un message d'erreur, ou null en cas de succès. */
  onSubmit: (lmp: Date) => Promise<string | null>;
};

export function PregnancyDateForm({ submitLabel, initialLmp, onSubmit }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('lmp');
  const [value, setValue] = useState(initialLmp ? formatFrenchDate(initialLmp) : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsed = parseFrenchDate(value);
  const lmp = parsed ? (mode === 'lmp' ? parsed : lmpFromDueDate(parsed)) : null;
  const validity = lmp ? validateLmp(lmp) : null;
  const preview = lmp && validity === 'ok' ? getPregnancyProgress(lmp) : null;

  async function submit() {
    if (!lmp) {
      setError(t('onboarding.errors.invalid_date'));
      return;
    }
    if (validity !== 'ok') {
      setError(t(`onboarding.errors.${validity}`));
      return;
    }
    setError(null);
    setLoading(true);
    const submitError = await onSubmit(lmp);
    setLoading(false);
    setError(submitError);
  }

  return (
    <>
      <Row>
        <Chip label={t('onboarding.modeLmp')} selected={mode === 'lmp'} onPress={() => setMode('lmp')} />
        <Chip label={t('onboarding.modeDue')} selected={mode === 'due'} onPress={() => setMode('due')} />
      </Row>
      <TextField
        label={t('onboarding.dateLabel')}
        placeholder="JJ/MM/AAAA"
        value={value}
        onChangeText={setValue}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={error}
      />
      {preview ? (
        <AppText muted>
          {t('onboarding.preview', {
            weeks: preview.weeks,
            days: preview.days,
            due: formatFrenchDate(preview.dueDate),
          })}
        </AppText>
      ) : null}
      <Button label={submitLabel} onPress={submit} loading={loading} disabled={!parsed} />
    </>
  );
}
