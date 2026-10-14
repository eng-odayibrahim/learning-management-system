# =============================================================================
# Stage 1 — Dependencies
# Install only production + dev deps separately so Docker layer cache is
# maximally effective (deps layer only invalidates when package.json changes).
# =============================================================================
FROM node:20-slim AS deps

WORKDIR /app

# Copy manifests first — leverages Docker layer cache
COPY package.json package-lock.json* ./

# Install all deps (including devDeps needed for the TypeScript build)
RUN npm ci --include=dev

# =============================================================================
# Stage 2 — Builder
# Compile TypeScript to JavaScript.
# =============================================================================
FROM node:20-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# =============================================================================
# Stage 3 — Production runner
#
# WHY node:20-slim AND NOT node:20-alpine?
#   FFmpeg has complex shared-library dependencies (libx264, libfdk-aac, etc.).
#   Alpine uses musl libc which is not binary-compatible with the Debian-built
#   FFmpeg packages. Using Debian slim avoids painful static-build workarounds.
#
# FFmpeg is installed from the Debian "bookworm" (stable) repository.
#   - ffmpeg         — the CLI binary
#   - ffprobe        — companion tool for probing video metadata
# Both binaries end up in /usr/bin/ffmpeg and /usr/bin/ffprobe and are
# automatically on $PATH for the Node process.
# =============================================================================
FROM node:20-slim AS runner

# Install FFmpeg + runtime libraries from apt
# --no-install-recommends keeps the image lean (~200 MB vs ~500 MB with recommends)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

# Copy only production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json so `node` can resolve the package name
COPY package.json ./

# Create the directories that multer and the transcoder will use at runtime.
# These live inside the container — for production, mount a volume here.
RUN mkdir -p /tmp/video-uploads /tmp/hls-transcodes && \
    chmod 1777 /tmp/video-uploads /tmp/hls-transcodes

# Non-root user for security (principle of least privilege)
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodeuser

USER nodeuser

EXPOSE 4000

# Health-check: curl the /health endpoint every 30 s
# The container will be marked "unhealthy" if the server fails 3 times.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/app.js"]
