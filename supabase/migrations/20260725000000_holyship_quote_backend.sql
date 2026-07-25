-- Holy Ship acrylic-quote backend.
--
-- Written ONLY by the /api/quote server route via the Supabase service role
-- (RLS-bypassing). RLS is enabled with NO anon/authenticated policy — the
-- service role is the sole writer and there is no public read. This is Holy
-- Ship's own database; the EmpireVu CRM is a separate system reached via the
-- signed forward (empirevu_outbox).

-- ── Leads ────────────────────────────────────────────────────────────────────
create type public.quote_status as enum ('new', 'reviewing', 'quoted', 'won', 'lost', 'spam');

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  -- contact
  name text not null,
  email text not null,
  phone text,
  -- boat
  boat_model text,
  marina text,
  transom_width_in numeric,
  -- design
  boat_name text,
  hailing_port text,
  font text,
  finish text,
  letter_height_in numeric,
  run_length_in numeric,
  notes text,
  -- photo (private storage object + a signed URL for the notification)
  photo_path text,
  photo_url text,
  -- CASL consent record
  consent_text text,
  consent_at timestamptz,
  consent_ip text,
  -- attribution
  source text,
  preview_url text,
  utm jsonb,
  referrer text,
  user_agent text,
  ip text,
  -- triage
  status public.quote_status not null default 'new',
  created_at timestamptz not null default timezone('utc', now())
);
create index quote_requests_created_idx on public.quote_requests (created_at desc);
create index quote_requests_status_idx on public.quote_requests (status, created_at desc);
create index quote_requests_email_idx on public.quote_requests (lower(email));

-- ── Raw submissions (never drop a lead) ──────────────────────────────────────
-- The untouched payload, captured BEFORE validation, so a malformed or partially
-- valid submission is still recoverable.
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

-- ── Rate limiting (5 / hour / IP) ────────────────────────────────────────────
-- One row per accepted attempt; the route counts rows in the trailing window.
-- Postgres-backed so it survives serverless cold starts / multiple instances.
create table public.quote_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default timezone('utc', now())
);
create index quote_rate_limits_ip_created_idx on public.quote_rate_limits (ip, created_at desc);

-- ── EmpireVu forward outbox ──────────────────────────────────────────────────
-- Every submission builds + persists its signed-lead envelope here, even while
-- the forward is gated off, so flipping the gate on is a controlled replay of
-- real payloads. Never stores the secret or the signature (timestamp-bound; they
-- must be re-derived at send time).
create type public.outbox_status as enum ('pending', 'sent', 'failed', 'skipped_gated');

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

-- ── Private storage bucket for transom photos ────────────────────────────────
insert into storage.buckets (id, name, public)
values ('quote-photos', 'quote-photos', false)
on conflict (id) do nothing;

-- ── RLS: service-role only ───────────────────────────────────────────────────
alter table public.quote_requests enable row level security;
alter table public.raw_submissions enable row level security;
alter table public.quote_rate_limits enable row level security;
alter table public.empirevu_outbox enable row level security;
-- No policies: only the service role (the /api/quote route) reads or writes, and
-- it bypasses RLS by design.
