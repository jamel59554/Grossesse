-- Durcissement suite aux advisors Supabase :
-- droits d'exécution minimaux, search_path figé, RLS plus efficaces, index sur les clés étrangères.

-- ---------------------------------------------------------------------------
-- Droits d'exécution : seules les RPC utilisées par l'app sont appelables,
-- et uniquement par un utilisateur connecté.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function public.create_couple(date, text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.refresh_quests() to authenticated;
grant execute on function public.complete_quest(uuid) to authenticated;
grant execute on function public.validate_quest(uuid) to authenticated;
grant execute on function public.send_cheer(text) to authenticated;
grant execute on function public.update_pregnancy_dates(date) to authenticated;
-- Utilisée par les politiques RLS, évaluées avec le rôle de l'appelant.
grant execute on function public.is_couple_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- search_path figé
-- ---------------------------------------------------------------------------

alter function public.period_key(public.quest_recurrence, date) set search_path = public;
alter function public.generate_invite_code() set search_path = public;

-- ---------------------------------------------------------------------------
-- RLS : auth.uid() évalué une seule fois par requête
-- ---------------------------------------------------------------------------

drop policy "profiles: self or partner" on public.profiles;
create policy "profiles: self or partner" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.couple_members cm
      where cm.user_id = profiles.id and public.is_couple_member(cm.couple_id)
    )
  );

drop policy "profiles: update self" on public.profiles;
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy "journal: members write own" on public.journal_entries;
create policy "journal: members write own" on public.journal_entries
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_couple_member(couple_id));

drop policy "journal: author update" on public.journal_entries;
create policy "journal: author update" on public.journal_entries
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and public.is_couple_member(couple_id));

drop policy "journal: author delete" on public.journal_entries;
create policy "journal: author delete" on public.journal_entries
  for delete to authenticated using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Index sur les clés étrangères
-- ---------------------------------------------------------------------------

create index if not exists activity_events_actor_id on public.activity_events (actor_id);
create index if not exists badges_earned_couple_id on public.badges_earned (couple_id);
create index if not exists couples_created_by on public.couples (created_by);
create index if not exists journal_entries_author_id on public.journal_entries (author_id);
create index if not exists quest_instances_assigned_to on public.quest_instances (assigned_to);
create index if not exists quest_instances_completed_by on public.quest_instances (completed_by);
create index if not exists quest_instances_validated_by on public.quest_instances (validated_by);
create index if not exists quest_instances_template_slug on public.quest_instances (template_slug);
create index if not exists user_stats_couple_id on public.user_stats (couple_id);
