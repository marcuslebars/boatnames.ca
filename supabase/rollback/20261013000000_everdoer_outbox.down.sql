-- ROLLBACK for supabase/migrations/20261013000000_everdoer_outbox.sql
--
-- Drops the compat view and renames public.everdoer_outbox back to
-- public.empirevu_outbox, along with its constraint and index names. Data, RLS
-- and grants are untouched (they belong to the table and travel with it).
--
-- Order: roll the APP back to a build that writes "empirevu_outbox" FIRST, then
-- run this. The rebranded code writes "everdoer_outbox", which no longer exists
-- once this has run.
--
-- Run by hand (SQL editor / psql). If the migration was applied with the
-- Supabase CLI, also mark it reverted so a later `db push` re-applies it:
--   supabase migration repair --status reverted 20261013000000

begin;

-- Every step is guarded, so running this twice is a no-op the second time.
do $$
declare
  r record;
begin
  -- Drop the compat VIEW only (never a table that happens to have the old name).
  if exists (
    select 1 from pg_class
    where oid = to_regclass('public.empirevu_outbox') and relkind = 'v'
  ) then
    drop view public.empirevu_outbox;
  end if;

  if to_regclass('public.empirevu_outbox') is null then
    if to_regclass('public.everdoer_outbox') is not null then
      alter table public.everdoer_outbox rename to empirevu_outbox;
    else
      raise exception 'neither public.empirevu_outbox nor public.everdoer_outbox exists';
    end if;
  end if;

  -- Each rename below only fires for a name that still carries the new prefix.
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.empirevu_outbox'::regclass
      and conname like 'everdoer\_outbox\_%'
  loop
    execute format(
      'alter table public.empirevu_outbox rename constraint %I to %I',
      r.conname,
      'empirevu_outbox_' || substr(r.conname, length('everdoer_outbox_') + 1)
    );
  end loop;

  for r in
    select ic.relname
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    where i.indrelid = 'public.empirevu_outbox'::regclass
      and ic.relname like 'everdoer\_outbox\_%'
  loop
    execute format(
      'alter index public.%I rename to %I',
      r.relname,
      'empirevu_outbox_' || substr(r.relname, length('everdoer_outbox_') + 1)
    );
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
