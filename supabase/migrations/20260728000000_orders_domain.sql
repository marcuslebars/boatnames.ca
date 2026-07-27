-- boatnames.ca checkout-seam order model (Phase 8).
--
-- Quotes (quote_requests) are inquiries; orders are commitments — SEPARATE tables
-- on purpose. Today orders are created + walked by the manual admin path; a future
-- checkout automates draft -> paid without touching this schema. Service-role is
-- the sole writer, RLS on with NO policies (same posture as quote_requests).
-- Money is stored in integer cents (never floats) to sidestep the cents/dollars trap.

-- Order lifecycle, incl. the quote-era manual ladder.
create type public.order_status as enum (
  'draft',
  'proofed',
  'invoiced',
  'paid',
  'in_production',
  'shipped',
  'install_scheduled',
  'completed',
  'cancelled',
  'refunded'
);

-- Which system settled payment (nullable on the order until one does).
create type public.order_payment_provider as enum ('stripe', 'shopify', 'manual');

-- Actor on an append-only order event.
create type public.order_event_actor as enum ('system', 'admin', 'webhook');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Provenance: an order may originate from a quote, or later straight from checkout.
  quote_request_id uuid references public.quote_requests (id) on delete set null,
  -- Customer contact.
  name text not null,
  email text not null,
  phone text,
  -- Product line + fulfillment tier.
  product_line text not null, -- 'vinyl' | 'acrylic'
  fulfillment text not null, -- 'ship' | 'install'
  -- Design config — same shape the previewer serializes.
  boat_name text,
  hailing_port text,
  font text,
  finish text,
  letter_height_in numeric,
  run_length_in numeric,
  -- Shipping address (nullable until checkout collects it).
  ship_name text,
  ship_line1 text,
  ship_line2 text,
  ship_city text,
  ship_province text,
  ship_postal_code text,
  ship_country text,
  -- Money — nullable now; pricing is manual (proof email) at launch. Integer cents.
  currency text not null default 'CAD',
  subtotal_cents integer,
  tax_cents integer,
  shipping_cents integer,
  total_cents integer,
  -- Payment linkage (nullable until a provider settles).
  payment_provider public.order_payment_provider,
  external_payment_ref text, -- provider order/payment id
  -- Lifecycle.
  status public.order_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_quote_idx on public.orders (quote_request_id);
create index orders_email_idx on public.orders (lower(email));

-- Append-only event log — the timeline a payment dispute needs.
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_type text not null,
  actor public.order_event_actor not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- RLS: service-role only (no policies), matching the quote backend.
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
