/**
 * Repères de croissance indicatifs, par semaine d'aménorrhée (SA).
 * Longueur : cranio-caudale jusqu'à 19 SA, puis tête-talons.
 * Les noms des fruits et les conseils sont dans src/i18n/locales/fr/weeks.json.
 */
export type WeekData = { emoji: string; lengthCm: number; weightG: number };

export const WEEKS: Record<number, WeekData> = {
  4: { emoji: '🌱', lengthCm: 0.1, weightG: 0 },
  5: { emoji: '🌱', lengthCm: 0.2, weightG: 0 },
  6: { emoji: '🫘', lengthCm: 0.4, weightG: 0 },
  7: { emoji: '🫐', lengthCm: 1, weightG: 0 },
  8: { emoji: '🍒', lengthCm: 1.6, weightG: 1 },
  9: { emoji: '🍇', lengthCm: 2.3, weightG: 2 },
  10: { emoji: '🍓', lengthCm: 3.1, weightG: 4 },
  11: { emoji: '🌰', lengthCm: 4.1, weightG: 7 },
  12: { emoji: '🍋', lengthCm: 5.4, weightG: 14 },
  13: { emoji: '🍑', lengthCm: 7.4, weightG: 23 },
  14: { emoji: '🍊', lengthCm: 8.7, weightG: 43 },
  15: { emoji: '🍎', lengthCm: 10.1, weightG: 70 },
  16: { emoji: '🥑', lengthCm: 11.6, weightG: 100 },
  17: { emoji: '🍐', lengthCm: 13, weightG: 140 },
  18: { emoji: '🫑', lengthCm: 14.2, weightG: 190 },
  19: { emoji: '🥭', lengthCm: 15.3, weightG: 240 },
  20: { emoji: '🍌', lengthCm: 25.6, weightG: 300 },
  21: { emoji: '🥕', lengthCm: 26.7, weightG: 360 },
  22: { emoji: '🥥', lengthCm: 27.8, weightG: 430 },
  23: { emoji: '🍆', lengthCm: 28.9, weightG: 500 },
  24: { emoji: '🌽', lengthCm: 30, weightG: 600 },
  25: { emoji: '🥦', lengthCm: 34.6, weightG: 660 },
  26: { emoji: '🥬', lengthCm: 35.6, weightG: 760 },
  27: { emoji: '🥒', lengthCm: 36.6, weightG: 875 },
  28: { emoji: '🍆', lengthCm: 37.6, weightG: 1000 },
  29: { emoji: '🎃', lengthCm: 38.6, weightG: 1150 },
  30: { emoji: '🥬', lengthCm: 39.9, weightG: 1300 },
  31: { emoji: '🥥', lengthCm: 41.1, weightG: 1500 },
  32: { emoji: '🍍', lengthCm: 42.4, weightG: 1700 },
  33: { emoji: '🍍', lengthCm: 43.7, weightG: 1900 },
  34: { emoji: '🍈', lengthCm: 45, weightG: 2100 },
  35: { emoji: '🍈', lengthCm: 46.2, weightG: 2400 },
  36: { emoji: '🥬', lengthCm: 47.4, weightG: 2600 },
  37: { emoji: '🍉', lengthCm: 48.6, weightG: 2900 },
  38: { emoji: '🍉', lengthCm: 49.8, weightG: 3100 },
  39: { emoji: '🍉', lengthCm: 50.7, weightG: 3300 },
  40: { emoji: '🎃', lengthCm: 51.2, weightG: 3500 },
  41: { emoji: '🎃', lengthCm: 51.7, weightG: 3600 },
};

export function getWeekData(week: number): WeekData {
  return WEEKS[week] ?? WEEKS[Math.min(41, Math.max(4, week))];
}
