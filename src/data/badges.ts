/**
 * Badges attribués côté base (fonction `check_badges` de la migration).
 * Les libellés sont dans `badges.<slug>` des traductions.
 */
export const BADGES = [
  { slug: 'duo_formed', emoji: '🤝' },
  { slug: 'first_quest', emoji: '⭐' },
  { slug: 'quests_10', emoji: '🏅' },
  { slug: 'quests_50', emoji: '🏆' },
  { slug: 'streak_7', emoji: '🔥' },
  { slug: 'team_streak_3', emoji: '💞' },
  { slug: 'team_streak_7', emoji: '💪' },
  { slug: 'team_streak_30', emoji: '👑' },
  { slug: 'validator_5', emoji: '✅' },
  { slug: 'cheerleader', emoji: '📣' },
  { slug: 'first_appointment', emoji: '🩺' },
  { slug: 'crib_ready', emoji: '🛏️' },
  { slug: 'hospital_bag', emoji: '🧳' },
] as const;

export type BadgeSlug = (typeof BADGES)[number]['slug'];

export function badgeEmoji(slug: string): string {
  return BADGES.find((badge) => badge.slug === slug)?.emoji ?? '🎖️';
}

export const CATEGORY_EMOJI: Record<string, string> = {
  care: '💝',
  prep: '🧰',
  learn: '📚',
  bond: '💞',
  health: '🩺',
};
