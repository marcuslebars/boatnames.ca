# boatnames.ca

Custom **boat name lettering** — cut vinyl and dimensional cast acrylic —
designed online and sold across Canada. **boatnames.ca** is a standalone brand,
**an A1 company**.

The interactive **transom previewer** is the product: type a name, pick a product
line (vinyl/acrylic), font, finish, and size, and see it on a transom before you
buy. Two fulfillment tiers — **ship anywhere in Canada** with an application
guide, or **white-glove install** by A1 Marine Care crews across Georgian Bay,
Lake Simcoe, and the Trent-Severn. A **quote form** feeds the A1 lead pipeline.
**Holy Ship** (a Meridian 408) lives on as a case study at `/gallery/holy-ship`.

## Stack

TanStack Start (SSR, React 19) · Vite 8 · Tailwind CSS v4 · TypeScript · bun.
Deploys to **Railway** (Nitro `node-server`); Postgres + file storage via
**Supabase**.

## Local setup

Requires [bun](https://bun.sh) (v1.3+).

```bash
bun install
bun run dev        # http://localhost:8080
```

Other scripts:

```bash
bun run build      # production build -> .output/
bun run preview    # preview the production build
bun run lint       # eslint + prettier check
bun run format     # prettier --write .
```

## Environment variables

Only `VITE_`-prefixed variables are exposed to the browser. Everything else is
server-only and must never carry the `VITE_` prefix. Copy `.env.example` to
`.env` (the backend phase adds `.env.example` with the full list).

Client (`VITE_`) variables:

| Variable              | Required | Purpose                                                                                     |
| --------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `VITE_SITE_URL`       | no       | Canonical site origin for absolute OG images / sitemap. Defaults to `https://boatnames.ca`. |
| `VITE_ERROR_ENDPOINT` | no       | If set, client errors are POSTed here (`{ message, stack, route, userAgent }`).             |

Server-only variables (added with the backend) include the Supabase connection,
the Resend API key, and the EmpireVu forward secret. They are documented in
`.env.example` and validated at boot.

## Deploy target

**Railway.** The production build emits a Nitro Node server under `.output/`
(`node .output/server/index.mjs`), with Postgres and object storage on Supabase.

## Project layout

- `src/routes/` — pages and server routes (`index.tsx` product homepage,
  `gallery/holy-ship.tsx` case study, `install.tsx` white-glove tier; `api/**`
  backend endpoints). Shared chrome lives in `src/components/site/Layout.tsx`.
- `src/components/site/` — hand-authored site components (previewer, quote form,
  before/after slider).
- `src/components/ui/` — vendored shadcn/ui primitives (do not hand-edit).
- `src/styles.css` — Tailwind v4 theme + design tokens.
- `public/images/` — site photography.

See [CLAUDE.md](CLAUDE.md) for design tokens and contributor conventions.
