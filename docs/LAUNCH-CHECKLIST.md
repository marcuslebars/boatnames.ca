# Holy Ship — Launch Checklist

Everything the code can't decide on its own, in one place. The site builds, lints,
type-checks, and passes its unit tests today; these are the human/infra steps to
go live.

## 1. Content to confirm — this is a real customer's boat on a public page

**Unverifiable claims (AI-invented by the original Lovable build — confirm or correct):**

- "The owner keeps her at a **private slip north of Midland**." (`src/routes/index.tsx`, "THE BOAT")
- "…**runs her regularly to the North Channel**."
- "…**ten seasons** of sun and dock-side spray past her last polish."
- Footer: "This page documents one customer boat, **shared with the owner's permission**." — confirm you have that permission.
- The six-step "WHAT A1 DID" process — confirm it matches the actual job done on this hull.

**Spec values — Meridian 408 model-line approximations, verify against the real hull:**

- LOA `42' 8"`, BEAM `13' 10"`, POWER `TWIN INBOARD`, HULL COLOUR `MIDNIGHT / GRAPHITE`.

## 2. Real NAP (name / address / phone) for the schema + footer

Currently placeholders (flagged with `TODO(NAP)` in `src/routes/index.tsx`):

- Phone `+1-705-000-0000` — appears in the LocalBusiness JSON-LD, the footer `tel:` link, and the footer display text.
- Email `hello@a1marinecare.ca` — confirm this is the right inbox.
- Address — only `Midland, ON` locality is set; add a street address if you want it in the schema.

## 3. Missing photography (10 files) — drop into `public/images/`

Each renders a labelled placeholder tile until the real file exists. Paths + alt text:

| File (`public/images/…`)   | Alt text                                                                  |
| -------------------------- | ------------------------------------------------------------------------- |
| `holyship-profile.jpg`     | Meridian 408 Holy Ship at anchor, profile view                            |
| `holyship-flybridge.jpg`   | Flybridge of Holy Ship with polished stainless and detailed canvas        |
| `holyship-hull-side.jpg`   | Ceramic-coated hull side of Holy Ship showing depth of gelcoat reflection |
| `hull-before.jpg`          | Hull side of Holy Ship before compound and polish, showing oxidation      |
| `hull-after.jpg`           | Hull side of Holy Ship after ceramic coating, reflecting the sky          |
| `finish-mirror-gold.jpg`   | Sample of Mirror Gold cast acrylic finish under marina light              |
| `finish-mirror-silver.jpg` | Sample of Mirror Silver cast acrylic finish under marina light            |
| `finish-gloss-black.jpg`   | Sample of Gloss Black cast acrylic finish under marina light              |
| `finish-gloss-white.jpg`   | Sample of Gloss White cast acrylic finish under marina light              |
| `finish-frosted.jpg`       | Sample of Frosted cast acrylic finish under marina light                  |

**Added from the owner's photos:** `holyship-profile.jpg` (transom/name), `holyship-flybridge.jpg`, `holyship-hull-side.jpg`, `holyship-408-badge.jpg` — so the first three rows above are done.

**Still needed:** `hull-before.jpg`, `hull-after.jpg`, and the five `finish-*.jpg` swatches (or restructure those sections to not require them). Already present: `transom-hero.jpg`, `transom-preview-base.jpg`, `favicon.png`.

## 4. Supabase (the leads backend)

1. Create/choose a Supabase project.
2. Apply `supabase/migrations/20260725000000_holyship_quote_backend.sql` (Supabase CLI `supabase db push`, or paste into the SQL editor). It creates the tables, the enums, and the **private** `quote-photos` bucket.
3. Confirm the `quote-photos` bucket exists and is private.

## 5. Environment variables (see `.env.example`)

Server-only (NEVER `VITE_`-prefixed): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `LEAD_FROM_EMAIL` (Resend-verified domain), `LEAD_NOTIFY_EMAIL`.
Public: `VITE_SITE_URL` = the production origin.

## 6. Deploy (Railway)

- Build: `bun run build` → Nitro node-server output in `.output/`.
- Start: `node .output/server/index.mjs` (Railway provides `PORT`).
- After deploy, hit `GET /api/health` — expect `{"ok":true,"db":"ok"}`.
- Submit a real test quote and confirm: a `quote_requests` row, a `skipped_gated`
  `empirevu_outbox` row with a schema-valid envelope, and the notification email.

## 7. EmpireVu forward — stays OFF until you flip it

Holy Ship is the 4th spoke (`sourceSite: a1marinecare`, `source: holyship_acrylic_quote`).
The forward is gated off by default. To enable, in order:

1. **Cross-repo:** add `src/server/__fixtures__/lead-envelopes/holyship-quote.json`
   to syncoree's intake fixtures and confirm it validates there. Until this lands,
   the intake side isn't proven against this payload.
2. Set `EMPIREVU_INTAKE_URL` + `EMPIREVU_INTAKE_SECRET`; remove `EMPIREVU_INTAKE_DISABLED=1`.
3. Replay the accumulated envelopes: `bun scripts/replay-outbox.ts skipped_gated`
   — diff a batch against the fixtures first; each should resolve to a CRM contact,
   not `raw_leads`.

## 8. Pre-launch QA (needs a deployed/preview build)

- Lighthouse mobile: performance ≥ 90, accessibility ≥ 95.
- Keyboard-only pass through the previewer (font/finish radiogroups, size slider)
  and the quote form — visible focus throughout, no traps.
- `?calibrate=1` on the previewer to fine-tune the lettering panel against the
  real photo if needed (`PANEL` in `src/components/site/TransomPreviewer.tsx`).
