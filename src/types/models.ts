// Alias lisibles au-dessus des types générés (src/types/database.ts).
// Régénérer ces derniers après chaque migration : npm run gen:types
import type { Database, Enums, Tables } from './database';

export type { Database, Json } from './database';

export type MemberRole = Enums<'member_role'>;
export type QuestStatus = Enums<'quest_status'>;
export type JournalKind = Enums<'journal_kind'>;

export type Profile = Tables<'profiles'>;
export type Couple = Tables<'couples'>;
export type CoupleMember = Tables<'couple_members'>;
export type QuestTemplate = Tables<'quest_templates'>;
export type QuestInstance = Tables<'quest_instances'>;
export type JournalEntry = Tables<'journal_entries'>;
export type ActivityEvent = Tables<'activity_events'>;
export type UserStats = Tables<'user_stats'>;
export type BadgeEarned = Tables<'badges_earned'>;

export type PublicFunctions = Database['public']['Functions'];
