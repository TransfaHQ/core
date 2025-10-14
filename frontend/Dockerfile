# Stage 1: Build stage
FROM node:22-alpine AS builder

# Accept API URL as build argument
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

COPY frontend/package.json ./frontend/

RUN npm install -g pnpm

# Install dependencies
RUN pnpm install  --filter frontend --frozen-lockfile

# Copy source code
COPY frontend ./frontend

WORKDIR /app/frontend

# Build the application
RUN pnpm build

# Stage 2: Production stage with nginx
FROM nginx:alpine AS production

# Copy built assets from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Use entrypoint to generate runtime config
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
