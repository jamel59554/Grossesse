import { addDays, differenceInCalendarDays, format, isValid, parse } from 'date-fns';

/** Durée de référence d'une grossesse : 280 jours (40 SA) depuis les dernières règles. */
export const PREGNANCY_DAYS = 280;
export const MIN_CONTENT_WEEK = 4;
export const MAX_CONTENT_WEEK = 41;
/** Même borne que la base : une date de dernières règles au plus 300 jours dans le passé. */
export const MAX_LMP_AGE_DAYS = 300;

export type Trimester = 1 | 2 | 3;

export type PregnancyProgress = {
  /** Jours écoulés depuis les dernières règles. */
  daysPregnant: number;
  /** Semaines d'aménorrhée révolues (SA). */
  weeks: number;
  /** Jours au-delà des semaines révolues (0–6). */
  days: number;
  trimester: Trimester;
  daysLeft: number;
  /** Avancement entre 0 et 1. */
  progress: number;
  dueDate: Date;
  /** Semaine utilisée pour le contenu hebdomadaire (bornée). */
  contentWeek: number;
};

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parse une date `YYYY-MM-DD` en date locale (sans décalage de fuseau). */
export function parseISODate(value: string): Date | null {
  const date = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(date) && toISODate(date) === value ? date : null;
}

/** Parse une date saisie au format français `JJ/MM/AAAA`. */
export function parseFrenchDate(value: string): Date | null {
  const trimmed = value.trim();
  const date = parse(trimmed, 'dd/MM/yyyy', new Date());
  return isValid(date) && format(date, 'dd/MM/yyyy') === trimmed ? date : null;
}

export function formatFrenchDate(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

export function lmpFromDueDate(dueDate: Date): Date {
  return addDays(dueDate, -PREGNANCY_DAYS);
}

export function dueDateFromLmp(lmp: Date): Date {
  return addDays(lmp, PREGNANCY_DAYS);
}

export function trimesterForWeek(weeks: number): Trimester {
  if (weeks < 14) return 1;
  if (weeks < 28) return 2;
  return 3;
}

export function getPregnancyProgress(lmp: Date, today: Date = new Date()): PregnancyProgress {
  const daysPregnant = Math.max(0, differenceInCalendarDays(today, lmp));
  const weeks = Math.floor(daysPregnant / 7);
  const dueDate = dueDateFromLmp(lmp);
  return {
    daysPregnant,
    weeks,
    days: daysPregnant % 7,
    trimester: trimesterForWeek(weeks),
    daysLeft: Math.max(0, differenceInCalendarDays(dueDate, today)),
    progress: Math.min(1, daysPregnant / PREGNANCY_DAYS),
    dueDate,
    contentWeek: Math.min(MAX_CONTENT_WEEK, Math.max(MIN_CONTENT_WEEK, weeks)),
  };
}

export type LmpValidation = 'ok' | 'future' | 'too_old';

export function validateLmp(lmp: Date, today: Date = new Date()): LmpValidation {
  const age = differenceInCalendarDays(today, lmp);
  if (age < 0) return 'future';
  if (age > MAX_LMP_AGE_DAYS) return 'too_old';
  return 'ok';
}
