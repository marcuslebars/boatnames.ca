-- ============================================================================
-- EmpireVu seed — boatnames.ca as company `a1-boatnames` under org `a1-group`.
--
-- The CANONICAL copy lives in the EmpireVu (syncoree) repo:
--   syncoree/supabase/seeds/a1-boatnames.sql
-- and the sourceSite -> company routing is a CODE MAP (there is NO companies
-- source_site column and no mapping table):
--   syncoree/src/server/services/lead-intake/routing.ts
--     SOURCE_SITE_TO_COMPANY_SLUG["boatnames"] = "a1-boatnames"
--   (the intake calls companySlugForSourceSite() in intake.ts). The target org is
--   pinned by env LEAD_INTAKE_ORG_SLUG, default "a1-group".
--
-- As of this writing that work — routing map, this seed, intake fixtures, and
-- tests — is complete on the EmpireVu branch `feat/boatnames-company-intake`
-- (commit 75850c4) but is NOT merged to main / NOT deployed. This file is a
-- reference copy for the boatnames repo; the syncoree copy is authoritative.
--
-- To make boatnames leads land as EmpireVu contacts (not raw_leads):
--   1. Merge `feat/boatnames-company-intake` -> main and DEPLOY EmpireVu — ships
--      the routing code map (+ the boatnames intake fixtures + tests).
--   2. RUN this seed against the live EmpireVu DB (creates the company row). Needs
--      org `a1-group` to exist — it does; the live A1 sibling companies sit under it.
--   3. On boatnames.ca (Railway): set EMPIREVU_INTAKE_URL + EMPIREVU_INTAKE_SECRET,
--      ensure EMPIREVU_INTAKE_DISABLED is not "1", redeploy; then replay the outbox
--      (`bun scripts/replay-outbox.ts skipped_gated`).
--
-- Schema (verified against the EmpireVu migrations):
--   public.companies (id, organization_id, name, slug, stage, website, notes, …)
--   UNIQUE (organization_id, slug); stage enum ('prospect','active','paused','archived')
-- ============================================================================

insert into public.companies (organization_id, slug, name, stage, website, notes)
select
  o.id,
  'a1-boatnames',
  'boatnames.ca',
  'active',
  'https://boatnames.ca',
  'boatnames.ca — custom boat name lettering (An A1 Company). Intake sourceSite: "boatnames".'
from public.organizations o
where o.slug = 'a1-group'
on conflict (organization_id, slug) do nothing;

-- Verify (expect exactly one row):
-- select c.slug, c.name, c.stage, o.slug as org
-- from public.companies c
-- join public.organizations o on o.id = c.organization_id
-- where c.slug = 'a1-boatnames';
