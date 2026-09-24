import { isSameDay } from 'date-fns';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';

import { WeekCard } from '@/components/duo';
import { AppText, Button, Card, ErrorState, Loading, ProgressBar, Row, Screen } from '@/components/ui';
import { useCouple, useJournal, useQuests, useWeekCompletedCount } from '@/hooks/use-duo';
import { useNames } from '@/hooks/use-names';
import { journalSummary } from '@/lib/describe';
import { canComplete, TEAM_WEEKLY_GOAL, teamProgress } from '@/lib/gamification';
import { moodEmoji, readPayload } from '@/lib/journal';
import { getPregnancyProgress, parseISODate, toISODate } from '@/lib/pregnancy';
import { useMembership } from '@/providers/AuthProvider';
import { usePalette } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { userId, role } = useMembership();
  const couple = useCouple();
  const quests = useQuests();
  const weekCount = useWeekCompletedCount();
  const journal = useJournal();
  const { meName, partnerName, hasPartner } = useNames();

  if (couple.isPending) return <Loading />;
  if (couple.isError || !couple.couple) {
    return (
      <Screen>
        <ErrorState onRetry={() => couple.refetch()} />
      </Screen>
    );
  }

  const lmp = parseISODate(couple.couple.lmp_date);
  const progress = lmp ? getPregnancyProgress(lmp) : null;
  const todo = (quests.data ?? []).filter((q) => canComplete(q, userId)).length;
  const done = weekCount.data ?? 0;
  const inviteCode = couple.couple.invite_code;

  const entries = journal.data ?? [];
  const partnerMood = hasPartner
    ? entries.find((e) => e.kind === 'mood' && e.author_id !== userId && isSameDay(new Date(e.occurred_at), new Date()))
    : undefined;
  const moodPayload = partnerMood ? readPayload('mood', partnerMood.payload) : null;
  const today = toISODate(new Date());
  const nextAppointment = entries
    .filter((e) => e.kind === 'appointment')
    .map((e) => ({ entry: e, payload: readPayload('appointment', e.payload) }))
    .filter((a) => a.payload && a.payload.date >= today)
    .sort((a, b) => a.payload!.date.localeCompare(b.payload!.date))[0];

  const refreshing = couple.isRefetching || quests.isRefetching;
  const refresh = () => {
    couple.refetch();
    quests.refetch();
    weekCount.refetch();
    journal.refetch();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <AppText variant="title">{t('home.greeting', { name: meName })}</AppText>

      {!hasPartner ? (
        <Card tone="alt">
          <AppText variant="heading">{t('home.inviteAlone', { code: inviteCode })}</AppText>
          <Button
            label={t('home.share')}
            onPress={() => Share.share({ message: t('home.shareMessage', { code: inviteCode }) })}
          />
        </Card>
      ) : null}

      {progress ? <WeekCard progress={progress} /> : null}

      <Card>
        <AppText variant="heading">{t('home.teamGaugeTitle')}</AppText>
        <ProgressBar progress={teamProgress(done)} color={palette.success} height={14} />
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText muted>{t('home.teamGauge', { done, goal: TEAM_WEEKLY_GOAL })}</AppText>
          <AppText>{t('home.teamStreak', { count: couple.couple.team_streak })}</AppText>
        </Row>
        <AppText>{todo === 0 ? t('home.todoQuests_zero') : t('home.todoQuests', { count: todo })}</AppText>
        <Button variant="secondary" label={t('home.seeQuests')} onPress={() => router.navigate('/quests')} />
      </Card>

      {hasPartner ? (
        <Card>
          <AppText variant="heading">{t('home.partnerMood', { name: partnerName })}</AppText>
          {moodPayload ? (
            <AppText style={{ fontSize: 32 }}>
              {moodEmoji(moodPayload.score)} {moodPayload.note ? <AppText>{moodPayload.note}</AppText> : null}
            </AppText>
          ) : (
            <AppText muted>{t('home.noMood', { name: partnerName })}</AppText>
          )}
        </Card>
      ) : null}

      {nextAppointment ? (
        <Card>
          <AppText variant="heading">🩺 {t('home.nextAppointment')}</AppText>
          <AppText>{journalSummary(t, 'appointment', nextAppointment.entry.payload)}</AppText>
        </Card>
      ) : null}

      {progress ? (
        <>
          <Card>
            <AppText variant="heading">👶 {t('home.babyTitle')}</AppText>
            <AppText>{t(`weeks.${progress.contentWeek}.baby`)}</AppText>
          </Card>
          <Card tone="alt">
            <AppText variant="heading">💡 {t('home.tipTitle')}</AppText>
            <AppText>{t(`weeks.${progress.contentWeek}.${role}`, { name: partnerName })}</AppText>
          </Card>
        </>
      ) : null}

      <AppText variant="caption" muted>
        {t('common.disclaimer')}
      </AppText>
    </Screen>
  );
}
