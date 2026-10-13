-- Everdoer rebrand: rename the lead-forward outbox table.
--
--   public.empirevu_outbox  ->  public.everdoer_outbox
--
-- Pure rename: no column, type, RLS, grant or data change. Constraint and index
-- names that carry the old table prefix move with it:
--   empirevu_outbox_pkey                   -> everdoer_outbox_pkey (+ its index)
--   empirevu_outbox_idempotency_key_key    -> everdoer_outbox_idempotency_key_key (+ its index)
--   empirevu_outbox_quote_request_id_fkey  -> everdoer_outbox_quote_request_id_fkey
--   empirevu_outbox_order_id_fkey          -> everdoer_outbox_order_id_fkey
--   empirevu_outbox_one_source_chk         -> everdoer_outbox_one_source_chk
--   empirevu_outbox_status_idx             -> everdoer_outbox_status_idx
--   empirevu_outbox_order_idx              -> everdoer_outbox_order_idx
-- The renames below are a sweep over the table's own constraints and indexes, so
-- they also cover any auto-named constraint a newer Postgres adds.
--
-- RLS stays enabled with no policies (service role only); grants travel with the
-- table. No triggers, sequences (uuid PK), RLS policies or functions reference
-- this table, so nothing else needs recreating.
--
-- COMPAT VIEW: an updatable view keeps the OLD name working so the code deployed
-- before this migration (which still writes to "empirevu_outbox") keeps
-- inserting/updating rows until the rebranded code is live. security_invoker =
-- true makes it run with the CALLER's privileges, so the table's RLS still
-- applies (a security-definer view would let anon/authenticated read the outbox).
-- Its grants are copied from the table so it is exactly as reachable as before.
--
-- FOLLOW-UP (separate later migration, once the rebranded code is deployed and
-- nothing uses the old name): drop view if exists public.empirevu_outbox;
--
-- Re-runnable: every step is guarded, so applying it twice (or on a project
-- bootstrapped from docs/supabase-setup.sql, which already has everdoer_outbox)
-- is a no-op apart from (re)creating the compat view.
--
-- Rollback: supabase/rollback/20261013000000_everdoer_outbox.down.sql

begin;

do $$
declare
  r record;
begin
  -- Rename only if it hasn't happened yet and the old name is still the TABLE.
  if to_regclass('public.everdoer_outbox') is null then
    if exists (
      select 1 from pg_class
      where oid = to_regclass('public.empirevu_outbox') and relkind = 'r'
    ) then
      alter table public.empirevu_outbox rename to everdoer_outbox;
    else
      raise exception 'neither public.everdoer_outbox nor table public.empirevu_outbox exists';
    end if;
  end if;

  -- Each rename below only fires for a name that still carries the old prefix.
  -- Constraints first: renaming a PK/UNIQUE constraint renames its index too.
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.everdoer_outbox'::regclass
      and conname like 'empirevu\_outbox\_%'
  loop
    execute format(
      'alter table public.everdoer_outbox rename constraint %I to %I',
      r.conname,
      'everdoer_outbox_' || substr(r.conname, length('empirevu_outbox_') + 1)
    );
  end loop;

  -- Then the plain indexes that still carry the old prefix.
  for r in
    select ic.relname
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    where i.indrelid = 'public.everdoer_outbox'::regclass
      and ic.relname like 'empirevu\_outbox\_%'
  loop
    execute format(
      'alter index public.%I rename to %I',
      r.relname,
      'everdoer_outbox_' || substr(r.relname, length('empirevu_outbox_') + 1)
    );
  end loop;
end $$;

-- Compat view under the old name. A single-table SELECT * is auto-updatable, so
-- INSERT ... RETURNING / UPDATE / DELETE through it hit the table, and columns
-- the caller omits take the table's defaults (id, status, attempts, created_at).
create or replace view public.empirevu_outbox
with (security_invoker = true)
as select * from public.everdoer_outbox;

comment on view public.empirevu_outbox is
  'Rebrand compat view for everdoer_outbox. Drop once no deployed code uses the old name.';

-- Same grants as the table: clear whatever default privileges gave the new view,
-- then copy the table's ACL entry for entry (owner keeps its implicit rights).
do $$
declare
  r record;
  grantee_sql text;
begin
  for r in
    select distinct a.grantee
    from pg_class c, aclexplode(c.relacl) a
    where c.oid = 'public.empirevu_outbox'::regclass
      and a.grantee <> c.relowner
  loop
    grantee_sql := case when r.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(r.grantee)) end;
    execute format('revoke all on public.empirevu_outbox from %s', grantee_sql);
  end loop;

  for r in
    select a.grantee, a.privilege_type, a.is_grantable
    from pg_class c, aclexplode(c.relacl) a
    where c.oid = 'public.everdoer_outbox'::regclass
      and a.grantee <> c.relowner
  loop
    grantee_sql := case when r.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(r.grantee)) end;
    execute format(
      'grant %s on public.empirevu_outbox to %s%s',
      r.privilege_type,
      grantee_sql,
      case when r.is_grantable then ' with grant option' else '' end
    );
  end loop;
end $$;

-- Ask PostgREST (Supabase API) to pick up the renamed table + view right away.
notify pgrst, 'reload schema';

commit;
