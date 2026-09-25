-- Corrections après la migration `push` :
-- droits de register_push_token, schéma de pg_net, suppression de compte.

-- Les « default privileges » ne s'appliquent qu'aux fonctions créées par le
-- rôle qui les a définis : on retire explicitement l'accès public.
revoke execute on function public.register_push_token(text, text) from public, anon;

-- pg_net hors du schéma public (ses fonctions restent dans le schéma `net`).
do $$
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
             where e.extname = 'pg_net' and n.nspname = 'public')
     and exists (select 1 from pg_namespace where nspname = 'extensions') then
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end;
$$;

-- Supprimer un compte ne doit pas être bloqué parce qu'il a créé le duo.
alter table public.couples alter column created_by drop not null;
alter table public.couples drop constraint couples_created_by_fkey;
alter table public.couples
  add constraint couples_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

-- Idem pour l'historique des quêtes : on garde la quête, sans l'auteur.
alter table public.quest_instances drop constraint quest_instances_completed_by_fkey;
alter table public.quest_instances
  add constraint quest_instances_completed_by_fkey
  foreign key (completed_by) references public.profiles (id) on delete set null;
alter table public.quest_instances drop constraint quest_instances_validated_by_fkey;
alter table public.quest_instances
  add constraint quest_instances_validated_by_fkey
  foreign key (validated_by) references public.profiles (id) on delete set null;
