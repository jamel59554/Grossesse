// Edge Function appelée par le trigger `activity_events_notify_partner`.
// Reçoit { event_id }, relit l'événement avec la clé service et envoie une
// notification Expo aux autres membres du duo.
//
// Pas de secret partagé : l'événement est « réservé » atomiquement
// (pushed_at null → now()) et doit dater de moins de 5 minutes. Un appel
// forgé ne peut donc que déclencher une notification légitime non encore envoyée.
//
// Aucune dépendance : l'API REST de Supabase est appelée directement.

import { buildPushMessage } from './messages.ts';

const REST_URL = `${Deno.env.get('SUPABASE_URL')}/rest/v1`;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = Deno.env.get('EXPO_PUSH_URL') ?? 'https://exp.host/--/api/v2/push/send';

type ActivityEvent = { id: number; couple_id: string; actor_id: string | null; kind: string; payload: unknown };
type Member = { user_id: string; profiles: { display_name: string; push_enabled: boolean } | null };
type ExpoTicket = { status: 'ok' | 'error'; details?: { error?: string } };

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${REST_URL}/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** Valeurs pour un filtre PostgREST `in.(...)`, entre guillemets (les jetons contiennent des crochets). */
function inList(values: string[]): string {
  return encodeURIComponent(`(${values.map((v) => `"${v.replaceAll('"', '')}"`).join(',')})`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let eventId: number;
  try {
    eventId = Number((await req.json())?.event_id);
    if (!Number.isInteger(eventId)) throw new Error('event_id');
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  try {
    const since = encodeURIComponent(new Date(Date.now() - 5 * 60 * 1000).toISOString());
    const [event] = await rest<ActivityEvent[]>(
      `activity_events?id=eq.${eventId}&pushed_at=is.null&created_at=gte.${since}&select=id,couple_id,actor_id,kind,payload`,
      { method: 'PATCH', body: JSON.stringify({ pushed_at: new Date().toISOString() }) },
    );
    if (!event?.actor_id) return Response.json({ sent: 0, reason: 'not_found_or_already_sent' });

    const members = await rest<Member[]>(
      `couple_members?couple_id=eq.${event.couple_id}&select=user_id,profiles(display_name,push_enabled)`,
    );
    const actorName = members.find((m) => m.user_id === event.actor_id)?.profiles?.display_name ?? '';
    const recipients = members
      .filter((m) => m.user_id !== event.actor_id && m.profiles?.push_enabled !== false)
      .map((m) => m.user_id);

    const message = buildPushMessage(event.kind, event.payload, actorName);
    if (!message || recipients.length === 0) return Response.json({ sent: 0, reason: 'nothing_to_send' });

    const tokens = await rest<{ token: string }[]>(`push_tokens?user_id=in.${inList(recipients)}&select=token`);
    const to = tokens.map((t) => t.token);
    if (to.length === 0) return Response.json({ sent: 0, reason: 'no_tokens' });

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        to.map((token) => ({
          to: token,
          title: message.title,
          body: message.body,
          data: { url: message.url },
          sound: 'default',
          channelId: 'default',
        })),
      ),
    });
    const result = await response.json().catch(() => ({}));
    const tickets: ExpoTicket[] = Array.isArray(result?.data) ? result.data : [];

    // Jetons d'appareils désinstallés ou invalides : on les oublie.
    const stale = tickets
      .map((ticket, index) =>
        ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? to[index] : null,
      )
      .filter((token): token is string => token !== null);
    if (stale.length > 0) await rest(`push_tokens?token=in.${inList(stale)}`, { method: 'DELETE' });

    console.log(JSON.stringify({ event: event.id, kind: event.kind, sent: to.length, stale: stale.length, expo: response.status }));
    return Response.json({ sent: to.length, stale: stale.length });
  } catch (error) {
    console.error(error);
    return new Response(String(error), { status: 500 });
  }
});
