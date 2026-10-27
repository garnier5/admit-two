-- =====================================================================
-- Admit Two — passage à l'option A : même accès que Mealer.
-- À exécuter une fois dans Supabase › SQL Editor, après 001_admit_init.sql.
--
-- admit_is_member() délègue désormais à public.is_member() (connecté et non
-- anonyme), qui est seulement appelée, jamais modifiée. Toutes les règles RLS
-- des tables admit_* utilisent déjà admit_is_member() : rien d'autre à changer.
--
-- La table admit_members n'est plus utilisée. Elle reste illisible depuis
-- l'app ; on peut la supprimer plus tard avec :
--   drop table public.admit_members;
-- =====================================================================

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
