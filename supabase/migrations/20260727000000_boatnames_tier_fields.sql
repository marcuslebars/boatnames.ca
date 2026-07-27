-- boatnames.ca: product line + fulfillment tier per quote.
--
-- Additive and idempotent (ADD COLUMN IF NOT EXISTS) so it applies cleanly
-- whether or not the base migration has already run against this database.
-- product_line: 'vinyl' | 'acrylic'. fulfillment: 'ship' | 'install' | 'unsure'.
-- Kept as plain text (not enums) so new values don't require a migration.
alter table public.quote_requests
  add column if not exists product_line text,
  add column if not exists fulfillment text;
