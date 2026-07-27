# boatnames.ca — Launch Checklist

Everything the code can't decide on its own, in one place. The site builds, lints,
type-checks, and passes its unit tests today; these are the human/infra steps to
go live. boatnames.ca is a standalone national brand ("An A1 Company") selling
vinyl + acrylic boat-name lettering, with Holy Ship demoted to a case study.

## 1. Case-study content to verify — now public commercial proof

The Holy Ship case study (`src/routes/gallery/holy-ship.tsx`) is a real customer's
boat on a public commercial site. Every claim below was AI-invented by the original
Lovable build and is flagged with `TODO(content)` — **confirm or correct before launch:**

- "The owner keeps her at a **private slip north of Midland**."
- "…**runs her regularly to the North Channel**."
- "…**ten seasons** of sun and dock-side spray past her last polish."
- Confirm you have the **owner's permission** to feature the boat publicly.
- The six-step "WHAT A1 DID" process reads wash → wet sand → compound → polish →
  polymer sealant → stainless/canvas (owner-confirmed: wet-sand / compound / polish
  then polymer seal — **not** ceramic coating).

**Spec values** (case-study `dl`) — Meridian 408 model-line approximations, verify
against the real hull: LOA `42' 8"`, BEAM `13' 10"`, POWER `TWIN INBOARD`, HULL
COLOUR `GELCOAT WHITE`.

## 2. Real NAP (name / address / phone) — flagged `TODO(NAP)`

- **Phone** `+1-705-000-0000` — placeholder in the `/install` LocalBusiness JSON-LD
  (`src/routes/install.tsx`) and the footer `tel:` link + display text
  (`src/components/site/Layout.tsx`). Replace with A1 Marine Care's real number.
- **Email** `hello@boatnames.ca` — footer + quote error copy assume this inbox exists.
  Confirm it's live (or repoint).
- **Address** — only `Midland, ON` locality is set (install LocalBusiness). Add a
  street address if you want it in the schema.

## 3. Photography — shoot list for the boatnames structure

Each `ImgSlot` renders a labelled placeholder tile until the real file exists.

