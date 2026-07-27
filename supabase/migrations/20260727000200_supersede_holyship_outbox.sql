-- boatnames.ca: retire stale holyship-shaped outbox rows.
--
-- Every submission persists its signed envelope to empirevu_outbox even while the
-- forward is gated off, so any rows written before the boatnames rebrand carry the
-- old envelope shape (sourceSite 'a1marinecare', source 'holyship_acrylic_quote').
-- Mark them 'superseded' rather than deleting, so the eventual replay only sends
-- current boatnames envelopes. No-op if there are none (expected pre-launch).
update public.empirevu_outbox
set status = 'superseded'
where status = 'skipped_gated'
  and envelope ->> 'sourceSite' = 'a1marinecare';
