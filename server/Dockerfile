# =============================================================================
# Stage 1 — Dependencies (includes devDependencies for TypeScript compilation)
# =============================================================================
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# =============================================================================
# Stage 2 — Builder (Compile TypeScript and resolve path aliases)
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# =============================================================================
# Stage 3 — Production Dependencies (omits all devDependencies for lean image)
# =============================================================================
FROM node:20-slim AS prod-deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# =============================================================================
# Stage 4 — Production Runner
# =============================================================================
FROM node:20-slim AS runner

# Install FFmpeg and ffprobe runtime binaries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security (principle of least privilege)
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodeuser

# Create upload and transcode temporary directories with appropriate permissions
RUN mkdir -p /tmp/video-uploads /tmp/hls-transcodes && \
    chown -R nodeuser:nodejs /tmp/video-uploads /tmp/hls-transcodes && \
    chmod 1777 /tmp/video-uploads /tmp/hls-transcodes

# Copy compiled JavaScript output
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist

# Copy only production node_modules
COPY --from=prod-deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy package.json so Node can resolve package information & scripts
COPY --chown=nodeuser:nodejs package.json ./

USER nodeuser

EXPOSE 4000
ENV PORT=4000

# Health-check: check the /health endpoint every 30 s
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/app.js"]
