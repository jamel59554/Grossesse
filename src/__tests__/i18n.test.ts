import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { BADGES } from '@/data/badges';
import { WEEKS } from '@/data/weeks';
import i18n from '@/i18n';
import { describeActivity } from '@/lib/describe';
import type { ActivityEvent } from '@/types/models';

const root = join(__dirname, '..', '..');
const seed = readFileSync(join(root, 'supabase/seed.sql'), 'utf8');
const migrationsDir = join(root, 'supabase/migrations');
const migration = readdirSync(migrationsDir)
  .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
  .join('\n');

const seedSlugs = [...seed.matchAll(/^\s*\('([a-z0-9_]+)',/gm)].map((m) => m[1]);
const sqlBadges = [...migration.matchAll(/grant_badge\([^'\n]*'([a-z0-9_]+)'\)/g)].map((m) => m[1]);

describe('cohérence base ↔ traductions', () => {
  it('trouve les quêtes du seed', () => {
    expect(seedSlugs.length).toBeGreaterThan(30);
  });

  it.each(seedSlugs)('la quête %s a un titre et une description', (slug) => {
    expect(i18n.exists(`quests.${slug}.title`)).toBe(true);
    expect(i18n.exists(`quests.${slug}.description`)).toBe(true);
  });

  it('chaque badge attribué en base existe côté app et est traduit', () => {
    const appBadges = BADGES.map((b) => b.slug as string);
    expect(new Set(sqlBadges)).toEqual(new Set(appBadges));
    for (const slug of appBadges) expect(i18n.exists(`badges.${slug}.title`)).toBe(true);
  });

  it('chaque semaine a son contenu', () => {
    for (const week of Object.keys(WEEKS)) {
      for (const key of ['fruit', 'baby', 'carrier', 'partner']) {
        expect(i18n.exists(`weeks.${week}.${key}`)).toBe(true);
      }
    }
  });
});

describe('fil d’activité', () => {
  const names = { nameOf: () => 'Alex', partnerName: 'Camille' };
  const event = (kind: string, payload: Record<string, unknown>): ActivityEvent => ({
    id: 1,
    couple_id: 'c',
    actor_id: 'a',
    kind,
    payload: payload as ActivityEvent['payload'],
    created_at: '2026-09-24T10:00:00Z',
    pushed_at: null,
  });

  it('décrit une quête terminée avec le prénom du/de la partenaire', () => {
    expect(describeActivity(i18n.t, event('quest_completed', { quest: 'p_massage', xp: 10 }), names)).toBe(
      'Alex a terminé « Massage des pieds ou du dos » (+10 XP)',
    );
    expect(describeActivity(i18n.t, event('quest_completed', { quest: 'p_surprise', xp: 15 }), names)).toContain(
      'Camille',
    );
  });

  it('décrit une humeur partagée et un badge', () => {
    expect(
      describeActivity(i18n.t, event('journal_added', { journal_kind: 'mood', payload: { score: 5 } }), names),
    ).toBe('Alex a ajouté au journal : Humeur 😄');
    expect(describeActivity(i18n.t, event('badge_earned', { badge: 'hospital_bag' }), names)).toBe(
      'Alex a débloqué le badge Valise prête',
    );
  });
});
