-- Scénario de bout en bout : Camille (enceinte) crée le couple, Alex (partenaire)
-- rejoint avec le code, fait une quête, Camille la valide. Vérifie aussi les RLS.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'camille@example.com', '{"display_name": "Camille"}'),
  ('00000000-0000-0000-0000-00000000000b', 'alex@example.com', '{"display_name": "Alex"}'),
  ('00000000-0000-0000-0000-00000000000c', 'intrus@example.com', '{"display_name": "Intrus"}');

set role authenticated;

-- Camille ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update profiles set role = 'carrier' where id = auth.uid();

do $$ begin
  assert (select count(*) from profiles) = 1, 'un utilisateur seul ne voit que son profil';
  assert (select display_name from profiles) = 'Camille', 'profil créé depuis les métadonnées';
end $$;

select invite_code from create_couple(current_date - 20 * 7, 'Europe/Paris') \gset

do $$ begin
  assert (select (current_date - lmp_date) / 7 from couples) = 20, 'DDR enregistrée';
  begin
    perform create_couple(current_date - 70, 'Europe/Paris');
    assert false, 'un second couple ne doit pas être possible';
  exception when raise_exception then null;
  end;
end $$;

-- L'intrus ne peut pas lire les données du couple --------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  assert (select count(*) from couples) = 0, 'RLS couples';
  assert (select count(*) from profiles) = 1, 'RLS profiles';
  begin
    perform refresh_quests();
    assert false, 'refresh_quests sans couple doit échouer';
  exception when raise_exception then null;
  end;
end $$;

-- Alex rejoint ------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
update profiles set role = 'partner' where id = auth.uid();
select join_couple(lower(:'invite_code'));

do $$ begin
  assert (select count(*) from profiles) = 2, 'Alex voit maintenant le profil de Camille';
  assert (select count(*) from couple_members) = 2, 'deux membres';
  assert (select count(*) from badges_earned where badge_slug = 'duo_formed') = 2, 'badge duo pour les deux';
end $$;

-- L'intrus ne peut pas rejoindre un couple complet
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
update profiles set role = 'partner' where id = auth.uid();
do $$ begin
  begin
    perform join_couple((select invite_code from couples limit 1));
  exception when raise_exception then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from couple_members) = 2, 'couple limité à deux membres';
end $$;

-- Génération des quêtes (idempotente) ----------------------------------------------
do $$
declare n1 int; n2 int;
begin
  select count(*) into n1 from refresh_quests();
  select count(*) into n2 from refresh_quests();
  assert n1 > 0, 'des quêtes sont générées';
  assert n1 = n2, 'refresh_quests est idempotent';
  assert (select count(*) from quest_instances
          where assigned_to = auth.uid() and period_key = to_char((now() at time zone 'Europe/Paris')::date, 'YYYY-MM-DD')) = 3,
    '3 quêtes quotidiennes pour Alex';
  assert not exists (select 1 from quest_instances qi join quest_templates t on t.slug = qi.template_slug
                     where qi.assigned_to = auth.uid() and t.target <> 'partner'),
    'Alex ne reçoit que des quêtes partenaire';
end $$;

-- Écriture directe interdite
do $$ begin
  begin
    update user_stats set xp = 9999;
    assert (select xp from user_stats where user_id = auth.uid()) = 0, 'XP non modifiable directement';
  exception when insufficient_privilege then null;
  end;
  begin
    update profiles set id = gen_random_uuid() where id = auth.uid();
    assert false, 'id du profil non modifiable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Alex termine une quête, Camille la valide ----------------------------------------
select id as alex_quest, xp as alex_quest_xp from quest_instances
where assigned_to = auth.uid() and status = 'todo' order by template_slug limit 1 \gset

select complete_quest(:'alex_quest');

do $$ begin
  assert (select current_streak from user_stats where user_id = auth.uid()) = 1, 'série individuelle démarrée';
  assert exists (select 1 from badges_earned where user_id = auth.uid() and badge_slug = 'first_quest'), 'badge première quête';
  assert (select team_streak from couples) = 0, 'pas de série d''équipe tant que Camille n''a rien fait';
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$ begin
  begin
    perform complete_quest((select id from quest_instances
                            where assigned_to = '00000000-0000-0000-0000-00000000000b' and status = 'todo' limit 1));
    assert false, 'Camille ne peut pas terminer une quête d''Alex';
  exception when raise_exception then null;
  end;
end $$;

select validate_quest(:'alex_quest');
select complete_quest(id) from quest_instances where assigned_to = auth.uid() and status = 'todo' limit 1;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);

do $$
declare
  base int := (select qi.xp from quest_instances qi join quest_templates t on t.slug = qi.template_slug
               where qi.status = 'validated' limit 1);
begin
  assert (select xp from user_stats where user_id = auth.uid()) = base + ceil(base * 0.5),
    'Alex a son XP + bonus de validation';
  assert (select team_streak from couples) = 1, 'série d''équipe démarrée quand les deux ont joué';
  assert (select count(*) from activity_events where kind in ('quest_completed', 'quest_validated')) = 3,
    'fil d''activité alimenté';
end $$;

-- Quête d'équipe : l'XP va aux deux
do $$
declare
  before_a int := (select xp from user_stats where user_id = '00000000-0000-0000-0000-00000000000a');
  q record;
begin
  select * into q from quest_instances where assigned_to is null and status = 'todo' limit 1;
  perform complete_quest(q.id);
  assert (select xp from user_stats where user_id = '00000000-0000-0000-0000-00000000000a') = before_a + q.xp,
    'XP d''équipe partagée';
end $$;

-- Journal
insert into journal_entries (couple_id, author_id, kind, payload)
values ((select couple_id from couple_members where user_id = auth.uid()), auth.uid(), 'appointment', '{"title": "Échographie T2"}');

do $$ begin
  assert exists (select 1 from activity_events where kind = 'journal_added'), 'journal dans le fil';
  assert (select count(*) from badges_earned where badge_slug = 'first_appointment') = 2, 'badge RDV';
  begin
    insert into journal_entries (couple_id, author_id, kind)
    values ((select couple_id from couple_members where user_id = auth.uid()), '00000000-0000-0000-0000-00000000000a', 'note');
    assert false, 'impossible d''écrire au nom de l''autre';
  exception when insufficient_privilege then null;
  end;
end $$;

select send_cheer('Tu gères !');

-- Droits d'exécution : fonctions internes non appelables, RPC fermées à anon
do $$
declare fn text;
begin
  foreach fn in array array['my_couple_id()', 'couple_today(null::uuid)', 'award_xp(null::uuid, 1)',
                            'check_badges(null::uuid, null::uuid)', 'generate_invite_code()']
  loop
    begin
      execute 'select public.' || fn;
      assert false, fn || ' ne doit pas être appelable';
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

set role anon;
do $$ begin
  begin
    perform refresh_quests();
    assert false, 'anon ne doit pas appeler les RPC';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
