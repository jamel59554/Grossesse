import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfWeek } from 'date-fns';
import { useEffect, useRef } from 'react';

import { queryKeys } from '@/hooks/query-keys';
import { supabase } from '@/lib/supabase';
import { useMembership } from '@/providers/AuthProvider';
import type { ActivityEvent, JournalKind, Json, MemberRole } from '@/types/models';

export type DuoMember = { userId: string; role: MemberRole; displayName: string };

async function unwrap<R extends { data: unknown; error: unknown }>(
  promise: PromiseLike<R>,
): Promise<NonNullable<R['data']>> {
  const { data, error } = await promise;
  if (error) throw error;
  return data as NonNullable<R['data']>;
}

export function useCouple() {
  const { coupleId, userId } = useMembership();
  const query = useQuery({
    queryKey: queryKeys.couple(coupleId),
    queryFn: async () => {
      const [couple, members] = await Promise.all([
        unwrap(supabase.from('couples').select('*').eq('id', coupleId).single()),
        unwrap(supabase.from('couple_members').select('*').eq('couple_id', coupleId)),
      ]);
      const profiles = await unwrap(
        supabase.from('profiles').select('*').in('id', members.map((m) => m.user_id)),
      );
      const duo: DuoMember[] = members.map((m) => ({
        userId: m.user_id,
        role: m.role,
        displayName: profiles.find((p) => p.id === m.user_id)?.display_name ?? '',
      }));
      return { couple, members: duo };
    },
  });
  const members = query.data?.members ?? [];
  return {
    ...query,
    couple: query.data?.couple,
    members,
    me: members.find((m) => m.userId === userId),
    partner: members.find((m) => m.userId !== userId),
  };
}

export function useQuests() {
  const { coupleId } = useMembership();
  return useQuery({
    queryKey: queryKeys.quests(coupleId),
    queryFn: () => unwrap(supabase.rpc('refresh_quests')),
  });
}

export function useQuestTemplates() {
  return useQuery({
    queryKey: ['quest-templates'],
    queryFn: () => unwrap(supabase.from('quest_templates').select('*')),
    staleTime: Infinity,
    select: (templates) => new Map(templates.map((template) => [template.slug, template])),
  });
}

/** Nombre de quêtes terminées par l'équipe depuis lundi. */
export function useWeekCompletedCount() {
  const { coupleId } = useMembership();
  return useQuery({
    queryKey: queryKeys.weekCount(coupleId),
    queryFn: async () => {
      const since = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const { count, error } = await supabase
        .from('quest_instances')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', coupleId)
        .gte('completed_at', since);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useInvalidateDuo() {
  const { coupleId } = useMembership();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.quests(coupleId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats(coupleId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(coupleId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.couple(coupleId) }),
    ]);
}

export function useQuestActions() {
  const invalidate = useInvalidateDuo();
  const complete = useMutation({
    mutationFn: (id: string) => unwrap(supabase.rpc('complete_quest', { p_instance: id })),
    onSettled: invalidate,
  });
  const validate = useMutation({
    mutationFn: (id: string) => unwrap(supabase.rpc('validate_quest', { p_instance: id })),
    onSettled: invalidate,
  });
  return { complete, validate };
}

export function useStats() {
  const { coupleId } = useMembership();
  return useQuery({
    queryKey: queryKeys.stats(coupleId),
    queryFn: async () => {
      const [stats, badges] = await Promise.all([
        unwrap(supabase.from('user_stats').select('*').eq('couple_id', coupleId)),
        unwrap(supabase.from('badges_earned').select('*').eq('couple_id', coupleId)),
      ]);
      return { stats, badges };
    },
  });
}

export function useActivity() {
  const { coupleId } = useMembership();
  return useQuery({
    queryKey: queryKeys.activity(coupleId),
    queryFn: () =>
      unwrap(
        supabase
          .from('activity_events')
          .select('*')
          .eq('couple_id', coupleId)
          .order('created_at', { ascending: false })
          .limit(50),
      ),
  });
}

export function useSendCheer() {
  const invalidate = useInvalidateDuo();
  return useMutation({
    mutationFn: (message: string) => unwrap(supabase.rpc('send_cheer', { p_message: message })),
    onSettled: invalidate,
  });
}

export function useJournal() {
  const { coupleId } = useMembership();
  return useQuery({
    queryKey: queryKeys.journal(coupleId),
    queryFn: () =>
      unwrap(
        supabase
          .from('journal_entries')
          .select('*')
          .eq('couple_id', coupleId)
          .order('occurred_at', { ascending: false })
          .limit(100),
      ),
  });
}

export function useJournalActions() {
  const { coupleId, userId } = useMembership();
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.journal(coupleId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(coupleId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.stats(coupleId) }),
    ]);
  const add = useMutation({
    mutationFn: ({ kind, payload }: { kind: JournalKind; payload: Json }) =>
      unwrap(
        supabase
          .from('journal_entries')
          .insert({ couple_id: coupleId, author_id: userId, kind, payload })
          .select()
          .single(),
      ),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('journal_entries').delete().eq('id', id)),
    onSettled: invalidate,
  });
  return { add, remove };
}

/**
 * Synchronisation temps réel entre les deux téléphones : chaque changement
 * côté base invalide le cache correspondant. `onPartnerActivity` est appelé
 * pour chaque nouvel événement du fil créé par l'autre membre.
 */
export function useRealtimeSync(onPartnerActivity?: (event: ActivityEvent) => void) {
  const { coupleId, userId } = useMembership();
  const queryClient = useQueryClient();
  const callback = useRef(onPartnerActivity);

  useEffect(() => {
    callback.current = onPartnerActivity;
  }, [onPartnerActivity]);

  useEffect(() => {
    const invalidate = (queryKey: readonly unknown[]) => () => queryClient.invalidateQueries({ queryKey });
    const filter = `couple_id=eq.${coupleId}`;
    const channel = supabase
      .channel(`duo:${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_instances', filter }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.quests(coupleId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries', filter }, invalidate(queryKeys.journal(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_stats', filter }, invalidate(queryKeys.stats(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'badges_earned', filter }, invalidate(queryKeys.stats(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_members', filter }, invalidate(queryKeys.couple(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` }, invalidate(queryKeys.couple(coupleId)))
      .on<ActivityEvent>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_events', filter },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.activity(coupleId) });
          if (payload.new.actor_id && payload.new.actor_id !== userId) callback.current?.(payload.new);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, userId, queryClient]);
}
