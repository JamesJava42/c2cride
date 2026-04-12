# ── Stage 1: build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack so pnpm is available
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# Install API deps only, skip lifecycle scripts (husky etc.)
RUN pnpm --filter api install --frozen-lockfile --ignore-scripts

# Copy source and build
COPY apps/api ./apps/api
RUN pnpm --filter api build

# ── Stage 2: runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# Production deps only
RUN pnpm --filter api install --frozen-lockfile --ignore-scripts --prod

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
