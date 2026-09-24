import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PregnancyDateForm } from '@/components/pregnancy-date-form';
import { AppText, Button, Screen } from '@/components/ui';
import { errorCode, supabase } from '@/lib/supabase';
import { toISODate } from '@/lib/pregnancy';
import { useAuth } from '@/providers/AuthProvider';
import { getCalendars } from 'expo-localization';

export default function PregnancyScreen() {
  const { t } = useTranslation();
  const { refreshMe } = useAuth();

  async function create(lmp: Date): Promise<string | null> {
    const { error } = await supabase.rpc('create_couple', {
      p_lmp_date: toISODate(lmp),
      p_timezone: getCalendars()[0]?.timeZone ?? 'Europe/Paris',
    });
    if (error) {
      const code = errorCode(error);
      return ['invalid_date', 'already_in_couple', 'role_required'].includes(code)
        ? t(`onboarding.errors.${code}`)
        : t('common.error');
    }
    await refreshMe();
    return null;
  }

  return (
    <Screen>
      <AppText variant="title">{t('onboarding.pregnancyTitle')}</AppText>
      <AppText muted>{t('onboarding.pregnancySubtitle')}</AppText>
      <PregnancyDateForm submitLabel={t('onboarding.create')} onSubmit={create} />
      <Button variant="ghost" label={t('onboarding.back')} onPress={() => router.back()} />
      <AppText variant="caption" muted>
        {t('common.disclaimer')}
      </AppText>
    </Screen>
  );
}
