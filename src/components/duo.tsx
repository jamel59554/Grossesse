import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ProgressBar, Row } from '@/components/ui';
import { BADGES, CATEGORY_EMOJI } from '@/data/badges';
import { getWeekData } from '@/data/weeks';
import { describeActivity, questDescription, questTitle } from '@/lib/describe';
import { canComplete, canValidate, levelFromXp, validationBonus } from '@/lib/gamification';
import type { PregnancyProgress } from '@/lib/pregnancy';
import { radius, spacing, usePalette } from '@/theme';
import type { ActivityEvent, BadgeEarned, QuestInstance, QuestTemplate, UserStats } from '@/types/models';

export function WeekCard({ progress }: { progress: PregnancyProgress }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const week = getWeekData(progress.contentWeek);
  const weight =
    week.weightG < 1
      ? t('home.weightLess')
      : week.weightG >= 1000
        ? t('home.weightKg', { count: Number((week.weightG / 1000).toFixed(1)) })
        : t('home.weightG', { count: week.weightG });
  return (
    <Card tone="alt">
      <Row style={styles.spaceBetween}>
        <View style={styles.flex}>
          <AppText variant="title">{t('home.weekTitle', { weeks: progress.weeks, days: progress.days })}</AppText>
          <AppText muted>
            {t('home.trimester', { count: progress.trimester })} · {t('home.daysLeft', { count: progress.daysLeft })}
          </AppText>
        </View>
        <AppText style={styles.bigEmoji} accessibilityElementsHidden>
          {week.emoji}
        </AppText>
      </Row>
      <ProgressBar progress={progress.progress} color={palette.primary} />
      <AppText variant="heading">{t('home.babySize', { fruit: t(`weeks.${progress.contentWeek}.fruit`) })}</AppText>
      <AppText muted>{t('home.babyStats', { length: String(week.lengthCm).replace('.', ','), weight })}</AppText>
    </Card>
  );
}

export function XpBar({ xp }: { xp: number }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const level = levelFromXp(xp);
  return (
    <View style={styles.gapXs}>
      <Row style={styles.spaceBetween}>
        <AppText variant="caption" style={styles.bold}>
          {t('team.level', { level: level.level })} · {t(level.titleKey)}
        </AppText>
        <AppText variant="caption" muted>
          {t('team.xpProgress', { current: level.xpInLevel, total: level.xpToNext })}
        </AppText>
      </Row>
      <ProgressBar progress={level.progress} color={palette.accent} />
    </View>
  );
}

type QuestCardProps = {
  quest: QuestInstance;
  template?: QuestTemplate;
  userId: string;
  partnerName: string;
  nameOf: (userId: string | null) => string;
  onComplete: (quest: QuestInstance) => void;
  onValidate: (quest: QuestInstance) => void;
  busy?: boolean;
};

export function QuestCard({ quest, template, userId, partnerName, nameOf, onComplete, onValidate, busy }: QuestCardProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const done = quest.status !== 'todo';
  const completerName = nameOf(quest.completed_by);
  return (
    <Card style={done ? { opacity: 0.85 } : undefined}>
      <Row style={styles.alignStart}>
        <View style={[styles.questIcon, { backgroundColor: palette.surfaceAlt }]}>
          <AppText style={styles.questEmoji}>{done ? '✅' : CATEGORY_EMOJI[template?.category ?? 'care']}</AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" style={done ? styles.strike : undefined}>
            {questTitle(t, quest.template_slug, partnerName)}
          </AppText>
          <AppText variant="caption" muted>
            {questDescription(t, quest.template_slug, partnerName)}
          </AppText>
        </View>
        <View style={[styles.xpPill, { backgroundColor: palette.accent }]}>
          <AppText variant="caption" color="#2B2330" style={styles.bold}>
            +{quest.xp}
          </AppText>
        </View>
      </Row>
      <Row style={styles.spaceBetween}>
        <AppText variant="caption" muted>
          {quest.status === 'validated'
            ? t('quests.validated')
            : quest.status === 'done'
              ? quest.completed_by === userId
                ? t('quests.waitingValidation')
                : t('quests.doneBy', { name: completerName })
              : ''}
        </AppText>
        {canComplete(quest, userId) ? (
          <Button small label={t('quests.complete')} loading={busy} onPress={() => onComplete(quest)} />
        ) : canValidate(quest, userId) ? (
          <Button
            small
            variant="success"
            label={t('quests.validate', { bonus: validationBonus(quest.xp), name: completerName })}
            loading={busy}
            onPress={() => onValidate(quest)}
          />
        ) : null}
      </Row>
    </Card>
  );
}

