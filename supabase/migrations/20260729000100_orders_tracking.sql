-- Phase 5: shipment tracking on orders. Set on the `shipped` transition (admin
-- PATCH /api/admin/orders/:id/status) and surfaced in the customer shipped email.
-- Additive + idempotent.

alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists carrier text;
