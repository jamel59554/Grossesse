-- Notifications push : jetons des appareils, préférence par profil, et appel
-- de l'Edge Function `notify-partner` à chaque nouvel événement du fil.

-- ---------------------------------------------------------------------------
-- Jetons Expo des appareils
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens: own read" on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_tokens: own delete" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

-- Écriture via RPC uniquement : un jeton déjà enregistré par un autre compte (même téléphone, autre
-- connexion) est réattribué au compte courant.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'invalid_token';
  end if;
  insert into push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

grant execute on function public.register_push_token(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Préférence et déduplication
-- ---------------------------------------------------------------------------

alter table public.profiles add column push_enabled boolean not null default true;
grant update (push_enabled) on public.profiles to authenticated;

alter table public.activity_events add column pushed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Appel de l'Edge Function (pg_net) — inactif tant que l'URL n'est pas configurée
-- ---------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.settings (
  key text primary key,
  value text not null
);

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end;
$$;

-- N'envoie que l'identifiant : la fonction relit l'événement avec ses propres droits.
create or replace function private.notify_partner()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_url text;
begin
  select value into v_url from private.settings where key = 'notify_partner_url';
  if v_url is null or to_regnamespace('net') is null then
    return new;
  end if;

  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using v_url,
          jsonb_build_object('event_id', new.id),
          '{"Content-Type": "application/json"}'::jsonb;
  return new;
exception when others then
  -- Une notification ratée ne doit jamais empêcher l'action de l'utilisateur.
  raise warning 'notify_partner: %', sqlerrm;
  return new;
end;
$$;

create trigger activity_events_notify_partner
  after insert on public.activity_events
  for each row execute function private.notify_partner();
