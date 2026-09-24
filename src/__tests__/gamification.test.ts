import {
  canComplete,
  canValidate,
  groupQuests,
  levelFromXp,
  questKind,
  teamProgress,
  validationBonus,
  xpForLevel,
} from '@/lib/gamification';
import type { QuestInstance } from '@/types/models';

const ME = 'me';
const PARTNER = 'partner';

function quest(overrides: Partial<QuestInstance>): QuestInstance {
  return {
    id: Math.random().toString(36),
    couple_id: 'c',
    template_slug: 'p_massage',
    assigned_to: ME,
    period_key: '2026-09-24',
    status: 'todo',
    xp: 10,
    completed_by: null,
    completed_at: null,
    validated_by: null,
    validated_at: null,
    created_at: '2026-09-24T00:00:00Z',
    ...overrides,
  };
}

describe('niveaux', () => {
  it('suit une courbe croissante', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(50);
    expect(xpForLevel(3)).toBe(150);
  });

  it('déduit le niveau de l’XP', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpInLevel: 0, xpToNext: 50, titleKey: 'levels.1' });
    expect(levelFromXp(49).level).toBe(1);
    expect(levelFromXp(50)).toMatchObject({ level: 2, xpInLevel: 0, xpToNext: 100 });
    expect(levelFromXp(200)).toMatchObject({ level: 3, xpInLevel: 50, progress: 50 / 150 });
    expect(levelFromXp(100_000).titleKey).toBe('levels.7');
  });
});

describe('quêtes', () => {
  it('bonus de validation identique à la base (+50 % arrondi au-dessus)', () => {
    expect(validationBonus(5)).toBe(3);
    expect(validationBonus(10)).toBe(5);
  });

  it('seul le membre assigné (ou toute l’équipe) peut terminer', () => {
    expect(canComplete(quest({}), ME)).toBe(true);
    expect(canComplete(quest({ assigned_to: PARTNER }), ME)).toBe(false);
    expect(canComplete(quest({ assigned_to: null }), ME)).toBe(true);
    expect(canComplete(quest({ status: 'done' }), ME)).toBe(false);
  });

  it('on valide uniquement la quête terminée par l’autre', () => {
    expect(canValidate(quest({ status: 'done', completed_by: PARTNER }), ME)).toBe(true);
    expect(canValidate(quest({ status: 'done', completed_by: ME }), ME)).toBe(false);
    expect(canValidate(quest({ status: 'validated', completed_by: PARTNER }), ME)).toBe(false);
  });

  it('reconnaît le type de période', () => {
    expect(questKind({ period_key: '2026-09-24' })).toBe('daily');
    expect(questKind({ period_key: '2026-W39' })).toBe('weekly');
    expect(questKind({ period_key: 'once' })).toBe('once');
  });

  it('regroupe et trie les quêtes', () => {
    const sections = groupQuests(
      [
        quest({ template_slug: 'b', status: 'done' }),
        quest({ template_slug: 'a' }),
        quest({ period_key: '2026-W39' }),
        quest({ period_key: 'once' }),
        quest({ assigned_to: null }),
        quest({ assigned_to: PARTNER }),
      ],
      ME,
    );
    expect(sections.daily.map((q) => q.template_slug)).toEqual(['a', 'b']);
    expect(sections.weekly).toHaveLength(1);
    expect(sections.milestones).toHaveLength(1);
    expect(sections.team).toHaveLength(1);
    expect(sections.partner).toHaveLength(1);
  });

  it('borne la jauge d’équipe', () => {
    expect(teamProgress(10, 20)).toBe(0.5);
    expect(teamProgress(40, 20)).toBe(1);
    expect(teamProgress(-1, 20)).toBe(0);
  });
});
