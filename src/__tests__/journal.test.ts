import { journalSchemas, moodEmoji, parseDecimal, readPayload } from '@/lib/journal';

describe('journal', () => {
  it('valide les payloads', () => {
    expect(journalSchemas.mood.safeParse({ score: 3 }).success).toBe(true);
    expect(journalSchemas.mood.safeParse({ score: 6 }).success).toBe(false);
    expect(journalSchemas.weight.safeParse({ kg: null }).success).toBe(false);
    expect(journalSchemas.appointment.safeParse({ title: 'Écho', date: '2026-10-01' }).success).toBe(true);
    expect(journalSchemas.appointment.safeParse({ title: 'Écho', date: '' }).success).toBe(false);
    expect(journalSchemas.note.safeParse({ text: '   ' }).success).toBe(false);
  });

  it('lit un payload stocké et ignore les données invalides', () => {
    expect(readPayload('symptom', { label: 'Nausées', intensity: 2 })).toEqual({ label: 'Nausées', intensity: 2 });
    expect(readPayload('symptom', { label: 'Nausées' })).toBeNull();
  });

  it('accepte la virgule décimale', () => {
    expect(parseDecimal('72,5')).toBe(72.5);
    expect(parseDecimal('72.5')).toBe(72.5);
    expect(parseDecimal('abc')).toBeNull();
  });

  it('associe un emoji à chaque humeur', () => {
    expect(moodEmoji(1)).toBe('😣');
    expect(moodEmoji(5)).toBe('😄');
    expect(moodEmoji(9)).toBe('😄');
  });
});
