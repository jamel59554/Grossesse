import { z } from 'zod';

import type { JournalKind } from '@/types/models';

export const MOOD_EMOJIS = ['😣', '😕', '😐', '🙂', '😄'] as const;

export const moodSchema = z.object({
  score: z.number().int().min(1).max(5),
  note: z.string().trim().max(280).optional(),
});

export const symptomSchema = z.object({
  label: z.string().trim().min(1).max(80),
  intensity: z.number().int().min(1).max(3),
});

export const weightSchema = z.object({
  kg: z.number().min(30).max(250),
});

export const appointmentSchema = z.object({
  title: z.string().trim().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().trim().max(120).optional(),
});

export const noteSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

export const journalSchemas = {
  mood: moodSchema,
  symptom: symptomSchema,
  weight: weightSchema,
  appointment: appointmentSchema,
  note: noteSchema,
} satisfies Record<JournalKind, z.ZodType>;

export type MoodPayload = z.infer<typeof moodSchema>;
export type SymptomPayload = z.infer<typeof symptomSchema>;
export type WeightPayload = z.infer<typeof weightSchema>;
export type AppointmentPayload = z.infer<typeof appointmentSchema>;
export type NotePayload = z.infer<typeof noteSchema>;

export type JournalPayloads = {
  mood: MoodPayload;
  symptom: SymptomPayload;
  weight: WeightPayload;
  appointment: AppointmentPayload;
  note: NotePayload;
};

/** Lit un payload stocké en base ; renvoie null s'il est invalide. */
export function readPayload<K extends JournalKind>(kind: K, payload: unknown): JournalPayloads[K] | null {
  const result = journalSchemas[kind].safeParse(payload);
  return result.success ? (result.data as JournalPayloads[K]) : null;
}

/** Accepte « 72,5 » comme « 72.5 ». */
export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

export function moodEmoji(score: number): string {
  return MOOD_EMOJIS[Math.min(5, Math.max(1, Math.round(score))) - 1];
}
