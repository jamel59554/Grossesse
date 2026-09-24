-- Catalogue des quêtes. Les textes (titre, description) sont dans l'app :
-- src/i18n/locales/fr/quests.json, indexés par `slug`.
-- Semaines exprimées en semaines d'aménorrhée révolues (SA).

insert into public.quest_templates (slug, category, target, recurrence, xp, min_week, max_week) values
  -- Partenaire — quotidiennes
  ('p_water_refill',    'care',   'partner', 'daily',  5,  0, 42),
  ('p_massage',         'care',   'partner', 'daily',  10, 0, 42),
  ('p_cook_meal',       'care',   'partner', 'daily',  10, 0, 42),
  ('p_ask_day',         'bond',   'partner', 'daily',  5,  0, 42),
  ('p_chore',           'care',   'partner', 'daily',  10, 0, 42),
  ('p_talk_to_baby',    'bond',   'partner', 'daily',  5,  20, 42),
  -- Partenaire — hebdomadaires
  ('p_read_week',       'learn',  'partner', 'weekly', 15, 0, 42),
  ('p_plan_date',       'bond',   'partner', 'weekly', 20, 0, 38),
  ('p_groceries',       'care',   'partner', 'weekly', 15, 0, 42),
  ('p_iron_meal',       'care',   'partner', 'weekly', 15, 0, 30),
  ('p_surprise',        'bond',   'partner', 'weekly', 15, 0, 42),
  -- Partenaire — étapes clés
  ('p_attend_echo1',    'health', 'partner', 'once',   40, 11, 14),
  ('p_attend_echo2',    'health', 'partner', 'once',   40, 20, 24),
  ('p_attend_echo3',    'health', 'partner', 'once',   40, 30, 34),
  ('p_birth_leave',     'prep',   'partner', 'once',   30, 12, 30),
  ('p_birth_class',     'learn',  'partner', 'once',   40, 24, 38),
  ('p_assemble_crib',   'prep',   'partner', 'once',   40, 28, 38),
  ('p_car_seat',        'prep',   'partner', 'once',   40, 32, 39),
  ('p_route_maternity', 'prep',   'partner', 'once',   25, 32, 40),
  ('p_learn_diaper',    'learn',  'partner', 'once',   25, 26, 40),
  ('p_labor_signs',     'learn',  'partner', 'once',   30, 34, 41),
  -- Personne enceinte — quotidiennes
  ('c_hydrate',         'health', 'carrier', 'daily',  5,  0, 42),
  ('c_walk',            'health', 'carrier', 'daily',  10, 0, 42),
  ('c_rest',            'care',   'carrier', 'daily',  5,  0, 42),
  ('c_log_mood',        'bond',   'carrier', 'daily',  5,  0, 42),
  -- Personne enceinte — hebdomadaires
  ('c_share_feelings',  'bond',   'carrier', 'weekly', 15, 0, 42),
  ('c_bump_photo',      'bond',   'carrier', 'weekly', 10, 12, 42),
  ('c_gentle_exercise', 'health', 'carrier', 'weekly', 15, 0, 40),
  -- Personne enceinte — étapes clés
  ('c_declare',         'prep',   'carrier', 'once',   30, 6, 14),
  ('c_maternity',       'prep',   'carrier', 'once',   30, 6, 20),
  ('c_birth_plan',      'prep',   'carrier', 'once',   30, 28, 36),
  -- Équipe — hebdomadaires
  ('t_names',           'bond',   'team',    'weekly', 20, 12, 40),
  ('t_budget',          'prep',   'team',    'weekly', 20, 12, 40),
  ('t_playlist',        'bond',   'team',    'weekly', 15, 20, 40),
  ('t_check_in',        'bond',   'team',    'weekly', 15, 0, 42),
  -- Équipe — étapes clés
  ('t_announce',        'bond',   'team',    'once',   30, 8, 20),
  ('t_baby_gear',       'prep',   'team',    'once',   30, 18, 30),
  ('t_childcare',       'prep',   'team',    'once',   30, 16, 34),
  ('t_nursery',         'prep',   'team',    'once',   40, 24, 38),
  ('t_hospital_bag',    'prep',   'team',    'once',   50, 32, 38)
on conflict (slug) do update set
  category = excluded.category,
  target = excluded.target,
  recurrence = excluded.recurrence,
  xp = excluded.xp,
  min_week = excluded.min_week,
  max_week = excluded.max_week;
