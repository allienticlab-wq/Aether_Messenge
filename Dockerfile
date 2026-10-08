# Multi-stage production build for Aether Messenger on Easypanel / Docker
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies for build
RUN npm install

# Copy source files
COPY . .

# Build production Vite assets
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy compiled frontend assets from builder
COPY --from=builder /app/dist ./dist

# Copy backend server files
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/branding || exit 1

EXPOSE 3000

CMD ["npm", "start"]
