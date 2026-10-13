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

drop view if exists public.empirevu_outbox;

alter table public.everdoer_outbox rename to empirevu_outbox;

do $$
declare
  r record;
begin
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
