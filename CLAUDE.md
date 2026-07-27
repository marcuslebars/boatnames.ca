# CLAUDE.md

Guidance for working in this repository.

## What this is

**boatnames.ca** — a standalone national brand selling custom **boat name
lettering** (cut vinyl and dimensional cast acrylic) across Canada, positioned as
**"An A1 Company."** The interactive transom previewer is the product: visitors
design a name, pick a product line + font + finish + size, and see it on a
transom before buying.

Two fulfillment tiers: (1) **ship anywhere in Canada** — template from the
customer's photos, cut, ship with an application guide; (2) **white-glove
install** by A1 Marine Care crews, geo-scoped to Georgian Bay, Lake Simcoe, and
the Trent-Severn (`/install`). The site leads with the national product; install
is the geo-scoped upsell. **Holy Ship** (a Meridian 408) is demoted to a case
study at `/gallery/holy-ship`. A1 endorsement is footer-weight — never in the
masthead.

## Stack

- **TanStack Start** (full-stack React, SSR) on **React 19**
- **Vite 8** for build/dev
- **Tailwind CSS v4** (via `@tailwindcss/vite`, config-in-CSS — see `src/styles.css`)
- **TypeScript** (strict)
- Deploy target: **Railway** (Nitro `node-server` preset). Data/storage: **Supabase**.

## Package manager: bun

Use **bun** for everything. Do not use npm/pnpm/yarn.

```bash
bun install         # install deps
bun run dev         # dev server on http://localhost:8080
bun run build       # production build (Nitro -> .output/)
bun run lint        # eslint (Prettier is enforced as a lint rule)
bun run format      # prettier --write .
```

`bunfig.toml` enforces a 24h supply-chain guard (`minimumReleaseAge`): freshly
published package versions are skipped. Confirm with the owner before adding any
`minimumReleaseAgeExcludes` entry.

## Build config

`vite.config.ts` is hand-written (it replaced a vendored config wrapper). It wires
`@tailwindcss/vite`, `vite-tsconfig-paths` (the `@/` alias), `tanstackStart`
(with `server: { entry: "server" }` -> `src/server.ts`), `@vitejs/plugin-react`,
and — at build time only — Nitro with the `node-server` preset. Client-side
error reporting lives in `src/lib/report-error.ts` (logs to console; POSTs to
`VITE_ERROR_ENDPOINT` when set).

## Design tokens

Brand colors and fonts are CSS custom properties in `src/styles.css`, exposed to
Tailwind via the `@theme inline` block. The palette is intentionally **dark**.

| Token       | Meaning                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| `--hull`    | Page background (near-black)                                                       |
| `--gelcoat` | Primary text (off-white)                                                           |
| `--polish`  | Accent (cyan) — buttons, focus rings, eyebrows, before/after handle, `::selection` |
| `--bay`     | Muted teal section tint                                                            |
| `--wake`    | Secondary/label grey                                                               |

Fonts: `--font-sans` (UI chrome), `--font-mono` = JetBrains Mono (spec strips,
field labels, dimension readouts — the data-vs-prose contrast is deliberate; keep
it). Use them via Tailwind, e.g. `font-mono`, `text-[color:var(--polish)]`,
`bg-[color:var(--hull)]`.

The shadcn semantic tokens (`--background`, `--foreground`, `--border`, `--ring`,
`primary`, etc.) also exist because `src/components/ui/**` primitives depend on
them. Note the `.dark` class is **not** applied to `<html>`, so those tokens
currently resolve to their `:root` values.

### Acrylic font options are product data — do not "clean up"

`FONT_OPTIONS` in `src/components/site/previewer-types.ts` maps to five distinct
display faces (Yeseva One, Big Shoulders Display, Bebas Neue, Playfair Display,
Alex Brush). These represent the **letter styles a customer is buying**. They
must stay distinct from each other and from the UI font. Never collapse them.

## Where things live

- `src/routes/` — TanStack file-based routes. `index.tsx` is the product
  homepage; `gallery/holy-ship.tsx` is the case study (sibling-ready as
  `gallery/<slug>`); `install.tsx` is the white-glove tier. Shared chrome
  (`SiteHeader`, `SiteFooter`, `Section`, `useRevealOnScroll`) lives in
  `src/components/site/Layout.tsx`. `__root.tsx` holds document `<head>`, error
  boundary, and 404. `sitemap[.]xml.ts` is a server route. `src/routes/api/**`
  holds backend endpoints.
- `src/components/site/` — **hand-authored** site components: `TransomPreviewer`,
  `QuoteForm`, `BeforeAfterSlider`, `ImgSlot`, and `previewer-types.ts`. Edit
  these freely.
- `src/components/ui/` — **vendored shadcn/ui primitives.** Treat as generated
  library code: **do not hand-edit.** Re-vendor from shadcn if a primitive needs
  changing, or wrap/compose it in `src/components/site/` instead.
- `src/lib/` — utilities: `report-error.ts`, `error-capture.ts`/`error-page.ts`
  (SSR error normalization used by `src/server.ts`), `utils.ts` (`cn`).
- `public/images/` — site photography referenced by `ImgSlot`.

## Conventions

- Prettier config: 100 cols, double quotes, semicolons, trailing commas. Run
  `bun run format` before committing; lint fails on formatting violations.
- Only `VITE_`-prefixed env vars reach the browser bundle. Server-only secrets
  (database URL, API keys, HMAC secret) must **not** carry the `VITE_` prefix.
- No `any`. Keep the strict-TypeScript bar.
