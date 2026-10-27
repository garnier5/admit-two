-- =====================================================================
-- Admit Two — schéma initial
-- À exécuter UNE fois dans Supabase › SQL Editor.
--
-- Tous les objets sont préfixés « admit_ ». Ce script ne lit, ne modifie
-- et ne touche à aucun objet de Mealer (entries, entries_history,
-- stamp_entry(), keep_entry_history(), leurs triggers et règles) ni à
-- public.is_member(), seulement appelée par admit_is_member().
--
-- Accès : option A — tous les comptes du projet (connectés et non anonymes), comme Mealer.
-- Le script est ré-exécutable (if not exists / or replace / drop if exists).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Accès (option A) : tous les comptes du projet, comme Mealer.
--    public.is_member() est seulement appelée, jamais modifiée.
-- ---------------------------------------------------------------------
create or replace function public.admit_is_member()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.is_member();
$$;

revoke all on function public.admit_is_member() from public, anon;
grant execute on function public.admit_is_member() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Fonctions utilitaires
-- ---------------------------------------------------------------------

-- Liste d'étiquettes valide : au plus max_items éléments, chacun non vide,
-- sans espaces en bord, d'au plus max_len caractères, sans doublon.
create or replace function public.admit_valid_labels(arr text[], max_items int, max_len int)
returns boolean
language sql
immutable
set search_path = public
as $$
  select arr is not null
     and coalesce(cardinality(arr), 0) <= max_items
     and not exists (
       select 1 from unnest(arr) x
       where x is null or x <> btrim(x) or char_length(x) not between 1 and max_len
     )
     and (select count(distinct lower(x)) from unnest(arr) x) = coalesce(cardinality(arr), 0);
$$;

revoke all on function public.admit_valid_labels(text[], int, int) from public, anon;
grant execute on function public.admit_valid_labels(text[], int, int) to authenticated;

-- updated_at / updated_by (et created_at / created_by) posés par le serveur.
create or replace function public.admit_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

revoke all on function public.admit_stamp() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Catégories (partagées par les membres)
-- ---------------------------------------------------------------------
create table if not exists public.admit_categories (
  id         uuid primary key default gen_random_uuid(),
  label      text not null
             check (label = btrim(label) and char_length(label) between 1 and 30),
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index if not exists admit_categories_label_key
  on public.admit_categories (lower(label));

drop trigger if exists admit_categories_stamp on public.admit_categories;
create trigger admit_categories_stamp
  before insert or update on public.admit_categories
  for each row execute function public.admit_stamp();

alter table public.admit_categories enable row level security;
revoke all on table public.admit_categories from anon, authenticated;
grant select on table public.admit_categories to authenticated;
grant insert (id, label) on table public.admit_categories to authenticated;
grant update (label, deleted) on table public.admit_categories to authenticated;

drop policy if exists admit_categories_select on public.admit_categories;
create policy admit_categories_select on public.admit_categories
  for select to authenticated using (public.admit_is_member());

drop policy if exists admit_categories_insert on public.admit_categories;
create policy admit_categories_insert on public.admit_categories
  for insert to authenticated with check (public.admit_is_member());

drop policy if exists admit_categories_update on public.admit_categories;
create policy admit_categories_update on public.admit_categories
  for update to authenticated
  using (public.admit_is_member()) with check (public.admit_is_member());

-- Catégories de départ (les mêmes que le standalone).
insert into public.admit_categories (label)
select v from unnest(array['Outdoors','Food','Cozy','Games','Sport','Getaway','Culture','Creative','Learning']) v
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4. Plans (les « tickets »)
-- ---------------------------------------------------------------------
create table if not exists public.admit_plans (
  id         uuid primary key default gen_random_uuid(),
  num        integer generated always as identity unique,
  titre      text not null
             check (titre = btrim(titre) and char_length(titre) between 1 and 80),
  prix       text check (prix in ('free', '1', '2', '3')),
  duree      text check (duree in ('lt1h', '1to3h', 'half', 'full', 'weekend')),
  saisons    text[] not null default '{}'
             check (saisons <@ array['all','spring','summer','autumn','winter']::text[]
                    and public.admit_valid_labels(saisons, 5, 6)),
  lieu       text check (lieu in ('home', 'town', 'nearby', 'trip')),
  cats       text[] not null default '{}'
             check (public.admit_valid_labels(cats, 20, 30)),
  fait       boolean not null default false,
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

drop trigger if exists admit_plans_stamp on public.admit_plans;
create trigger admit_plans_stamp
  before insert or update on public.admit_plans
  for each row execute function public.admit_stamp();

alter table public.admit_plans enable row level security;
revoke all on table public.admit_plans from anon, authenticated;
grant select on table public.admit_plans to authenticated;
grant insert (id, titre, prix, duree, saisons, lieu, cats, fait)
  on table public.admit_plans to authenticated;
grant update (titre, prix, duree, saisons, lieu, cats, fait, deleted)
  on table public.admit_plans to authenticated;

drop policy if exists admit_plans_select on public.admit_plans;
create policy admit_plans_select on public.admit_plans
  for select to authenticated using (public.admit_is_member());

drop policy if exists admit_plans_insert on public.admit_plans;
create policy admit_plans_insert on public.admit_plans
  for insert to authenticated with check (public.admit_is_member());

drop policy if exists admit_plans_update on public.admit_plans;
create policy admit_plans_update on public.admit_plans
  for update to authenticated
  using (public.admit_is_member()) with check (public.admit_is_member());

-- ---------------------------------------------------------------------
-- 5. Historique des plans (illisible depuis l'app)
-- ---------------------------------------------------------------------
create table if not exists public.admit_plans_history (
  id         bigint generated always as identity primary key,
  plan_id    uuid not null,
  old_row    jsonb not null,
  changed_at timestamptz not null default now(),
  changed_by uuid
);

create index if not exists admit_plans_history_plan_idx
  on public.admit_plans_history (plan_id, changed_at desc);

alter table public.admit_plans_history enable row level security;
revoke all on table public.admit_plans_history from anon, authenticated;

create or replace function public.admit_plans_keep_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admit_plans_history (plan_id, old_row, changed_by)
  values (old.id, to_jsonb(old), auth.uid());
  return null;
end;
$$;

revoke all on function public.admit_plans_keep_history() from public, anon, authenticated;

drop trigger if exists admit_plans_history on public.admit_plans;
create trigger admit_plans_history
  after update on public.admit_plans
  for each row execute function public.admit_plans_keep_history();

-- ---------------------------------------------------------------------
-- 6. Temps réel
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admit_plans') then
    alter publication supabase_realtime add table public.admit_plans;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admit_categories') then
    alter publication supabase_realtime add table public.admit_categories;
  end if;
end;
$$;

commit;
