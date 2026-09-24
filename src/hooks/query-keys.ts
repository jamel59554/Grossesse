export const queryKeys = {
  me: (userId: string | null) => ['me', userId] as const,
  couple: (coupleId: string) => ['couple', coupleId] as const,
  quests: (coupleId: string) => ['quests', coupleId] as const,
  weekCount: (coupleId: string) => ['quests', coupleId, 'week-count'] as const,
  stats: (coupleId: string) => ['stats', coupleId] as const,
  activity: (coupleId: string) => ['activity', coupleId] as const,
  journal: (coupleId: string) => ['journal', coupleId] as const,
};
