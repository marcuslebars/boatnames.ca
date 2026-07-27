-- boatnames.ca: add a 'superseded' outbox status.
--
-- Used to retire outbox rows written under the old holyship envelope shape once
-- the builder became buildBoatnamesEnvelope. This is its OWN migration on purpose:
-- Postgres won't let a newly added enum value be USED in the same transaction
-- that adds it, so the UPDATE that consumes it lives in the next migration.
alter type public.outbox_status add value if not exists 'superseded';
