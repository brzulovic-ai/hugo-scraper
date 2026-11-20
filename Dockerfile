# ==========================================
# 1. Build Stage
# ==========================================
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Install build dependencies with Bun (fast, lightweight)
COPY package.json bun.lock* ./
RUN bun install --no-cache

# Copy application source code
COPY . .

# Build Vite frontend and bundled Express server (dist/server.cjs)
RUN bun run build

# ==========================================
# 2. Production Runner Stage
# ==========================================
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and install production-only dependencies
COPY package.json bun.lock* ./
RUN bun install --production --no-cache

# Copy compiled frontend assets & bundled server from builder stage
COPY --from=builder /app/dist ./dist

# Create generated directory for Hugo output volume and non-root user
RUN mkdir -p /app/generated && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Start compiled server with Bun runtime
CMD ["bun", "dist/server.cjs"]
