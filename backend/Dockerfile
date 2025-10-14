# Stage 1: Build stage
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache curl unzip bash

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all workspace package.json files (pnpm needs workspace structure)
COPY backend/package.json ./backend/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies for backend workspace only
RUN pnpm install --filter backend --frozen-lockfile

# Copy backend source code
COPY backend/ ./backend/

# Build the application from backend directory
WORKDIR /app/backend
RUN pnpm build

# Stage 2: Production stage
FROM node:22-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache bash curl

WORKDIR /app

# Copy workspace configuration for production install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install pnpm
RUN npm install -g pnpm

# Install only production dependencies for backend workspace
RUN pnpm install --filter backend  --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/backend/ ./backend/

WORKDIR /app/backend

RUN chmod +x docker-entrypoint.sh


# Expose backend port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
