import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';

import { PregnancyDateForm } from '@/components/pregnancy-date-form';
import { AppText, Button, Card, Chip, Loading, Row, Screen, TextField } from '@/components/ui';
import { queryKeys } from '@/hooks/query-keys';
import { useCouple } from '@/hooks/use-duo';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { dueDateFromLmp, formatFrenchDate, parseISODate, toISODate } from '@/lib/pregnancy';
import { errorCode, supabase } from '@/lib/supabase';
import { useAuth, useMembership } from '@/providers/AuthProvider';
import { usePalette } from '@/theme';
import type { MemberRole } from '@/types/models';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const palette = usePalette();
  const queryClient = useQueryClient();
  const { refreshMe } = useAuth();
  const { userId, coupleId, profile } = useMembership();
  const couple = useCouple();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [role, setRole] = useState<MemberRole | null>(profile?.role ?? null);
  const [saved, setSaved] = useState(false);
  const [editingDates, setEditingDates] = useState(false);

  if (couple.isPending || !couple.couple) return <Loading />;

  const lmp = parseISODate(couple.couple.lmp_date);
  const inviteCode = couple.couple.invite_code;

  async function saveProfile() {
    if (!name.trim() || !role) return;
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), role }).eq('id', userId);
    if (!error) {
      setSaved(true);
      await Promise.all([refreshMe(), queryClient.invalidateQueries({ queryKey: queryKeys.couple(coupleId) })]);
    }
  }

  async function saveDates(nextLmp: Date) {
    const { error } = await supabase.rpc('update_pregnancy_dates', { p_lmp_date: toISODate(nextLmp) });
    if (error) {
      return errorCode(error) === 'invalid_date' ? t('onboarding.errors.invalid_date') : t('common.error');
    }
    setEditingDates(false);
    await queryClient.invalidateQueries({ queryKey: queryKeys.couple(coupleId) });
    return null;
  }

  return (
    <Screen>
      <AppText variant="title">{t('settings.title')}</AppText>

      <Card>
        <AppText variant="heading">{t('settings.profile')}</AppText>
        <TextField
          label={t('onboarding.nameLabel')}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setSaved(false);
          }}
          maxLength={40}
        />
        <AppText variant="caption" muted>
          {t('settings.role')}
        </AppText>
        <Row>
          {(['carrier', 'partner'] as const).map((r) => (
            <Chip
              key={r}
              label={t(`roles.${r}`)}
              selected={role === r}
              onPress={() => {
                setRole(r);
                setSaved(false);
              }}
            />
          ))}
        </Row>
        {saved ? <AppText color={palette.success}>{t('settings.saved')}</AppText> : null}
        <Button label={t('common.save')} onPress={saveProfile} disabled={!name.trim()} />
      </Card>

      <Card>
        <AppText variant="heading">{t('settings.pregnancy')}</AppText>
        {lmp ? (
          <>
            <AppText>{t('settings.lmp', { date: formatFrenchDate(lmp) })}</AppText>
            <AppText>{t('settings.due', { date: formatFrenchDate(dueDateFromLmp(lmp)) })}</AppText>
          </>
        ) : null}
        {editingDates ? (
          <PregnancyDateForm submitLabel={t('common.save')} initialLmp={lmp ?? undefined} onSubmit={saveDates} />
        ) : (
          <Button variant="secondary" label={t('settings.editDates')} onPress={() => setEditingDates(true)} />
        )}
      </Card>

      <Card>
        <AppText variant="heading">{t('settings.invite')}</AppText>
        <AppText variant="title" selectable>
          {inviteCode}
        </AppText>
        <AppText variant="caption" muted>
          {t('settings.inviteHint')}
        </AppText>
        <Button
          variant="secondary"
          label={t('home.share')}
          onPress={() => Share.share({ message: t('home.shareMessage', { code: inviteCode }) })}
        />
      </Card>

      <Card>
        <AppText variant="heading">{t('settings.language')}</AppText>
        <Row>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <Chip key={lng} label={lng.toUpperCase()} selected={i18n.language === lng} onPress={() => i18n.changeLanguage(lng)} />
          ))}
        </Row>
      </Card>

      <Button variant="ghost" label={t('settings.signOut')} onPress={() => supabase.auth.signOut()} />

      <AppText variant="caption" muted>
        {t('settings.about')} · {t('appName')} — {t('common.disclaimer')}
      </AppText>
    </Screen>
  );
}
