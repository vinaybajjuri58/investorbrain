# syntax=docker/dockerfile:1
# =============================================================================
# InvestorBrain — web service Dockerfile
#
# Node version chosen: 22-alpine
#   • Next.js 16.2.10 requires node >=20.9.0 (from node_modules/next/package.json)
#   • web/package.json has no engines field
#   • Node 22 is an LTS release that satisfies the requirement and is
#     supported through April 2027. Override with --build-arg NODE_VERSION=24
#     if you want Active LTS.
#
# NO output:standalone is assumed — next.config.ts is left untouched.
# COGNEE_URL is injected at runtime via docker-compose environment.
# =============================================================================

ARG NODE_VERSION=22

# ---------------------------------------------------------------------------
# Stage 1 · base — shared toolchain (Node + pnpm via corepack)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base

# corepack ships with Node >=16.13 (present in node:22-alpine).
# Pin to the exact version declared in web/package.json#packageManager.
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# ---------------------------------------------------------------------------
# Stage 2 · deps — install ALL dependencies (dev + prod; both needed for build)
# ---------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

# Copy pnpm-workspace.yaml BEFORE the package manifests so pnpm honours
# the allowBuilds entries for sharp and unrs-resolver before resolving.
COPY pnpm-workspace.yaml ./

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 3 · builder — compile the Next.js application
# ---------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Borrow the full node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all application source (node_modules, .next, .env* excluded via .dockerignore)
COPY . .

RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 4 · prod-deps — prune to production-only modules
# ---------------------------------------------------------------------------
FROM base AS prod-deps

WORKDIR /app

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Install all deps first, then prune devDependencies.
# pnpm prune --prod removes packages listed under devDependencies.
# The virtual store (.pnpm/) is preserved so symlinks in node_modules work
# correctly when copied into the runner stage.
RUN pnpm install --frozen-lockfile && pnpm prune --prod

# ---------------------------------------------------------------------------
# Stage 5 · runner — lean production image
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Default points to the internal Compose service name.
# Override at runtime via docker-compose environment.
ENV COGNEE_URL=http://cognee:8000

# Non-root system user (mirrors the convention used by official Next.js examples)
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Re-enable corepack so `pnpm start` resolves correctly in this stage
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Production node_modules (pnpm symlinks are preserved by Docker COPY;
# the .pnpm/ virtual store is included so all symlink targets are present)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Built .next output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Static assets served directly by Next.js
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Config files required by `next start` at runtime
COPY --from=builder --chown=nextjs:nodejs /app/package.json  ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
# tsconfig.json is needed for @/* path alias resolution that next may
# reference when reading next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

USER nextjs

EXPOSE 3000

# Invoke next directly: `pnpm start` would trigger pnpm 11's
# verify-deps-before-run check, which attempts a `pnpm install --production`
# in the read-only /app and crashes with EACCES (devDeps were pruned, so the
# check never passes).
CMD ["node_modules/.bin/next", "start"]
