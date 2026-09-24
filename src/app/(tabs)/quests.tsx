import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { QuestCard } from '@/components/duo';
import { AppText, ErrorState, Loading, Screen, Section } from '@/components/ui';
import { useQuestActions, useQuests, useQuestTemplates } from '@/hooks/use-duo';
import { useNames } from '@/hooks/use-names';
import { groupQuests, type QuestSections } from '@/lib/gamification';
import { errorCode } from '@/lib/supabase';
import { useMembership } from '@/providers/AuthProvider';
import { usePalette } from '@/theme';
import type { QuestInstance } from '@/types/models';

const SECTION_ORDER: (keyof QuestSections)[] = ['daily', 'weekly', 'team', 'milestones', 'partner'];
const KNOWN_ERRORS = ['already_completed', 'not_assigned', 'cannot_validate_own'];

export default function QuestsScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { userId } = useMembership();
  const quests = useQuests();
  const templates = useQuestTemplates();
  const { complete, validate } = useQuestActions();
  const { partnerName, nameOf } = useNames();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  if (quests.isPending) return <Loading />;
  if (quests.isError) {
    return (
      <Screen>
        <ErrorState onRetry={() => quests.refetch()} />
      </Screen>
    );
  }

  const sections = groupQuests(quests.data, userId);

  async function run(quest: QuestInstance, action: typeof complete, successText: string) {
    setBusyId(quest.id);
    setFeedback(null);
    try {
      await action.mutateAsync(quest.id);
      setFeedback({ text: successText, error: false });
    } catch (error) {
      const code = errorCode(error);
      setFeedback({
        text: KNOWN_ERRORS.includes(code) ? t(`quests.errors.${code}`) : t('common.error'),
        error: true,
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen refreshing={quests.isRefetching} onRefresh={() => quests.refetch()}>
      <AppText variant="title">{t('quests.title')}</AppText>
      <AppText muted>{t('quests.subtitle')}</AppText>
      {feedback ? (
        <AppText color={feedback.error ? palette.danger : palette.success} accessibilityLiveRegion="polite">
          {feedback.text}
        </AppText>
      ) : null}
      {quests.data.length === 0 ? <AppText muted>{t('quests.empty')}</AppText> : null}
      {SECTION_ORDER.filter((key) => sections[key].length > 0).map((key) => (
        <Section key={key} title={key === 'partner' ? t('quests.partner', { name: partnerName }) : t(`quests.${key}`)}>
          {sections[key].map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              template={templates.data?.get(quest.template_slug)}
              userId={userId}
              partnerName={partnerName}
              nameOf={nameOf}
              busy={busyId === quest.id}
              onComplete={(q) => run(q, complete, t('quests.completedToast', { xp: q.xp }))}
              onValidate={(q) => run(q, validate, t('quests.validated'))}
            />
          ))}
        </Section>
      ))}
    </Screen>
  );
}
