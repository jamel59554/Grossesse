import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Share, Switch } from 'react-native';

import { PregnancyDateForm } from '@/components/pregnancy-date-form';
import { AppText, Button, Card, Chip, Loading, Row, Screen, TextField } from '@/components/ui';
import { queryKeys } from '@/hooks/query-keys';
import { useCouple } from '@/hooks/use-duo';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import {
  DAILY_REMINDER_HOUR,
  isDailyReminderEnabled,
  pushAvailability,
  setDailyReminder,
  unregisterPush,
} from '@/lib/notifications';
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
  const [pushEnabled, setPushEnabled] = useState(profile?.push_enabled ?? true);
  const [reminder, setReminder] = useState(false);
  const availability = pushAvailability();

  useEffect(() => {
    isDailyReminderEnabled().then(setReminder);
  }, []);

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

  async function togglePush(value: boolean) {
    setPushEnabled(value);
    const { error } = await supabase.from('profiles').update({ push_enabled: value }).eq('id', userId);
    if (error) setPushEnabled(!value);
    else await refreshMe();
  }

  async function toggleReminder(value: boolean) {
    setReminder(value);
    const enabled = await setDailyReminder(value, {
      title: t('notifications.dailyReminderTitle'),
      body: t('notifications.dailyReminderBody'),
    });
    setReminder(enabled);
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

      {Platform.OS !== 'web' ? (
        <Card>
          <AppText variant="heading">{t('settings.notifications')}</AppText>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <AppText style={{ flex: 1 }}>{t('settings.pushPartner')}</AppText>
            <Switch
              accessibilityLabel={t('settings.pushPartner')}
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ true: palette.primary }}
            />
          </Row>
          {availability !== 'ok' ? (
            <AppText variant="caption" muted>
              {t(`settings.pushUnavailable.${availability}`)}
            </AppText>
          ) : null}
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <AppText style={{ flex: 1 }}>{t('settings.dailyReminder', { hour: DAILY_REMINDER_HOUR })}</AppText>
            <Switch
              accessibilityLabel={t('settings.dailyReminder', { hour: DAILY_REMINDER_HOUR })}
              value={reminder}
              onValueChange={toggleReminder}
              trackColor={{ true: palette.primary }}
            />
          </Row>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">{t('settings.language')}</AppText>
        <Row>
          {SUPPORTED_LANGUAGES.map((lng) => (
            <Chip key={lng} label={lng.toUpperCase()} selected={i18n.language === lng} onPress={() => i18n.changeLanguage(lng)} />
          ))}
        </Row>
      </Card>

      <Button variant="ghost" label={t('settings.signOut')} onPress={async () => {
          await unregisterPush();
          await supabase.auth.signOut();
        }} />

      <AppText variant="caption" muted>
        {t('settings.about')} · {t('appName')} — {t('common.disclaimer')}
      </AppText>
    </Screen>
  );
}
