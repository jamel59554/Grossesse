import type { TFunction } from 'i18next';

import { readPayload, moodEmoji } from '@/lib/journal';
import { formatFrenchDate, parseISODate } from '@/lib/pregnancy';
import type { ActivityEvent, JournalKind } from '@/types/models';

type Names = { nameOf: (userId: string | null) => string; partnerName: string };

export function questTitle(t: TFunction, slug: string, partnerName: string): string {
  return t(`quests.${slug}.title`, { name: partnerName });
}

export function questDescription(t: TFunction, slug: string, partnerName: string): string {
  return t(`quests.${slug}.description`, { name: partnerName });
}

export function journalSummary(t: TFunction, kind: JournalKind, payload: unknown): string {
  switch (kind) {
    case 'mood': {
      const p = readPayload('mood', payload);
      if (!p) break;
      const summary = t('journal.summary.mood', { emoji: moodEmoji(p.score) });
      return p.note ? `${summary} · ${p.note}` : summary;
    }
    case 'symptom': {
      const p = readPayload('symptom', payload);
      if (!p) break;
      return t('journal.summary.symptom', { label: p.label, intensity: t(`journal.intensity.${p.intensity}`) });
    }
    case 'weight': {
      const p = readPayload('weight', payload);
      if (!p) break;
      return t('journal.summary.weight', { kg: String(p.kg).replace('.', ',') });
    }
    case 'appointment': {
      const p = readPayload('appointment', payload);
      if (!p) break;
      const date = parseISODate(p.date);
      return t('journal.summary.appointment', { title: p.title, date: date ? formatFrenchDate(date) : p.date });
    }
    case 'note': {
      const p = readPayload('note', payload);
      if (!p) break;
      return t('journal.summary.note', { text: p.text });
    }
  }
  return t(`journal.kinds.${kind}`);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function describeActivity(t: TFunction, event: ActivityEvent, { nameOf, partnerName }: Names): string {
  const payload = (event.payload ?? {}) as Record<string, unknown>;
  const name = nameOf(event.actor_id);
  switch (event.kind) {
    case 'couple_created':
    case 'member_joined':
      return t(`activity.${event.kind}`, { name });
    case 'quest_completed':
      return t('activity.quest_completed', {
        name,
        quest: questTitle(t, str(payload.quest), partnerName),
        xp: payload.xp,
      });
    case 'quest_validated':
      return t('activity.quest_validated', {
        name,
        quest: questTitle(t, str(payload.quest), partnerName),
        bonus: payload.bonus,
      });
    case 'badge_earned':
      return t('activity.badge_earned', { name, badge: t(`badges.${str(payload.badge)}.title`) });
    case 'journal_added':
      return t('activity.journal_added', {
        name,
        summary: journalSummary(t, str(payload.journal_kind) as JournalKind, payload.payload),
      });
    case 'cheer':
      return payload.message
        ? t('activity.cheerWithMessage', { name, message: str(payload.message) })
        : t('activity.cheer', { name });
    default:
      return t('activity.unknown', { name });
  }
}
