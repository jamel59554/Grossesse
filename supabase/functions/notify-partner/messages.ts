// Textes des notifications push (TS pur : importé par l'Edge Function et par Jest).

export type PushMessage = { title: string; body: string; url: string };

const MOODS = ['😣', '😕', '😐', '🙂', '😄'];

const JOURNAL_LABELS: Record<string, string> = {
  mood: 'son humeur',
  symptom: 'un symptôme',
  weight: 'son poids',
  appointment: 'un rendez-vous',
  note: 'une note',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Construit la notification envoyée à l'autre membre du duo pour un événement
 * du fil d'activité. Renvoie null pour les événements qui ne méritent pas d'alerte.
 */
export function buildPushMessage(kind: string, rawPayload: unknown, actorName: string): PushMessage | null {
  const payload = asRecord(rawPayload);
  const name = actorName.trim() || 'Ta moitié';

  switch (kind) {
    case 'member_joined':
      return { title: 'Duo formé 🤝', body: `${name} a rejoint votre espace. L'aventure commence !`, url: '/team' };
    case 'quest_completed': {
      const xp = typeof payload.xp === 'number' ? ` (+${payload.xp} XP)` : '';
      return payload.team
        ? { title: 'Quête d\'équipe 🎯', body: `${name} a terminé une quête d'équipe${xp}. Bravo à vous deux !`, url: '/quests' }
        : { title: 'Quête terminée 🎯', body: `${name} a terminé une quête${xp}. Viens la valider !`, url: '/quests' };
    }
    case 'quest_validated': {
      const bonus = typeof payload.bonus === 'number' ? ` +${payload.bonus} XP bonus pour toi.` : '';
      return { title: 'Quête validée ✨', body: `${name} a validé ta quête.${bonus}`, url: '/team' };
    }
    case 'badge_earned':
      return { title: 'Nouveau badge 🏅', body: `${name} a débloqué un badge. Va voir !`, url: '/team' };
    case 'cheer': {
      const message = typeof payload.message === 'string' && payload.message ? ` « ${payload.message} »` : '';
      return { title: 'Encouragement 📣', body: `${name} t'encourage !${message}`, url: '/team' };
    }
    case 'journal_added': {
      const journalKind = typeof payload.journal_kind === 'string' ? payload.journal_kind : '';
      if (journalKind === 'mood') {
        const score = asRecord(payload.payload).score;
        const emoji = typeof score === 'number' ? ` ${MOODS[Math.min(5, Math.max(1, score)) - 1]}` : '';
        return { title: 'Humeur du jour', body: `${name} a partagé son humeur${emoji}`, url: '/' };
      }
      return {
        title: 'Journal 📔',
        body: `${name} a ajouté ${JOURNAL_LABELS[journalKind] ?? 'une entrée'} au journal.`,
        url: '/journal',
      };
    }
    default:
      return null;
  }
}
