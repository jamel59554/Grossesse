import { buildPushMessage } from '../../supabase/functions/notify-partner/messages';

describe('messages push', () => {
  it('invite à valider une quête individuelle', () => {
    expect(buildPushMessage('quest_completed', { xp: 10, team: false }, 'Alex')).toEqual({
      title: 'Quête terminée 🎯',
      body: 'Alex a terminé une quête (+10 XP). Viens la valider !',
      url: '/quests',
    });
  });

  it('distingue les quêtes d’équipe', () => {
    expect(buildPushMessage('quest_completed', { xp: 20, team: true }, 'Alex')?.body).toContain("quête d'équipe");
  });

  it('annonce le bonus de validation', () => {
    expect(buildPushMessage('quest_validated', { bonus: 5 }, 'Camille')?.body).toBe(
      'Camille a validé ta quête. +5 XP bonus pour toi.',
    );
  });

  it('montre l’humeur partagée avec son emoji', () => {
    expect(
      buildPushMessage('journal_added', { journal_kind: 'mood', payload: { score: 4 } }, 'Camille')?.body,
    ).toBe('Camille a partagé son humeur 🙂');
    expect(buildPushMessage('journal_added', { journal_kind: 'appointment' }, 'Camille')).toMatchObject({
      body: 'Camille a ajouté un rendez-vous au journal.',
      url: '/journal',
    });
  });

  it('relaie le message d’encouragement', () => {
    expect(buildPushMessage('cheer', { message: 'Tu gères' }, 'Alex')?.body).toBe("Alex t'encourage ! « Tu gères »");
    expect(buildPushMessage('cheer', {}, 'Alex')?.body).toBe("Alex t'encourage !");
  });

  it('ignore les événements sans intérêt et tolère les données inattendues', () => {
    expect(buildPushMessage('couple_created', {}, 'Alex')).toBeNull();
    expect(buildPushMessage('quest_completed', null, '')?.body).toBe('Ta moitié a terminé une quête. Viens la valider !');
  });

  it('ne renvoie vers les onglets connus de l’app', () => {
    const kinds = ['member_joined', 'quest_completed', 'quest_validated', 'badge_earned', 'cheer', 'journal_added'];
    for (const kind of kinds) {
      expect(['/', '/quests', '/journal', '/team']).toContain(buildPushMessage(kind, {}, 'A')?.url);
    }
  });
});
