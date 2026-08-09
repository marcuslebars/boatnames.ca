-- Phase 5: let the EmpireVu outbox hold ORDER envelopes (source
-- boatnames_order_paid), not just quotes. Make quote_request_id nullable and add
-- a nullable order_id; a row references exactly one of the two. Same durable
-- persist + gated forward + replay semantics — a paid order builds + persists its
-- envelope even while EMPIREVU_INTAKE_DISABLED=1, ready to replay when the gate
-- flips (after the a1-boatnames company + the order fixture are synced in EmpireVu).
--
-- Additive + idempotent. Existing rows (quote_request_id set, order_id null) stay
-- valid under the new check.

alter table public.empirevu_outbox alter column quote_request_id drop not null;

alter table public.empirevu_outbox
  add column if not exists order_id uuid references public.orders (id) on delete cascade;

create index if not exists empirevu_outbox_order_idx on public.empirevu_outbox (order_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'empirevu_outbox_one_source_chk'
  ) then
    alter table public.empirevu_outbox
      add constraint empirevu_outbox_one_source_chk check (
        (quote_request_id is not null and order_id is null)
        or (quote_request_id is null and order_id is not null)
      );
  end if;
end $$;
