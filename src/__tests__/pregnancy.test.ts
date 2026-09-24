import {
  dueDateFromLmp,
  getPregnancyProgress,
  lmpFromDueDate,
  parseFrenchDate,
  parseISODate,
  toISODate,
  trimesterForWeek,
  validateLmp,
} from '@/lib/pregnancy';

const day = (iso: string) => parseISODate(iso)!;

describe('pregnancy', () => {
  it('calcule les SA révolues et les jours', () => {
    const p = getPregnancyProgress(day('2026-01-01'), day('2026-03-20'));
    expect(p.daysPregnant).toBe(78);
    expect(p.weeks).toBe(11);
    expect(p.days).toBe(1);
    expect(p.trimester).toBe(1);
  });

  it('terme à 280 jours et aller-retour DPA ↔ DDR', () => {
    const lmp = day('2026-01-01');
    expect(toISODate(dueDateFromLmp(lmp))).toBe('2026-10-08');
    expect(toISODate(lmpFromDueDate(dueDateFromLmp(lmp)))).toBe('2026-01-01');
  });

  it('borne le contenu hebdomadaire et les jours restants', () => {
    expect(getPregnancyProgress(day('2026-01-01'), day('2026-01-03')).contentWeek).toBe(4);
    const late = getPregnancyProgress(day('2025-01-01'), day('2025-11-01'));
    expect(late.contentWeek).toBe(41);
    expect(late.daysLeft).toBe(0);
    expect(late.progress).toBe(1);
  });

  it('découpe les trimestres', () => {
    expect(trimesterForWeek(13)).toBe(1);
    expect(trimesterForWeek(14)).toBe(2);
    expect(trimesterForWeek(27)).toBe(2);
    expect(trimesterForWeek(28)).toBe(3);
  });

  it('parse les dates françaises strictement', () => {
    expect(toISODate(parseFrenchDate('08/10/2026')!)).toBe('2026-10-08');
    expect(parseFrenchDate('31/02/2026')).toBeNull();
    expect(parseFrenchDate('2026-10-08')).toBeNull();
    expect(parseISODate('2026-13-01')).toBeNull();
  });

  it('valide la date des dernières règles', () => {
    const today = day('2026-09-24');
    expect(validateLmp(day('2026-05-01'), today)).toBe('ok');
    expect(validateLmp(day('2026-10-01'), today)).toBe('future');
    expect(validateLmp(day('2025-09-01'), today)).toBe('too_old');
  });
});
