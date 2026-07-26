# syntax=docker/dockerfile:1
#
# Holy Ship is a TanStack Start SSR app — `bun run build` emits a self-contained
# Nitro **node-server** bundle to .output/, which must be RUN (not served as a
# static dir). This overrides any buildpack that assumes a static Vite `dist/`.

# ── Build: bun installs deps and builds the Nitro node-server output ──────────
FROM oven/bun:1 AS build
WORKDIR /app

# Manifest first for better layer caching.
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# Public (VITE_) build-time config is inlined into the client bundle, so it must
# be present at BUILD time. The platform can pass these as build args; unset ->
# the code's defaults apply (SITE_URL -> https://holyship.a1marinecare.ca).
# Server-only secrets (SUPABASE_*, RESEND_API_KEY, EMPIREVU_*) are RUNTIME env —
# never build args, so they never enter an image layer.
ARG VITE_SITE_URL
ARG VITE_ERROR_ENDPOINT
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_ERROR_ENDPOINT=$VITE_ERROR_ENDPOINT

COPY . .
RUN bun run build

# ── Runtime: plain Node runs the self-contained server bundle ────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Nitro's node-server listens on $PORT (the platform injects it; 3000 default).
EXPOSE 3000

# The bundle is self-contained — only .output is needed at runtime (no node_modules).
COPY --from=build /app/.output ./.output

CMD ["node", ".output/server/index.mjs"]
