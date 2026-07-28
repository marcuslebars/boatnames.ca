-- boatnames.ca — consolidated Supabase setup for a FRESH project.
--
-- Paste this into the Supabase SQL Editor to stand up the whole schema in one go.
-- It is the END STATE of supabase/migrations/*.sql, consolidated (outbox_status
-- already includes 'superseded', so there is no ALTER TYPE ADD VALUE transaction
-- gotcha). Use THIS *or* the CLI (`supabase db push`), never both — mixing them
-- causes "already exists" errors.
--
-- Service role is the sole writer; RLS on with no policies. After running this,
-- set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on the host and hit
-- GET /api/health -> expect {"ok":true,"db":"ok"}.

-- ── Enums ─────────────────────────────────────────────────────────────────────
create type public.quote_status as enum ('new', 'reviewing', 'quoted', 'won', 'lost', 'spam');
create type public.outbox_status as enum ('pending', 'sent', 'failed', 'skipped_gated', 'superseded');
create type public.order_status as enum (
  'draft', 'proofed', 'invoiced', 'paid', 'in_production',
  'shipped', 'install_scheduled', 'completed', 'cancelled', 'refunded'
);
create type public.order_payment_provider as enum ('stripe', 'shopify', 'manual');
create type public.order_event_actor as enum ('system', 'admin', 'webhook');

-- ── Leads (quote_requests) — the quote form writes here ───────────────────────
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  boat_model text,
  marina text,
  transom_width_in numeric,
  boat_name text,
  hailing_port text,
  font text,
  finish text,
  letter_height_in numeric,
  run_length_in numeric,
  product_line text, -- 'vinyl' | 'acrylic'
  fulfillment text, -- 'ship' | 'install' | 'unsure'
  notes text,
  photo_path text,
  photo_url text,
  consent_text text,
  consent_at timestamptz,
  consent_ip text,
  source text,
  preview_url text,
  utm jsonb,
  referrer text,
  user_agent text,
  ip text,
  status public.quote_status not null default 'new',
  created_at timestamptz not null default timezone('utc', now())
);
create index quote_requests_created_idx on public.quote_requests (created_at desc);
create index quote_requests_status_idx on public.quote_requests (status, created_at desc);
create index quote_requests_email_idx on public.quote_requests (lower(email));

-- ── Raw submissions (never drop a lead) ───────────────────────────────────────
create table public.raw_submissions (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid references public.quote_requests (id) on delete set null,
  raw_payload jsonb not null,
  ip text,
  user_agent text,
  valid boolean not null default false,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);
create index raw_submissions_created_idx on public.raw_submissions (created_at desc);

-- ── Rate limiting (5 / hour / IP) ─────────────────────────────────────────────
create table public.quote_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default timezone('utc', now())
);
create index quote_rate_limits_ip_created_idx on public.quote_rate_limits (ip, created_at desc);

-- ── EmpireVu forward outbox ───────────────────────────────────────────────────
create table public.empirevu_outbox (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete cascade,
  idempotency_key text not null unique,
  envelope jsonb not null,
  status public.outbox_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  response_status integer,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);
create index empirevu_outbox_status_idx on public.empirevu_outbox (status, created_at desc);

-- ── Orders (Phase 8 checkout seam — inert until CHECKOUT_ENABLED=1) ────────────
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid references public.quote_requests (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  product_line text not null,
  fulfillment text not null,
  boat_name text,
  hailing_port text,
  font text,
  finish text,
  letter_height_in numeric,
  run_length_in numeric,
  ship_name text,
  ship_line1 text,
  ship_line2 text,
  ship_city text,
  ship_province text,
  ship_postal_code text,
  ship_country text,
  currency text not null default 'CAD',
  subtotal_cents integer,
  tax_cents integer,
  shipping_cents integer,
  total_cents integer,
  payment_provider public.order_payment_provider,
  external_payment_ref text,
  status public.order_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_quote_idx on public.orders (quote_request_id);
create index orders_email_idx on public.orders (lower(email));

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  event_type text not null,
  actor public.order_event_actor not null,
  payload jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- ── Private storage bucket for transom photos ─────────────────────────────────
insert into storage.buckets (id, name, public)
values ('quote-photos', 'quote-photos', false)
on conflict (id) do nothing;

-- ── RLS: service-role only (no policies) ──────────────────────────────────────
alter table public.quote_requests enable row level security;
alter table public.raw_submissions enable row level security;
alter table public.quote_rate_limits enable row level security;
alter table public.empirevu_outbox enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
