-- Duo Grossesse — schéma initial
-- Couple, quêtes gamifiées, journal partagé, fil d'activité et statistiques.
-- Toutes les écritures sensibles (XP, séries, badges) passent par des fonctions
-- `security definer` : le client ne peut pas s'attribuer d'XP directement.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('carrier', 'partner');
create type public.quest_target as enum ('carrier', 'partner', 'team');
create type public.quest_recurrence as enum ('daily', 'weekly', 'once');
create type public.quest_category as enum ('care', 'prep', 'learn', 'bond', 'health');
create type public.quest_status as enum ('todo', 'done', 'validated');
create type public.journal_kind as enum ('mood', 'symptom', 'weight', 'appointment', 'note');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  role public.member_role,
  created_at timestamptz not null default now()
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  lmp_date date not null,
  timezone text not null default 'Europe/Paris',
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id),
  team_streak int not null default 0,
  best_team_streak int not null default 0,
  team_streak_date date,
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  role public.member_role not null,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table public.quest_templates (
  slug text primary key,
  category public.quest_category not null,
  target public.quest_target not null,
  recurrence public.quest_recurrence not null,
  xp int not null check (xp > 0),
  min_week int not null default 0,
  max_week int not null default 42,
  check (min_week <= max_week)
);

create table public.quest_instances (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  template_slug text not null references public.quest_templates (slug),
  -- null = quête d'équipe, réalisable par l'un ou l'autre
  assigned_to uuid references public.profiles (id) on delete cascade,
  period_key text not null,
  status public.quest_status not null default 'todo',
  xp int not null,
  completed_by uuid references public.profiles (id),
  completed_at timestamptz,
  validated_by uuid references public.profiles (id),
  validated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index quest_instances_unique_period
  on public.quest_instances (couple_id, template_slug, assigned_to, period_key)
  nulls not distinct;
create index quest_instances_couple_period on public.quest_instances (couple_id, period_key);
create index quest_instances_couple_completed on public.quest_instances (couple_id, completed_at);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind public.journal_kind not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index journal_entries_couple_occurred on public.journal_entries (couple_id, occurred_at desc);

create table public.activity_events (
  id bigint generated always as identity primary key,
  couple_id uuid not null references public.couples (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_couple_created on public.activity_events (couple_id, created_at desc);

create table public.user_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  xp int not null default 0,
  quests_completed int not null default 0,
  quests_validated int not null default 0,
  cheers_sent int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_active_date date
);

create table public.badges_earned (
  user_id uuid not null references public.profiles (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  badge_slug text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_slug)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_couple_member(p_couple uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from couple_members where couple_id = p_couple and user_id = auth.uid()
  );
$$;

create or replace function public.my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from couple_members where user_id = auth.uid();
$$;

-- Semaines d'aménorrhée révolues (0 = première semaine).
create or replace function public.couple_week(p_couple uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, ((now() at time zone c.timezone)::date - c.lmp_date) / 7)
  from couples c where c.id = p_couple;
$$;

create or replace function public.couple_today(p_couple uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone c.timezone)::date from couples c where c.id = p_couple;
$$;

create or replace function public.period_key(p_recurrence public.quest_recurrence, p_day date)
returns text
language sql
immutable
as $$
  select case p_recurrence
    when 'daily' then to_char(p_day, 'YYYY-MM-DD')
    when 'weekly' then to_char(p_day, 'IYYY-"W"IW')
    else 'once'
  end;
$$;

create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.couples where invite_code = code);
  end loop;
  return code;
end;
$$;

-- Profil créé automatiquement à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 40));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Gamification interne
-- ---------------------------------------------------------------------------

create or replace function public.award_xp(p_user uuid, p_xp int)
returns void
language sql
security definer
set search_path = public
as $$
  update user_stats set xp = xp + p_xp where user_id = p_user;
$$;

