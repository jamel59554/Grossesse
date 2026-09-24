import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActivityList, BadgeGrid, MemberCard } from '@/components/duo';
import { AppText, Button, Card, ErrorState, Loading, Row, Screen, Section, TextField } from '@/components/ui';
import { useActivity, useCouple, useSendCheer, useStats } from '@/hooks/use-duo';
import { useNames } from '@/hooks/use-names';
import { useMembership } from '@/providers/AuthProvider';
import { usePalette } from '@/theme';

export default function TeamScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { userId } = useMembership();
  const couple = useCouple();
  const stats = useStats();
  const activity = useActivity();
  const cheer = useSendCheer();
  const { partnerName, nameOf } = useNames();
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  if (couple.isPending || stats.isPending) return <Loading />;
  if (couple.isError || stats.isError) {
    return (
      <Screen>
        <ErrorState
          onRetry={() => {
            couple.refetch();
            stats.refetch();
          }}
        />
      </Screen>
    );
  }

  const statsOf = (id: string) => stats.data.stats.find((s) => s.user_id === id);
  const ordered = [...couple.members].sort((a) => (a.userId === userId ? -1 : 1));

  return (
    <Screen
      refreshing={stats.isRefetching || activity.isRefetching}
      onRefresh={() => {
        stats.refetch();
        activity.refetch();
        couple.refetch();
      }}>
      <AppText variant="title">{t('team.title')}</AppText>

      <Row style={{ alignItems: 'stretch', flexWrap: 'nowrap' }}>
        {ordered.map((member) => (
          <MemberCard
            key={member.userId}
            name={member.userId === userId ? `${member.displayName} (${t('common.you')})` : member.displayName}
            roleLabel={t(`roles.${member.role}Short`)}
            stats={statsOf(member.userId)}
            highlight={member.userId === userId}
          />
        ))}
        {ordered.length < 2 ? (
          <Card style={{ flex: 1, justifyContent: 'center' }}>
            <AppText muted>{t('team.waitingPartner')}</AppText>
          </Card>
        ) : null}
      </Row>

      <Card tone="alt">
        <AppText variant="heading">
          {t('team.teamStreakValue', { count: couple.couple?.team_streak ?? 0 })}
        </AppText>
        <AppText variant="caption" muted>
          {t('team.teamStreakHint')} {t('team.bestStreak', { count: couple.couple?.best_team_streak ?? 0 })}
        </AppText>
      </Card>

      {couple.members.length > 1 ? (
        <Card>
          <TextField
            label={t('team.cheerPlaceholder')}
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setSent(false);
            }}
            maxLength={140}
          />
          {sent ? <AppText color={palette.success}>{t('team.cheerSent')}</AppText> : null}
          <Button
            label={t('team.cheer')}
            loading={cheer.isPending}
            onPress={async () => {
              await cheer.mutateAsync(message);
              setMessage('');
              setSent(true);
            }}
          />
        </Card>
      ) : null}

      <Section title={t('team.badges')}>
        <BadgeGrid earned={stats.data.badges} userId={userId} />
      </Section>

      <Section title={t('team.activity')}>
        {activity.isError ? (
          <ErrorState onRetry={() => activity.refetch()} />
        ) : (
          <ActivityList events={activity.data ?? []} nameOf={nameOf} partnerName={partnerName} />
        )}
      </Section>
    </Screen>
  );
}
