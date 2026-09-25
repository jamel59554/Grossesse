import { addDays } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/date-field';
import { AppText, Button, Chip, Row } from '@/components/ui';
import {
  dueDateFromLmp,
  formatFrenchDate,
  getPregnancyProgress,
  lmpFromDueDate,
  MAX_LMP_AGE_DAYS,
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
  const [picked, setPicked] = useState<Date | null>(initialLmp ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const minLmp = addDays(today, -MAX_LMP_AGE_DAYS);
  const lmp = picked ? (mode === 'lmp' ? picked : lmpFromDueDate(picked)) : null;
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
        {(['lmp', 'due'] as const).map((m) => (
          <Chip
            key={m}
            label={m === 'lmp' ? t('onboarding.modeLmp') : t('onboarding.modeDue')}
            selected={mode === m}
            onPress={() => {
              if (m === mode) return;
              // La date affichée change de sens : on la convertit pour rester cohérent.
              setPicked((current) => (current ? (m === 'due' ? dueDateFromLmp(current) : lmpFromDueDate(current)) : null));
              setMode(m);
            }}
          />
        ))}
      </Row>
      <DateField
        key={mode}
        label={mode === 'lmp' ? t('onboarding.lmpDateLabel') : t('onboarding.dueDateLabel')}
        value={picked}
        onChange={setPicked}
        minimumDate={mode === 'lmp' ? minLmp : dueDateFromLmp(minLmp)}
        maximumDate={mode === 'lmp' ? today : dueDateFromLmp(today)}
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
      <Button label={submitLabel} onPress={submit} loading={loading} disabled={!picked} />
    </>
  );
}
