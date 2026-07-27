-- ============================================================================
-- EmpireVu seed — boatnames.ca as company `a1-boatnames` under org `a1-group`.
--
-- RUN THIS IN THE EMPIREVU REPO / DATABASE, not in boatnames.ca. It is a
-- TEMPLATE: this repo cannot reach EmpireVu, so the table and column names below
-- are the common-case guess and MUST be reconciled against EmpireVu's actual
-- organizations/companies schema before running. Match exactly how the existing
-- siblings are seeded: a1-marine-care, a1-marine-storage, a1-coatings.
--
-- WHY IT MATTERS: the intake resolves the company from the envelope's
-- `sourceSite` at lead time. boatnames.ca sends sourceSite = 'boatnames'. If no
-- company maps to 'boatnames' when a lead arrives, that lead lands in raw_leads
-- instead of matching/creating a contact. Seed this BEFORE flipping the boatnames
-- forward gate on (the gate is off by default, so seeding first is safe).
--
-- VERIFY against the real schema before running:
--   1. Org/company table + column names (organizations? companies? tenants?).
--   2. How a company declares the sourceSite(s) that route to it — a column on
--      the company (source_site / slug / domain) or a separate mapping table.
--      NOTE: the siblings' sourceSite is the slug with hyphens removed
--      (a1-marine-care -> "a1marinecare"), but boatnames.ca intentionally sends
--      the standalone brand id "boatnames" (NOT "a1boatnames") — confirm the
--      mapping resolves that value to the a1-boatnames company.
--   3. Any other columns the siblings require (status, timezone, plan, etc.).
-- ============================================================================

-- 1) Ensure the org exists (no-op if it already does).
insert into organizations (slug, name)
values ('a1-group', 'A1 Group')
on conflict (slug) do nothing;

-- 2) Create the company under a1-group. `source_site` is the value the intake
--    matches the incoming envelope's sourceSite against — must equal 'boatnames'.
insert into companies (organization_id, slug, name, source_site)
select o.id, 'a1-boatnames', 'boatnames.ca', 'boatnames'
from organizations o
where o.slug = 'a1-group'
on conflict (slug) do nothing;

-- If sourceSite routing lives in a SEPARATE mapping table rather than a
-- companies.source_site column, add the mapping there instead, e.g.:
--
--   insert into company_source_sites (company_id, source_site)
--   select c.id, 'boatnames' from companies c where c.slug = 'a1-boatnames'
--   on conflict do nothing;
