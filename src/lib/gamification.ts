import type { QuestInstance } from '@/types/models';

/** Objectif hebdomadaire commun affiché dans la jauge d'équipe. */
export const TEAM_WEEKLY_GOAL = 20;
/** Titres disponibles : `levels.1` … `levels.7` dans les traductions. */
export const MAX_TITLED_LEVEL = 7;

/** XP cumulée nécessaire pour atteindre un niveau (niveau 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return 25 * n * (n - 1);
}

export type LevelInfo = {
  level: number;
  /** XP acquise dans le niveau courant. */
  xpInLevel: number;
  /** XP nécessaire pour passer au niveau suivant depuis le début du niveau courant. */
  xpToNext: number;
  progress: number;
  titleKey: string;
};

export function levelFromXp(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= total) level += 1;
  const start = xpForLevel(level);
  const xpToNext = xpForLevel(level + 1) - start;
  return {
    level,
    xpInLevel: total - start,
    xpToNext,
    progress: (total - start) / xpToNext,
    titleKey: `levels.${Math.min(level, MAX_TITLED_LEVEL)}`,
  };
}

/** Miroir de `validate_quest` côté base : +50 % arrondi au supérieur. */
export function validationBonus(xp: number): number {
  return Math.ceil(xp * 0.5);
}

export function canComplete(quest: QuestInstance, userId: string): boolean {
  return quest.status === 'todo' && (quest.assigned_to === null || quest.assigned_to === userId);
}

export function canValidate(quest: QuestInstance, userId: string): boolean {
  return quest.status === 'done' && quest.completed_by !== null && quest.completed_by !== userId;
}

export type QuestKind = 'daily' | 'weekly' | 'once';

export function questKind(quest: Pick<QuestInstance, 'period_key'>): QuestKind {
  if (quest.period_key === 'once') return 'once';
  if (quest.period_key.includes('W')) return 'weekly';
  return 'daily';
}

export type QuestSections = {
  daily: QuestInstance[];
  weekly: QuestInstance[];
  milestones: QuestInstance[];
  team: QuestInstance[];
  partner: QuestInstance[];
};

const statusOrder: Record<QuestInstance['status'], number> = { todo: 0, done: 1, validated: 2 };

function sortQuests(quests: QuestInstance[]): QuestInstance[] {
  return [...quests].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status] || a.template_slug.localeCompare(b.template_slug),
  );
}

/** Répartit les quêtes : les miennes par type, celles de l'équipe, et celles du/de la partenaire. */
export function groupQuests(quests: QuestInstance[], userId: string): QuestSections {
  const sections: QuestSections = { daily: [], weekly: [], milestones: [], team: [], partner: [] };
  for (const quest of quests) {
    if (quest.assigned_to === null) sections.team.push(quest);
    else if (quest.assigned_to !== userId) sections.partner.push(quest);
    else if (questKind(quest) === 'daily') sections.daily.push(quest);
    else if (questKind(quest) === 'weekly') sections.weekly.push(quest);
    else sections.milestones.push(quest);
  }
  return {
    daily: sortQuests(sections.daily),
    weekly: sortQuests(sections.weekly),
    milestones: sortQuests(sections.milestones),
    team: sortQuests(sections.team),
    partner: sortQuests(sections.partner),
  };
}

export function teamProgress(completedThisWeek: number, goal: number = TEAM_WEEKLY_GOAL): number {
  return Math.min(1, Math.max(0, completedThisWeek) / goal);
}
