FROM node:22-alpine
RUN apk add --no-cache curl unzip bash

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

COPY backend/package.json ./backend/

RUN npm install -g pnpm

RUN pnpm install --frozen-lockfile --filter backend  

COPY backend/ ./backend/

WORKDIR /app/backend

RUN pnpm build

RUN chmod +x docker-entrypoint.sh


EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