export function MemberCard({
  name,
  roleLabel,
  stats,
  highlight,
}: {
  name: string;
  roleLabel: string;
  stats?: UserStats;
  highlight?: boolean;
}) {
  const { t } = useTranslation();
  const palette = usePalette();
  return (
    <Card style={highlight ? { ...styles.flex, borderColor: palette.primary, borderWidth: 1.5 } : styles.flex}>
      <AppText variant="heading" numberOfLines={1}>
        {name}
      </AppText>
      <AppText variant="caption" muted>
        {roleLabel}
      </AppText>
      <XpBar xp={stats?.xp ?? 0} />
      <AppText variant="caption">
        🔥 {t('team.streak', { count: stats?.current_streak ?? 0 })} · {t('team.bestStreak', { count: stats?.best_streak ?? 0 })}
      </AppText>
    </Card>
  );
}

export function BadgeGrid({ earned, userId }: { earned: BadgeEarned[]; userId: string }) {
  const { t } = useTranslation();
  const palette = usePalette();
  const mine = new Set(earned.filter((b) => b.user_id === userId).map((b) => b.badge_slug));
  return (
    <View style={styles.badgeGrid}>
      {BADGES.map((badge) => {
        const unlocked = mine.has(badge.slug);
        return (
          <View
            key={badge.slug}
            accessibilityLabel={`${t(`badges.${badge.slug}.title`)} : ${t(`badges.${badge.slug}.description`)}`}
            style={[
              styles.badge,
              { backgroundColor: unlocked ? palette.surfaceAlt : palette.surface, borderColor: palette.border },
            ]}>
            <AppText style={[styles.badgeEmoji, !unlocked && styles.locked]}>{unlocked ? badge.emoji : '🔒'}</AppText>
            <AppText variant="caption" numberOfLines={2} style={styles.center} muted={!unlocked}>
              {t(`badges.${badge.slug}.title`)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

export function ActivityList({
  events,
  nameOf,
  partnerName,
}: {
  events: ActivityEvent[];
  nameOf: (userId: string | null) => string;
  partnerName: string;
}) {
  const { t } = useTranslation();
  const palette = usePalette();
  if (events.length === 0) {
    return <AppText muted>{t('team.noActivity')}</AppText>;
  }
  return (
    <Card>
      {events.map((event, index) => (
        <View
          key={event.id}
          style={[styles.activity, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.border }]}>
          <AppText>{describeActivity(t, event, { nameOf, partnerName })}</AppText>
          <AppText variant="caption" muted>
            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: fr })}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

/** Bandeau éphémère pour les actions de l'autre membre, reçues en temps réel. */
export function Toast({ message, onHide }: { message: string | null; onHide: () => void }) {
  const palette = usePalette();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onHide());
    }, 3500);
    return () => clearTimeout(timer);
  }, [message, opacity, onHide]);

  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { opacity, backgroundColor: palette.text }]}>
      <AppText color={palette.background}>{message}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gapXs: { gap: spacing.xs },
  bold: { fontWeight: '700' },
  center: { textAlign: 'center' },
  strike: { textDecorationLine: 'line-through' },
  spaceBetween: { justifyContent: 'space-between', flexWrap: 'nowrap' },
  alignStart: { alignItems: 'flex-start', flexWrap: 'nowrap' },
  bigEmoji: { fontSize: 56, lineHeight: 68 },
  questIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  questEmoji: { fontSize: 20 },
  xpPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    width: 96,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  badgeEmoji: { fontSize: 28 },
  locked: { opacity: 0.4 },
  activity: { paddingVertical: spacing.sm, gap: 2 },
  toast: {
    position: 'absolute',
    top: 56,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    zIndex: 10,
  },
});
