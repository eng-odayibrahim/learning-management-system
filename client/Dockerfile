# =============================================================================
# Stage 1 — Dependencies
# =============================================================================
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# =============================================================================
# Stage 2 — Builder
# Note: NEXT_PUBLIC_* variables MUST be available at build time because Next.js
# inlines them into the client-side JavaScript bundles during `npm run build`.
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for public client environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WHATSAPP_NUMBER

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# =============================================================================
# Stage 3 — Production Runner
# Uses Next.js standalone output for a minimal production container footprint.
# =============================================================================
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security (principle of least privilege)
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextuser

# Copy Next.js standalone server and static assets with non-root ownership
COPY --from=builder --chown=nextuser:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextuser:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextuser:nodejs /app/public ./public

USER nextuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health-check: test Next.js server responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
