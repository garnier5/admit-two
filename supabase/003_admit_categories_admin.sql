-- =====================================================================
-- Admit Two — renommer, fusionner et supprimer des catégories.
-- À exécuter une fois dans Supabase › SQL Editor, après 001_admit_init.sql.
-- Ré-exécutable. Ne touche à aucun objet de Mealer.
--
-- Les tickets stockent le nom de leurs catégories (admit_plans.cats) : renommer
-- ou supprimer une catégorie doit donc aussi réécrire ces tickets. Les deux
-- fonctions ci-dessous le font en une seule transaction, avec les droits de
-- l'appelant (security invoker) : les règles RLS et les droits colonne par
-- colonne de 001 s'appliquent, et chaque ticket modifié reste archivé dans
-- admit_plans_history. Une catégorie supprimée n'est jamais effacée : elle
-- passe à deleted = true.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Un nom n'est réservé que par une catégorie active : on peut recréer
--    (ou renommer vers) le nom d'une catégorie supprimée.
-- ---------------------------------------------------------------------
drop index if exists public.admit_categories_label_key;
create unique index admit_categories_label_key
  on public.admit_categories (lower(label)) where not deleted;

-- ---------------------------------------------------------------------
-- 2. Remplace old_label par new_label (null : retire) dans une liste,
--    à la casse près, sans doublon et dans le même ordre.
--    Même logique que replaceLabel() dans src/lib/model.ts.
-- ---------------------------------------------------------------------
create or replace function public.admit_replace_label(arr text[], old_label text, new_label text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(x order by o), '{}'::text[])
  from (
    select distinct on (lower(x)) x, o
    from (
      select case when lower(c) = lower(old_label) then new_label else c end as x, o
      from unnest(arr) with ordinality as u(c, o)
    ) s
    where x is not null
    order by lower(x), o
  ) d;
$$;

revoke all on function public.admit_replace_label(text[], text, text) from public, anon;
grant execute on function public.admit_replace_label(text[], text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Renommer. Si une autre catégorie active porte déjà ce nom (à la casse
--    près), les deux sont fusionnées : les tickets passent à la catégorie
--    existante et celle-ci est supprimée.
-- ---------------------------------------------------------------------
create or replace function public.admit_rename_category(p_id uuid, p_label text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old    text;
  v_target text;
begin
  if not public.admit_is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_label is null or p_label <> btrim(p_label) or char_length(p_label) not between 1 and 30 then
    raise exception 'invalid category label' using errcode = '22023';
  end if;

  select label into v_old
    from public.admit_categories
   where id = p_id and not deleted
     for update;
  if not found then
    raise exception 'category not found' using errcode = 'P0002';
  end if;

  select label into v_target
    from public.admit_categories
   where id <> p_id and not deleted and lower(label) = lower(p_label)
     for update;

  if found then
    update public.admit_categories set deleted = true where id = p_id;
  else
    v_target := p_label;
    if v_old is distinct from p_label then
      update public.admit_categories set label = p_label where id = p_id;
    end if;
  end if;

  update public.admit_plans
     set cats = public.admit_replace_label(cats, v_old, v_target)
   where exists (select 1 from unnest(cats) c where lower(c) = lower(v_old))
     and cats is distinct from public.admit_replace_label(cats, v_old, v_target);
end;
$$;

revoke all on function public.admit_rename_category(uuid, text) from public, anon;
grant execute on function public.admit_rename_category(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Supprimer : la catégorie est retirée de ses tickets (qui restent).
--    Sans effet si elle est déjà supprimée.
-- ---------------------------------------------------------------------
create or replace function public.admit_delete_category(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old text;
begin
  if not public.admit_is_member() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select label into v_old
    from public.admit_categories
   where id = p_id and not deleted
     for update;
  if not found then
    return;
  end if;

  update public.admit_plans
     set cats = public.admit_replace_label(cats, v_old, null)
   where exists (select 1 from unnest(cats) c where lower(c) = lower(v_old));

  update public.admit_categories set deleted = true where id = p_id;
end;
$$;

revoke all on function public.admit_delete_category(uuid) from public, anon;
grant execute on function public.admit_delete_category(uuid) to authenticated;

commit;
