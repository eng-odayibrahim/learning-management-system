# =============================================================================
# Stage 1 — Dependencies
# =============================================================================
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# =============================================================================
# Stage 2 — Builder
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# =============================================================================
# Stage 3 — Runner
# Uses the standalone Next.js output for the smallest possible image.
# Enable output: 'standalone' in next.config.ts (see note below).
# =============================================================================
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextuser

# Copy Next.js standalone build + static assets
COPY --from=builder --chown=nextuser:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextuser:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextuser:nodejs /app/public ./public

USER nextuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# next.config.ts must have output: 'standalone' for server.js to exist
CMD ["node", "server.js"]