-- Série individuelle : jours consécutifs avec au moins une quête terminée.
create or replace function public.touch_user_streak(p_user uuid, p_today date)
returns void
language sql
security definer
set search_path = public
as $$
  update user_stats set
    current_streak = case
      when last_active_date = p_today then current_streak
      when last_active_date = p_today - 1 then current_streak + 1
      else 1
    end,
    best_streak = greatest(best_streak, case
      when last_active_date = p_today then current_streak
      when last_active_date = p_today - 1 then current_streak + 1
      else 1
    end),
    last_active_date = p_today
  where user_id = p_user;
$$;

-- Série d'équipe : jours consécutifs où CHAQUE membre a terminé au moins une quête.
create or replace function public.touch_team_streak(p_couple uuid, p_today date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  members int;
  active int;
begin
  select count(*) into members from couple_members where couple_id = p_couple;
  if members < 2 then
    return;
  end if;

  select count(*) into active
  from user_stats
  where couple_id = p_couple and last_active_date = p_today;

  if active < members then
    return;
  end if;

  update couples set
    team_streak = case
      when team_streak_date = p_today then team_streak
      when team_streak_date = p_today - 1 then team_streak + 1
      else 1
    end,
    best_team_streak = greatest(best_team_streak, case
      when team_streak_date = p_today then team_streak
      when team_streak_date = p_today - 1 then team_streak + 1
      else 1
    end),
    team_streak_date = p_today
  where id = p_couple;
end;
$$;

create or replace function public.grant_badge(p_user uuid, p_couple uuid, p_badge text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into badges_earned (user_id, couple_id, badge_slug)
  values (p_user, p_couple, p_badge)
  on conflict do nothing;

  if found then
    insert into activity_events (couple_id, actor_id, kind, payload)
    values (p_couple, p_user, 'badge_earned', jsonb_build_object('badge', p_badge));
  end if;
end;
$$;

create or replace function public.check_badges(p_user uuid, p_couple uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s user_stats;
  c couples;
begin
  select * into s from user_stats where user_id = p_user;
  select * into c from couples where id = p_couple;

  if s.quests_completed >= 1 then perform grant_badge(p_user, p_couple, 'first_quest'); end if;
  if s.quests_completed >= 10 then perform grant_badge(p_user, p_couple, 'quests_10'); end if;
  if s.quests_completed >= 50 then perform grant_badge(p_user, p_couple, 'quests_50'); end if;
  if s.quests_validated >= 5 then perform grant_badge(p_user, p_couple, 'validator_5'); end if;
  if s.cheers_sent >= 5 then perform grant_badge(p_user, p_couple, 'cheerleader'); end if;
  if s.best_streak >= 7 then perform grant_badge(p_user, p_couple, 'streak_7'); end if;
  if c.best_team_streak >= 3 then perform grant_badge(p_user, p_couple, 'team_streak_3'); end if;
  if c.best_team_streak >= 7 then perform grant_badge(p_user, p_couple, 'team_streak_7'); end if;
  if c.best_team_streak >= 30 then perform grant_badge(p_user, p_couple, 'team_streak_30'); end if;

  if exists (
    select 1 from quest_instances
    where couple_id = p_couple and template_slug = 't_hospital_bag' and status <> 'todo'
  ) then
    perform grant_badge(p_user, p_couple, 'hospital_bag');
  end if;

  if exists (
    select 1 from quest_instances
    where couple_id = p_couple and template_slug = 'p_assemble_crib' and status <> 'todo'
  ) then
    perform grant_badge(p_user, p_couple, 'crib_ready');
  end if;

  if exists (
    select 1 from journal_entries where couple_id = p_couple and kind = 'appointment'
  ) then
    perform grant_badge(p_user, p_couple, 'first_appointment');
  end if;
end;
$$;

create or replace function public.check_couple_badges(p_couple uuid)
returns void
language sql
security definer
set search_path = public
as $$
  select check_badges(user_id, p_couple) from couple_members where couple_id = p_couple;
$$;

-- ---------------------------------------------------------------------------
-- RPC exposées au client
-- ---------------------------------------------------------------------------

create or replace function public.create_couple(p_lmp_date date, p_timezone text default 'Europe/Paris')
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  me profiles;
  c couples;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then
    raise exception 'not_authenticated';
  end if;
  if me.role is null then
    raise exception 'role_required';
  end if;
  if exists (select 1 from couple_members where user_id = me.id) then
    raise exception 'already_in_couple';
  end if;
  if p_lmp_date > current_date or p_lmp_date < current_date - 300 then
    raise exception 'invalid_date';
  end if;

  insert into couples (lmp_date, timezone, invite_code, created_by)
  values (p_lmp_date, coalesce(nullif(p_timezone, ''), 'Europe/Paris'), generate_invite_code(), me.id)
  returning * into c;

  insert into couple_members (couple_id, user_id, role) values (c.id, me.id, me.role);
  insert into user_stats (user_id, couple_id) values (me.id, c.id);
  insert into activity_events (couple_id, actor_id, kind) values (c.id, me.id, 'couple_created');

  return c;
end;
$$;

create or replace function public.join_couple(p_code text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  me profiles;
  c couples;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then
    raise exception 'not_authenticated';
  end if;
  if me.role is null then
    raise exception 'role_required';
  end if;
  if exists (select 1 from couple_members where user_id = me.id) then
    raise exception 'already_in_couple';
  end if;

  select * into c from couples where invite_code = upper(trim(p_code)) for update;
  if c.id is null then
    raise exception 'invalid_code';
  end if;
  if (select count(*) from couple_members where couple_id = c.id) >= 2 then
    raise exception 'couple_full';
  end if;

  insert into couple_members (couple_id, user_id, role) values (c.id, me.id, me.role);
  insert into user_stats (user_id, couple_id) values (me.id, c.id);
  insert into activity_events (couple_id, actor_id, kind) values (c.id, me.id, 'member_joined');

  perform grant_badge(user_id, c.id, 'duo_formed') from couple_members where couple_id = c.id;

  return c;
end;
$$;

-- Génère (de façon idempotente) les quêtes de la période en cours et les renvoie.
-- Sélection déterministe : même jour/semaine => mêmes quêtes.
create or replace function public.refresh_quests()
returns setof public.quest_instances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple uuid := my_couple_id();
  v_today date;
  v_week int;
  m record;
begin
  if v_couple is null then
    raise exception 'no_couple';
  end if;

  v_today := couple_today(v_couple);
  v_week := couple_week(v_couple);

  -- Quêtes individuelles : 3 quotidiennes et 2 hebdomadaires par membre, toutes les étapes clés.
  for m in select user_id, role from couple_members where couple_id = v_couple loop
    insert into quest_instances (couple_id, template_slug, assigned_to, period_key, xp)
    select v_couple, t.slug, m.user_id, period_key(t.recurrence, v_today), t.xp
    from (
      select t.*, row_number() over (
        partition by t.recurrence
        order by md5(period_key(t.recurrence, v_today) || t.slug || m.user_id::text)
      ) as rn
      from quest_templates t
      where t.target::text = m.role::text
        and v_week between t.min_week and t.max_week
    ) t
    where (t.recurrence = 'daily' and t.rn <= 3)
       or (t.recurrence = 'weekly' and t.rn <= 2)
       or t.recurrence = 'once'
    on conflict do nothing;
  end loop;

  -- Quêtes d'équipe : 2 hebdomadaires + étapes clés.
  insert into quest_instances (couple_id, template_slug, assigned_to, period_key, xp)
  select v_couple, t.slug, null, period_key(t.recurrence, v_today), t.xp
  from (
    select t.*, row_number() over (
      partition by t.recurrence
      order by md5(period_key(t.recurrence, v_today) || t.slug || v_couple::text)
    ) as rn
    from quest_templates t
    where t.target = 'team'
      and v_week between t.min_week and t.max_week
  ) t
  where (t.recurrence in ('daily', 'weekly') and t.rn <= 2)
     or t.recurrence = 'once'
  on conflict do nothing;

  return query
  select qi.*
  from quest_instances qi
  join quest_templates t on t.slug = qi.template_slug
  where qi.couple_id = v_couple
    and (
      qi.period_key in (period_key('daily', v_today), period_key('weekly', v_today))
      or (
        qi.period_key = 'once'
        and (
          (qi.status = 'todo' and v_week <= t.max_week)
          or qi.completed_at > now() - interval '7 days'
        )
      )
    )
  order by qi.created_at, qi.template_slug;
end;
$$;

create or replace function public.complete_quest(p_instance uuid)
returns public.quest_instances
language plpgsql
security definer
set search_path = public
as $$
declare
  q quest_instances;
  v_today date;
begin
  select * into q from quest_instances where id = p_instance for update;
  if q.id is null or not is_couple_member(q.couple_id) then
    raise exception 'not_found';
  end if;
  if q.status <> 'todo' then
    raise exception 'already_completed';
  end if;
  if q.assigned_to is not null and q.assigned_to <> auth.uid() then
    raise exception 'not_assigned';
  end if;

  v_today := couple_today(q.couple_id);

  update quest_instances
  set status = 'done', completed_by = auth.uid(), completed_at = now()
  where id = q.id
  returning * into q;

  if q.assigned_to is null then
    -- Quête d'équipe : tout le monde gagne l'XP.
    update user_stats set xp = xp + q.xp where couple_id = q.couple_id;
  else
    perform award_xp(auth.uid(), q.xp);
  end if;

  update user_stats set quests_completed = quests_completed + 1 where user_id = auth.uid();
  perform touch_user_streak(auth.uid(), v_today);
  perform touch_team_streak(q.couple_id, v_today);

  insert into activity_events (couple_id, actor_id, kind, payload)
  values (q.couple_id, auth.uid(), 'quest_completed',
          jsonb_build_object('quest', q.template_slug, 'instance', q.id, 'xp', q.xp, 'team', q.assigned_to is null));

  perform check_couple_badges(q.couple_id);
  return q;
end;
$$;

-- Validation croisée : l'autre membre confirme la quête, bonus de 50 % pour
-- celui qui l'a réalisée et 2 XP d'encouragement pour celui qui valide.
create or replace function public.validate_quest(p_instance uuid)
returns public.quest_instances
language plpgsql
security definer
set search_path = public
as $$
declare
  q quest_instances;
  v_bonus int;
begin
  select * into q from quest_instances where id = p_instance for update;
  if q.id is null or not is_couple_member(q.couple_id) then
    raise exception 'not_found';
  end if;
  if q.status <> 'done' then
    raise exception 'not_completed';
  end if;
  if q.completed_by = auth.uid() then
    raise exception 'cannot_validate_own';
  end if;

  v_bonus := ceil(q.xp * 0.5);

  update quest_instances
  set status = 'validated', validated_by = auth.uid(), validated_at = now()
  where id = q.id
  returning * into q;

  perform award_xp(q.completed_by, v_bonus);
  perform award_xp(auth.uid(), 2);
  update user_stats set quests_validated = quests_validated + 1 where user_id = auth.uid();

  insert into activity_events (couple_id, actor_id, kind, payload)
  values (q.couple_id, auth.uid(), 'quest_validated',
          jsonb_build_object('quest', q.template_slug, 'instance', q.id, 'bonus', v_bonus, 'for', q.completed_by));

  perform check_couple_badges(q.couple_id);
  return q;
end;
$$;

create or replace function public.send_cheer(p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple uuid := my_couple_id();
begin
  if v_couple is null then
    raise exception 'no_couple';
  end if;

  insert into activity_events (couple_id, actor_id, kind, payload)
  values (v_couple, auth.uid(), 'cheer',
          jsonb_build_object('message', left(nullif(trim(p_message), ''), 140)));

  update user_stats set cheers_sent = cheers_sent + 1 where user_id = auth.uid();
  perform check_badges(auth.uid(), v_couple);
end;
$$;

create or replace function public.update_pregnancy_dates(p_lmp_date date)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  c couples;
begin
  if p_lmp_date > current_date or p_lmp_date < current_date - 300 then
    raise exception 'invalid_date';
  end if;
  update couples set lmp_date = p_lmp_date where id = my_couple_id() returning * into c;
  if c.id is null then
    raise exception 'no_couple';
  end if;
  return c;
end;
$$;

-- Chaque entrée de journal apparaît dans le fil d'activité.
create or replace function public.on_journal_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into activity_events (couple_id, actor_id, kind, payload)
  values (new.couple_id, new.author_id, 'journal_added',
          jsonb_build_object('entry', new.id, 'journal_kind', new.kind, 'payload', new.payload));
  if new.kind = 'appointment' then
    perform check_couple_badges(new.couple_id);
  end if;
  return new;
end;
$$;

create trigger journal_entries_activity
  after insert on public.journal_entries
  for each row execute function public.on_journal_insert();

-- Le rôle d'un membre suit celui de son profil.
create or replace function public.on_profile_role_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not null and new.role is distinct from old.role then
    update couple_members set role = new.role where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_role_sync
  after update of role on public.profiles
  for each row execute function public.on_profile_role_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.quest_templates enable row level security;
alter table public.quest_instances enable row level security;
alter table public.journal_entries enable row level security;
alter table public.activity_events enable row level security;
alter table public.user_stats enable row level security;
alter table public.badges_earned enable row level security;

create policy "profiles: self or partner" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.couple_members cm
      where cm.user_id = profiles.id and public.is_couple_member(cm.couple_id)
    )
  );

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "couples: members read" on public.couples
  for select to authenticated using (public.is_couple_member(id));

create policy "couple_members: members read" on public.couple_members
  for select to authenticated using (public.is_couple_member(couple_id));

create policy "quest_templates: read" on public.quest_templates
  for select to authenticated using (true);

create policy "quest_instances: members read" on public.quest_instances
  for select to authenticated using (public.is_couple_member(couple_id));

create policy "journal: members read" on public.journal_entries
  for select to authenticated using (public.is_couple_member(couple_id));

create policy "journal: members write own" on public.journal_entries
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_couple_member(couple_id));

create policy "journal: author update" on public.journal_entries
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and public.is_couple_member(couple_id));

create policy "journal: author delete" on public.journal_entries
  for delete to authenticated using (author_id = auth.uid());

create policy "activity: members read" on public.activity_events
  for select to authenticated using (public.is_couple_member(couple_id));

create policy "user_stats: members read" on public.user_stats
  for select to authenticated using (public.is_couple_member(couple_id));

create policy "badges: members read" on public.badges_earned
  for select to authenticated using (public.is_couple_member(couple_id));

-- Seul le nom et le rôle sont modifiables par l'utilisateur.
revoke update on public.profiles from authenticated;
grant update (display_name, role) on public.profiles to authenticated;

-- Les fonctions internes ne sont pas appelables depuis l'API.
revoke execute on function public.award_xp(uuid, int) from public, anon, authenticated;
revoke execute on function public.touch_user_streak(uuid, date) from public, anon, authenticated;
revoke execute on function public.touch_team_streak(uuid, date) from public, anon, authenticated;
revoke execute on function public.grant_badge(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.check_badges(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.check_couple_badges(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime : synchronisation entre les deux téléphones
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.couples,
      public.couple_members,
      public.quest_instances,
      public.journal_entries,
      public.activity_events,
      public.user_stats,
      public.badges_earned;
  end if;
end;
$$;