**Case-study set — present (owner's photos):**

| File (`public/images/…`) | Used on                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `holyship-hero.jpg`      | case-study hero + homepage OG (interim)                     |
| `holyship-gallery1.jpg`  | case-study feature + slider "after" + homepage proof teaser |
| `holyship-before.jpg`    | case-study slider "before" (old vinyl name)                 |
| `holyship-hull-side.jpg` | case-study gallery                                          |
| `holyship-408-badge.jpg` | case-study gallery                                          |

**Acrylic finish swatches — STILL NEEDED (5), used in the homepage `#acrylic-finishes` library:**

| File (`public/images/…`)   | Alt text                                                       |
| -------------------------- | -------------------------------------------------------------- |
| `finish-mirror-gold.jpg`   | Sample of Mirror Gold cast acrylic finish under marina light   |
| `finish-mirror-silver.jpg` | Sample of Mirror Silver cast acrylic finish under marina light |
| `finish-gloss-black.jpg`   | Sample of Gloss Black cast acrylic finish under marina light   |
| `finish-gloss-white.jpg`   | Sample of Gloss White cast acrylic finish under marina light   |
| `finish-frosted.jpg`       | Sample of Frosted cast acrylic finish under marina light       |

**New slots the rebrand introduces (not yet wired — need a shoot + a small build):**

- **Vinyl finish gallery** — the previewer renders vinyl swatches in CSS (no photos
  needed there), but there is no homepage vinyl finish gallery yet. If added, shoot
  `finish-vinyl-white/black/navy/red/gold/silver.jpg` (alt: "Sample of {colour} cut
  vinyl boat lettering").
- **Install-tier photos** — `/install` is currently text-only. Shoot an A1 crew
  templating and installing at a marina: `install-template.jpg` (alt: "A1 Marine
  Care templating a transom at the dock"), `install-crew.jpg` (alt: "A1 Marine Care
  crew installing cast acrylic boat lettering at a marina"). Then place them on
  `src/routes/install.tsx`.
- **Branded OG image (recommended)** — the homepage OG currently reuses
  `holyship-hero.jpg` (the case-study boat). A product-led `og-boatnames.jpg`
  (1200×630) would be a stronger social card for a national brand; set it as
  `OG_IMAGE` in `src/routes/index.tsx`.

**Present but unreferenced:** `holyship-profile.jpg`, `holyship-flybridge.jpg` (safe
to delete). **Present + in use:** `transom-preview-base.jpg` (previewer base),
`favicon.png`.

## 4. Supabase (the leads backend)

1. Create/choose a Supabase project.
2. Apply the migrations in order (`supabase db push`, or paste into the SQL editor):
   - `20260725000000_holyship_quote_backend.sql` — tables, enums, private `quote-photos` bucket.
   - `20260727000000_boatnames_tier_fields.sql` — `product_line` + `fulfillment` columns.
   - `20260727000100_outbox_superseded_status.sql` — adds the `superseded` outbox status.
   - `20260727000200_supersede_holyship_outbox.sql` — retires any stale holyship-shaped outbox rows.
3. Confirm the `quote-photos` bucket exists and is **private**.

## 5. Environment variables (see `.env.example`)

Server-only (NEVER `VITE_`-prefixed): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `LEAD_FROM_EMAIL` + `LEAD_NOTIFY_EMAIL` (default to `@boatnames.ca`).
Public: `VITE_SITE_URL` = the production origin (defaults to `https://boatnames.ca`).

- **Resend must verify the `boatnames.ca` domain** before `LEAD_FROM_EMAIL` can send.

## 6. Deploy (Railway)

- Build: `bun run build` → Nitro node-server output in `.output/`.
- Start: `node .output/server/index.mjs` (Railway provides `PORT`).
- After deploy, hit `GET /api/health` — expect `{"ok":true,"db":"ok"}`.
- Submit a real test quote (once) per tier — a ship-tier vinyl and an install-tier
  acrylic — and confirm each writes a `quote_requests` row with the correct
  `product_line` + `fulfillment`, a `skipped_gated` `empirevu_outbox` row with a
  schema-valid envelope under `sourceSite: boatnames`, and the notification email.

## 7. EmpireVu forward — stays OFF until you flip it

boatnames.ca forwards as a **new EmpireVu company**: slug `a1-boatnames` under the `a1-group`
org (NOT a service line of a1-marine-care). Envelope: `sourceSite: boatnames`, `source:
boatnames_quote_ship | _install | _unsure`, `formType: quote`. The forward is gated off by
default. To enable, in order:

1. **Seed the company (cross-repo, EmpireVu):** create the `a1-boatnames` company under
   `a1-group`, matching the sibling slug convention (`a1-marine-care` / `a1-marine-storage` /
   `a1-coatings`), and map `sourceSite: boatnames` to it. **Sequencing matters** — the intake
   resolves the company from `sourceSite` at lead time, so a lead arriving before the seed lands
   in `raw_leads` instead of matching a contact. Keep the gate OFF until the seed is confirmed.
   Starting point: `docs/empirevu-seed-a1-boatnames.sql` (a template — reconcile table/column
   names against EmpireVu's real schema first; this repo can't reach it).
2. **Sync the fixtures (cross-repo):** add
   `src/server/__fixtures__/lead-envelopes/boatnames-ship-acrylic.json` and
   `boatnames-install-vinyl.json` to EmpireVu's intake fixtures and confirm they validate there.
3. Set `EMPIREVU_INTAKE_URL` + `EMPIREVU_INTAKE_SECRET`; remove `EMPIREVU_INTAKE_DISABLED=1`.
4. Replay the accumulated envelopes: `bun scripts/replay-outbox.ts skipped_gated` — diff a batch
   against the fixtures first; each should resolve to a CRM contact, not `raw_leads`. Rows written
   under the old holyship shape are already marked `superseded` (migration
   `20260727000200_supersede_holyship_outbox.sql`) and won't replay.

## 8. Pre-launch QA (needs a deployed/preview build)

- Lighthouse mobile: performance ≥ 90, accessibility ≥ 95.
- **Previewer-as-hero on mobile**: confirm the live preview canvas is usable at first
  paint; consider a controls-first reflow if the font/finish/size controls feel too
  far below the fold.
- **Vinyl/acrylic toggle**: renders visibly flat (vinyl) vs dimensional (acrylic), and
  the design (incl. product line) round-trips through the share URL.
- Keyboard-only pass through the previewer (product-line/font/finish radiogroups, size
  slider) and the quote form — visible focus throughout, no traps.
- Quote form: the install tier requires a marina and shows the service-area note; the
  ship tier leads with the transom photo.
- `?calibrate=1` on the previewer to fine-tune the lettering panel against the real
  photo if needed (`PANEL` in `src/components/site/TransomPreviewer.tsx`).
- **Checkout seam stays server-only** (Phase 8): after `bun run build`,
  `grep -riE "stripe|shopify|checkout" .output/public` must return nothing — no
  payment identifier ships to the browser. The seam is inert unless
  `CHECKOUT_ENABLED=1`; at launch leave it off (code defaults to off + manual).
